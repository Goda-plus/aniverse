const { conMysql } = require('../db/index')

// 工具函数：解析分页参数
function parsePagination (req) {
  const page = parseInt(req.query.page, 10) || 1
  const pageSize = parseInt(req.query.pageSize, 10) || 10
  const safePage = page < 1 ? 1 : page
  const safePageSize = pageSize < 1 ? 10 : pageSize
  const offset = (safePage - 1) * safePageSize
  return { page: safePage, pageSize: safePageSize, offset }
}

// 工具函数：将前端传来的日期（如 ISO: 2026-01-22T16:00:00.000Z）转换为 MySQL DATETIME 可接受的格式
// MySQL DATETIME 不支持带 T/Z 的 ISO 字符串；这里统一转换为 UTC 的 "YYYY-MM-DD HH:mm:ss"
function toMySQLDateTime (value) {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

// ==================== 项目管理 ====================

// 获取众筹项目列表（支持筛选）
exports.listProjects = async (req, res, next) => {
  try {
    const { status, category, keyword, sort = 'created_at' } = req.query
    const { page, pageSize, offset } = parsePagination(req)

    let where = 'WHERE 1=1'
    const params = []

    // 状态筛选
    if (status) {
      where += ' AND p.status = ?'
      params.push(status)
    }

    // 分类筛选
    if (category) {
      where += ' AND p.category = ?'
      params.push(category)
    }

    // 关键词搜索
    if (keyword) {
      where += ' AND (p.title LIKE ? OR p.description LIKE ?)'
      const keywordPattern = `%${keyword}%`
      params.push(keywordPattern, keywordPattern)
    }

    // 排序
    let orderBy = 'p.created_at DESC'
    switch (sort) {
      case 'popular':
        orderBy = 'p.backer_count DESC'
        break
      case 'ending_soon':
        orderBy = 'p.end_date ASC'
        break
      case 'most_funded':
        orderBy = 'p.current_amount DESC'
        break
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM crowdfunding_projects p
      ${where}
    `
    const [{ total }] = await conMysql(countSql, params)

    const listSql = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.cover_image,
        p.goal_amount,
        p.current_amount,
        p.backer_count,
        p.start_date,
        p.end_date,
        p.creator_id,
        p.category,
        p.status,
        p.views,
        p.created_at,
        u.username as creator_name,
        u.avatar_url as creator_avatar,
        ROUND((p.current_amount / p.goal_amount) * 100, 2) as progress_percentage,
        DATEDIFF(p.end_date, NOW()) as days_remaining
      FROM crowdfunding_projects p
      JOIN users u ON p.creator_id = u.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `

    const rows = await conMysql(listSql, [...params, pageSize, offset])

    res.cc(true, '获取项目列表成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 获取项目详情
exports.getProjectDetail = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.cc(false, '缺少项目ID', 400)
    }

    // 更新浏览量
    await conMysql(
      'UPDATE crowdfunding_projects SET views = views + 1 WHERE id = ?',
      [id]
    )

    // 获取项目基本信息
    const projectSql = `
      SELECT
        p.*,
        u.username as creator_name,
        u.avatar_url as creator_avatar,
        ROUND((p.current_amount / p.goal_amount) * 100, 2) as progress_percentage,
        DATEDIFF(p.end_date, NOW()) as days_remaining
      FROM crowdfunding_projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.id = ?
    `
    const projects = await conMysql(projectSql, [id])
    if (!projects.length) {
      return res.cc(false, '项目不存在', 404)
    }
    const project = projects[0]

    // 获取项目图片
    const imagesSql = `
      SELECT id, image_url, sort_order
      FROM crowdfunding_project_images
      WHERE project_id = ?
      ORDER BY sort_order ASC, id ASC
    `
    const images = await conMysql(imagesSql, [id])

    // 获取支持档位
    const tiersSql = `
      SELECT
        id,
        title,
        description,
        amount,
        max_backers,
        current_backers,
        reward_description,
        estimated_delivery,
        shipping_included,
        sort_order
      FROM crowdfunding_tiers
      WHERE project_id = ?
      ORDER BY sort_order ASC, amount ASC
    `
    const tiers = await conMysql(tiersSql, [id])

    res.cc(true, '获取项目详情成功', 200, {
      project,
      images,
      tiers
    })
  } catch (err) {
    next(err)
  }
}

// 创建众筹项目
exports.createProject = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const {
      title,
      description,
      cover_image,
      goal_amount,
      start_date,
      end_date,
      category,
      risk_description,
      images = [],
      tiers = []
    } = req.body

    // 验证必填字段
    if (!title || !description || !goal_amount || !start_date || !end_date) {
      return res.cc(false, '请填写完整的项目信息', 400)
    }

    if (goal_amount <= 0) {
      return res.cc(false, '目标金额必须大于0', 400)
    }

    const startDateObj = new Date(start_date)
    const endDateObj = new Date(end_date)
    if (Number.isNaN(startDateObj.getTime()) || Number.isNaN(endDateObj.getTime())) {
      return res.cc(false, '开始/结束时间格式不正确', 400)
    }
    if (startDateObj >= endDateObj) {
      return res.cc(false, '开始时间必须早于结束时间', 400)
    }

    const startDateMySQL = toMySQLDateTime(startDateObj)
    const endDateMySQL = toMySQLDateTime(endDateObj)
    if (!startDateMySQL || !endDateMySQL) {
      return res.cc(false, '开始/结束时间格式不正确', 400)
    }

    // 创建项目
    const projectSql = `
      INSERT INTO crowdfunding_projects
        (title, description, cover_image, goal_amount, start_date, end_date, creator_id, category, risk_description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `
    const projectResult = await conMysql(projectSql, [
      title,
      description,
      cover_image || '',
      goal_amount,
      startDateMySQL,
      endDateMySQL,
      user_id,
      category || '',
      risk_description || ''
    ])
    const project_id = projectResult.insertId

    // 添加项目图片
    if (images.length > 0) {
      const imageSql = 'INSERT INTO crowdfunding_project_images (project_id, image_url, sort_order) VALUES ?'
      const imageValues = images.map((url, index) => [project_id, url, index])
      await conMysql(imageSql, [imageValues])
    }

    // 添加支持档位
    if (tiers.length > 0) {
      const tierSql = `
        INSERT INTO crowdfunding_tiers
          (project_id, title, description, amount, max_backers, reward_description, estimated_delivery, shipping_included, sort_order)
        VALUES ?
      `
      const tierValues = tiers.map((tier, index) => [
        project_id,
        tier.title || '',
        tier.description || '',
        tier.amount || 0,
        tier.max_backers || null,
        tier.reward_description || '',
        tier.estimated_delivery || null,
        tier.shipping_included ? 1 : 0,
        index
      ])
      await conMysql(tierSql, [tierValues])
    }

    res.cc(true, '项目创建成功', 200, { project_id })
  } catch (err) {
    next(err)
  }
}

// 更新项目信息
exports.updateProject = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params
    const updates = req.body

    if (!id) {
      return res.cc(false, '缺少项目ID', 400)
    }

    // 验证项目所有权
    const checkSql = 'SELECT id, status FROM crowdfunding_projects WHERE id = ? AND creator_id = ?'
    const projects = await conMysql(checkSql, [id, user_id])
    if (!projects.length) {
      return res.cc(false, '项目不存在或无权限', 404)
    }

    const project = projects[0]
    if (!['draft', 'pending_review'].includes(project.status)) {
      return res.cc(false, '项目状态不允许修改', 400)
    }

    // 构建更新语句
    const allowedFields = [
      'title', 'description', 'cover_image', 'goal_amount',
      'start_date', 'end_date', 'category', 'risk_description'
    ]
    const fields = []
    const params = []

    // 日期字段：兼容前端 ISO 字符串，转换成 MySQL DATETIME
    if (updates.start_date !== undefined) {
      const d = toMySQLDateTime(updates.start_date)
      if (!d) return res.cc(false, '开始时间格式不正确', 400)
      updates.start_date = d
    }
    if (updates.end_date !== undefined) {
      const d = toMySQLDateTime(updates.end_date)
      if (!d) return res.cc(false, '结束时间格式不正确', 400)
      updates.end_date = d
    }
    // 如果同时更新开始/结束时间，做一致性校验
    if (updates.start_date !== undefined && updates.end_date !== undefined) {
      if (new Date(`${updates.start_date}Z`) >= new Date(`${updates.end_date}Z`)) {
        return res.cc(false, '开始时间必须早于结束时间', 400)
      }
    }

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`)
        params.push(updates[field])
      }
    }

    if (fields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id, user_id)

    const sql = `
      UPDATE crowdfunding_projects
      SET ${fields.join(', ')}
      WHERE id = ? AND creator_id = ?
    `
    await conMysql(sql, params)

    res.cc(true, '项目更新成功', 200)
  } catch (err) {
    next(err)
  }
}

// 提交项目审核
exports.submitForReview = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少项目ID', 400)
    }

    // 验证项目所有权和状态
    const checkSql = 'SELECT id, status FROM crowdfunding_projects WHERE id = ? AND creator_id = ?'
    const projects = await conMysql(checkSql, [id, user_id])
    if (!projects.length) {
      return res.cc(false, '项目不存在或无权限', 404)
    }

    if (projects[0].status !== 'draft') {
      return res.cc(false, '项目状态不允许提交审核', 400)
    }

    // 更新状态为待审核
    await conMysql(
      'UPDATE crowdfunding_projects SET status = \'pending_review\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    )

    res.cc(true, '项目已提交审核', 200)
  } catch (err) {
    next(err)
  }
}

// ==================== 档位管理 ====================

// 添加支持档位
exports.addTier = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { project_id, title, description, amount, max_backers, reward_description, estimated_delivery, shipping_included } = req.body

    if (!project_id || !title || !amount) {
      return res.cc(false, '请填写档位基本信息', 400)
    }

    // 验证项目所有权
    const checkSql = 'SELECT id, status FROM crowdfunding_projects WHERE id = ? AND creator_id = ?'
    const projects = await conMysql(checkSql, [project_id, user_id])
    if (!projects.length) {
      return res.cc(false, '项目不存在或无权限', 404)
    }

    if (!['draft', 'pending_review'].includes(projects[0].status)) {
      return res.cc(false, '项目状态不允许添加档位', 400)
    }

    const sql = `
      INSERT INTO crowdfunding_tiers
        (project_id, title, description, amount, max_backers, reward_description, estimated_delivery, shipping_included)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(sql, [
      project_id,
      title,
      description || '',
      amount,
      max_backers || null,
      reward_description || '',
      estimated_delivery || null,
      shipping_included ? 1 : 0
    ])

    res.cc(true, '档位添加成功', 200, { tier_id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 更新档位
exports.updateTier = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params
    const updates = req.body

    if (!id) {
      return res.cc(false, '缺少档位ID', 400)
    }

    // 验证档位所有权
    const checkSql = `
      SELECT t.id, p.creator_id, p.status
      FROM crowdfunding_tiers t
      JOIN crowdfunding_projects p ON t.project_id = p.id
      WHERE t.id = ? AND p.creator_id = ?
    `
    const tiers = await conMysql(checkSql, [id, user_id])
    if (!tiers.length) {
      return res.cc(false, '档位不存在或无权限', 404)
    }

    if (!['draft', 'pending_review'].includes(tiers[0].status)) {
      return res.cc(false, '项目状态不允许修改档位', 400)
    }

    // 构建更新语句
    const allowedFields = [
      'title', 'description', 'amount', 'max_backers',
      'reward_description', 'estimated_delivery', 'shipping_included'
    ]
    const fields = []
    const params = []

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`)
        params.push(updates[field])
      }
    }

    if (fields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)

    const sql = `
      UPDATE crowdfunding_tiers
      SET ${fields.join(', ')}
      WHERE id = ?
    `
    await conMysql(sql, params)

    res.cc(true, '档位更新成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除档位
exports.deleteTier = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少档位ID', 400)
    }

    // 验证档位所有权和是否已有支持者
    const checkSql = `
      SELECT t.id, p.creator_id, p.status, t.current_backers
      FROM crowdfunding_tiers t
      JOIN crowdfunding_projects p ON t.project_id = p.id
      WHERE t.id = ? AND p.creator_id = ?
    `
    const tiers = await conMysql(checkSql, [id, user_id])
    if (!tiers.length) {
      return res.cc(false, '档位不存在或无权限', 404)
    }

    if (!['draft', 'pending_review'].includes(tiers[0].status)) {
      return res.cc(false, '项目状态不允许删除档位', 400)
    }

    if (tiers[0].current_backers > 0) {
      return res.cc(false, '已有支持者的档位不能删除', 400)
    }

    await conMysql('DELETE FROM crowdfunding_tiers WHERE id = ?', [id])

    res.cc(true, '档位删除成功', 200)
  } catch (err) {
    next(err)
  }
}

// ==================== 支持项目 ====================

// 支持项目
exports.backProject = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { project_id, tier_id, quantity = 1, shipping_address } = req.body

    if (!project_id || !tier_id) {
      return res.cc(false, '请选择项目和支持档位', 400)
    }

    // 验证项目状态
    const projectSql = `
      SELECT id, status, end_date, goal_amount, current_amount, backer_count
      FROM crowdfunding_projects
      WHERE id = ?
    `
    const projects = await conMysql(projectSql, [project_id])
    if (!projects.length) {
      return res.cc(false, '项目不存在', 404)
    }

    const project = projects[0]
    if (project.status !== 'active') {
      return res.cc(false, '项目当前不支持', 400)
    }

    if (new Date() > new Date(project.end_date)) {
      return res.cc(false, '项目已结束', 400)
    }

    // 验证档位
    const tierSql = `
      SELECT id, amount, max_backers, current_backers
      FROM crowdfunding_tiers
      WHERE id = ? AND project_id = ?
    `
    const tiers = await conMysql(tierSql, [tier_id, project_id])
    if (!tiers.length) {
      return res.cc(false, '支持档位不存在', 404)
    }

    const tier = tiers[0]

    // 检查是否达到最大支持者数量
    if (tier.max_backers && tier.current_backers + quantity > tier.max_backers) {
      return res.cc(false, '该档位支持者数量已满', 400)
    }

    // 检查用户是否已支持过该项目
    const existingSql = 'SELECT id FROM crowdfunding_backings WHERE user_id = ? AND project_id = ?'
    const existing = await conMysql(existingSql, [user_id, project_id])
    if (existing.length > 0) {
      return res.cc(false, '您已经支持过该项目', 400)
    }

    const total_amount = tier.amount * quantity

    // 创建支持记录
    const backSql = `
      INSERT INTO crowdfunding_backings
        (project_id, user_id, tier_id, amount, quantity, shipping_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(backSql, [
      project_id,
      user_id,
      tier_id,
      total_amount,
      quantity,
      shipping_address ? JSON.stringify(shipping_address) : null
    ])

    // 更新项目和档位统计
    await conMysql(
      'UPDATE crowdfunding_projects SET current_amount = current_amount + ?, backer_count = backer_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [total_amount, quantity, project_id]
    )

    await conMysql(
      'UPDATE crowdfunding_tiers SET current_backers = current_backers + ? WHERE id = ?',
      [quantity, tier_id]
    )

    // 检查项目是否达成目标
    const newAmount = project.current_amount + total_amount
    if (newAmount >= project.goal_amount && project.current_amount < project.goal_amount) {
      // 项目达成目标，标记为成功（这里可以添加更多逻辑）
      await conMysql(
        'UPDATE crowdfunding_projects SET status = \'successful\' WHERE id = ?',
        [project_id]
      )
    }

    res.cc(true, '支持成功', 200, {
      backing_id: result.insertId,
      amount: total_amount
    })
  } catch (err) {
    next(err)
  }
}

// 获取用户的支持记录
exports.getUserBackings = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page, pageSize, offset } = parsePagination(req)

    const countSql = `
      SELECT COUNT(*) AS total
      FROM crowdfunding_backings b
      JOIN crowdfunding_projects p ON b.project_id = p.id
      JOIN crowdfunding_tiers t ON b.tier_id = t.id
      WHERE b.user_id = ?
    `
    const [{ total }] = await conMysql(countSql, [user_id])

    const listSql = `
      SELECT
        b.id,
        b.project_id,
        b.tier_id,
        b.amount,
        b.quantity,
        b.status,
        b.payment_method,
        b.payment_time,
        b.shipping_status,
        b.created_at,
        p.title as project_title,
        p.cover_image as project_image,
        p.status as project_status,
        p.end_date,
        t.title as tier_title,
        t.reward_description
      FROM crowdfunding_backings b
      JOIN crowdfunding_projects p ON b.project_id = p.id
      JOIN crowdfunding_tiers t ON b.tier_id = t.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `

    const rows = await conMysql(listSql, [user_id, pageSize, offset])

    res.cc(true, '获取支持记录成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// ==================== 项目更新 ====================

// 发布项目更新
exports.createUpdate = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { project_id, title, content, is_public = true } = req.body

    if (!project_id || !title || !content) {
      return res.cc(false, '请填写更新标题和内容', 400)
    }

    // 验证项目所有权
    const checkSql = 'SELECT id FROM crowdfunding_projects WHERE id = ? AND creator_id = ?'
    const projects = await conMysql(checkSql, [project_id, user_id])
    if (!projects.length) {
      return res.cc(false, '项目不存在或无权限', 404)
    }

    const sql = `
      INSERT INTO crowdfunding_updates
        (project_id, title, content, is_public)
      VALUES (?, ?, ?, ?)
    `
    const result = await conMysql(sql, [project_id, title, content, is_public])

    res.cc(true, '项目更新发布成功', 200, { update_id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 获取项目更新列表
exports.getProjectUpdates = async (req, res, next) => {
  try {
    const { project_id } = req.params
    const { page, pageSize, offset } = parsePagination(req)

    if (!project_id) {
      return res.cc(false, '缺少项目ID', 400)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM crowdfunding_updates
      WHERE project_id = ? AND is_public = 1
    `
    const [{ total }] = await conMysql(countSql, [project_id])

    const listSql = `
      SELECT id, title, content, is_public, created_at, updated_at
      FROM crowdfunding_updates
      WHERE project_id = ? AND is_public = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const rows = await conMysql(listSql, [project_id, pageSize, offset])

    res.cc(true, '获取项目更新成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// ==================== 评论管理 ====================

// 获取项目评论
exports.getProjectComments = async (req, res, next) => {
  try {
    const { project_id } = req.params
    const { page, pageSize, offset } = parsePagination(req)

    if (!project_id) {
      return res.cc(false, '缺少项目ID', 400)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM crowdfunding_comments
      WHERE project_id = ? AND is_deleted = 0
    `
    const [{ total }] = await conMysql(countSql, [project_id])

    const listSql = `
      SELECT
        c.id,
        c.user_id,
        c.parent_id,
        c.content,
        c.created_at,
        c.updated_at,
        u.username,
        u.avatar_url as avatar
      FROM crowdfunding_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.project_id = ? AND c.is_deleted = 0
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `

    const rows = await conMysql(listSql, [project_id, pageSize, offset])

    res.cc(true, '获取评论成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 添加评论
exports.addComment = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { project_id, content, parent_id } = req.body

    if (!project_id || !content) {
      return res.cc(false, '请填写评论内容', 400)
    }

    // 验证项目存在
    const checkSql = 'SELECT id FROM crowdfunding_projects WHERE id = ?'
    const projects = await conMysql(checkSql, [project_id])
    if (!projects.length) {
      return res.cc(false, '项目不存在', 404)
    }

    // 如果是回复，验证父评论存在
    if (parent_id) {
      const parentSql = 'SELECT id FROM crowdfunding_comments WHERE id = ? AND project_id = ?'
      const parents = await conMysql(parentSql, [parent_id, project_id])
      if (!parents.length) {
        return res.cc(false, '父评论不存在', 404)
      }
    }

    const sql = `
      INSERT INTO crowdfunding_comments
        (project_id, user_id, parent_id, content)
      VALUES (?, ?, ?, ?)
    `
    const result = await conMysql(sql, [
      project_id,
      user_id,
      parent_id || null,
      content
    ])

    res.cc(true, '评论成功', 200, { comment_id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// ==================== 管理功能 ====================

// 获取我创建的项目
exports.getMyProjects = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { status, page, pageSize, offset } = parsePagination(req)

    let where = 'WHERE creator_id = ?'
    const params = [user_id]

    if (status) {
      where += ' AND status = ?'
      params.push(status)
    }

    const countSql = `SELECT COUNT(*) AS total FROM crowdfunding_projects ${where}`
    const [{ total }] = await conMysql(countSql, params)

    const listSql = `
      SELECT
        id,
        title,
        description,
        cover_image,
        goal_amount,
        current_amount,
        backer_count,
        start_date,
        end_date,
        status,
        views,
        created_at,
        ROUND((current_amount / goal_amount) * 100, 2) as progress_percentage
      FROM crowdfunding_projects
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const rows = await conMysql(listSql, [...params, pageSize, offset])

    res.cc(true, '获取我的项目成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 获取项目支持者列表（项目创建者可见）
exports.getProjectBackers = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { project_id } = req.params
    const { page, pageSize, offset } = parsePagination(req)

    if (!project_id) {
      return res.cc(false, '缺少项目ID', 400)
    }

    // 验证项目所有权
    const checkSql = 'SELECT id FROM crowdfunding_projects WHERE id = ? AND creator_id = ?'
    const projects = await conMysql(checkSql, [project_id, user_id])
    if (!projects.length) {
      return res.cc(false, '项目不存在或无权限', 404)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM crowdfunding_backings
      WHERE project_id = ?
    `
    const [{ total }] = await conMysql(countSql, [project_id])

    const listSql = `
      SELECT
        b.id,
        b.user_id,
        b.tier_id,
        b.amount,
        b.quantity,
        b.status,
        b.created_at,
        u.username,
        u.avatar_url as avatar,
        t.title as tier_title
      FROM crowdfunding_backings b
      JOIN users u ON b.user_id = u.id
      JOIN crowdfunding_tiers t ON b.tier_id = t.id
      WHERE b.project_id = ?
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `

    const rows = await conMysql(listSql, [project_id, pageSize, offset])

    res.cc(true, '获取支持者列表成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}
