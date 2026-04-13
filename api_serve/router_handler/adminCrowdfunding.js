const db = require('../db/index')

async function recordAdminLog (req, action_type, description, target_type = null, target_id = null) {
  try {
    const adminId = req.user && req.user.id ? req.user.id : null
    const clientIp = req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      'unknown'
    if (!adminId) return
    await db.conMysql(
      'INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, action_type, target_type, target_id, description, clientIp]
    )
  } catch (e) {}
}

function parsePagination (req) {
  const page = parseInt(req.query.page, 10) || 1
  const pageSize = parseInt(req.query.pageSize, 10) || 20
  const safePage = page < 1 ? 1 : page
  const safePageSize = pageSize < 1 ? 20 : pageSize
  const offset = (safePage - 1) * safePageSize
  return { page: safePage, pageSize: safePageSize, offset }
}

// 项目列表（管理端）
exports.listProjects = async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req)
    const { status, keyword, category } = req.query

    let where = 'WHERE 1=1'
    const params = []
    if (status) {
      where += ' AND p.status = ?'
      params.push(status)
    }
    if (category) {
      where += ' AND p.category = ?'
      params.push(category)
    }
    if (keyword) {
      where += ' AND (p.title LIKE ? OR p.description LIKE ?)'
      const kw = `%${keyword}%`
      params.push(kw, kw)
    }

    const countRes = await db.conMysql(`SELECT COUNT(*) AS total FROM crowdfunding_projects p ${where}`, params)
    const total = countRes[0] ? countRes[0].total : 0

    const sql = `
      SELECT
        p.id,
        p.title,
        p.cover_image,
        p.goal_amount,
        p.current_amount,
        p.backer_count,
        p.start_date,
        p.end_date,
        p.creator_id,
        u.username AS creator_name,
        p.category,
        p.status,
        p.views,
        p.created_at,
        p.updated_at
      FROM crowdfunding_projects p
      LEFT JOIN users u ON u.id = p.creator_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(sql, [...params, pageSize, offset])
    res.cc(true, '获取成功', 200, { list: rows, total, page, pageSize })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}

// 项目详情（管理端）
exports.getProjectDetail = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.cc(false, '缺少项目ID', 400)

    const projectSql = `
      SELECT
        p.*,
        u.username AS creator_name,
        u.avatar_url AS creator_avatar,
        ROUND((p.current_amount / NULLIF(p.goal_amount, 0)) * 100, 2) AS progress_percentage,
        DATEDIFF(p.end_date, NOW()) AS days_remaining
      FROM crowdfunding_projects p
      LEFT JOIN users u ON u.id = p.creator_id
      WHERE p.id = ?
      LIMIT 1
    `
    const projects = await db.conMysql(projectSql, [id])
    if (!projects.length) return res.cc(false, '项目不存在', 404)

    const imagesSql = `
      SELECT id, image_url, sort_order
      FROM crowdfunding_project_images
      WHERE project_id = ?
      ORDER BY sort_order ASC, id ASC
    `
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
    const updatesSql = `
      SELECT id, title, content, is_public, created_at, updated_at
      FROM crowdfunding_updates
      WHERE project_id = ?
      ORDER BY created_at DESC
    `

    const [images, tiers, updates] = await Promise.all([
      db.conMysql(imagesSql, [id]),
      db.conMysql(tiersSql, [id]),
      db.conMysql(updatesSql, [id])
    ])

    res.cc(true, '获取成功', 200, {
      project: projects[0],
      images,
      tiers,
      updates
    })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}

// 审核项目（approve/reject）
exports.reviewProject = async (req, res) => {
  try {
    const { id } = req.params
    const { action, reason } = req.body
    if (!id) return res.cc(false, '缺少项目ID', 400)
    if (!['approve', 'reject'].includes(action)) return res.cc(false, 'action 必须为 approve 或 reject', 400)

    const projects = await db.conMysql('SELECT id, title, status FROM crowdfunding_projects WHERE id = ? LIMIT 1', [id])
    if (!projects.length) return res.cc(false, '项目不存在', 404)

    const cur = projects[0].status
    if (action === 'approve' && !['pending_review', 'draft'].includes(cur)) {
      return res.cc(false, '仅待审核/草稿状态可执行「通过」', 400)
    }
    if (action === 'reject' && ['cancelled', 'rejected'].includes(cur)) {
      return res.cc(false, '项目已取消/下架', 400)
    }

    const newStatus = action === 'approve' ? 'active' : 'cancelled'
    await db.conMysql(
      'UPDATE crowdfunding_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    )

    await recordAdminLog(req, 'review_crowdfunding', `众筹项目审核 ${id} -> ${newStatus}${reason ? `，原因：${reason}` : ''}`, 'crowdfunding_project', id)
    res.cc(true, '审核成功', 200)
  } catch (err) {
    res.cc(false, '审核失败', 500)
  }
}

// 监管：暂停 / 取消（与待审核「通过/驳回」分流）
exports.moderateProject = async (req, res) => {
  try {
    const { id } = req.params
    const { action, reason } = req.body
    if (!id) return res.cc(false, '缺少项目ID', 400)
    if (!['pause', 'cancel'].includes(action)) {
      return res.cc(false, 'action 必须为 pause 或 cancel', 400)
    }

    const projects = await db.conMysql(
      'SELECT id, title, status FROM crowdfunding_projects WHERE id = ? LIMIT 1',
      [id]
    )
    if (!projects.length) return res.cc(false, '项目不存在', 404)

    const cur = projects[0].status
    let newStatus

    if (action === 'pause') {
      if (!['active', 'successful'].includes(cur)) {
        return res.cc(false, '仅众筹中或已成功的项目可暂停', 400)
      }
      newStatus = 'paused'
    } else {
      if (['cancelled', 'rejected', 'failed', 'draft', 'pending_review'].includes(cur)) {
        return res.cc(false, '当前状态不可执行取消', 400)
      }
      const r = reason != null ? String(reason).trim() : ''
      if (!r) return res.cc(false, '请填写取消原因', 400)
      newStatus = 'cancelled'
    }

    await db.conMysql(
      'UPDATE crowdfunding_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    )

    const reasonSuffix = action === 'cancel' && reason ? `，原因：${reason}` : ''
    await recordAdminLog(req, 'moderate_crowdfunding', `众筹监管 ${id} ${action} -> ${newStatus}${reasonSuffix}`, 'crowdfunding_project', id)
    res.cc(true, '操作成功', 200)
  } catch (err) {
    res.cc(false, '操作失败', 500)
  }
}


