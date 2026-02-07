const { conMysql } = require('../db/index')
const moderationService = require('../utils/moderationService')

function buildCommentTree (list) {
  const byId = new Map()
  const roots = []
  list.forEach((c) => {
    byId.set(c.id, { ...c, replies: [] })
  })
  byId.forEach((c) => {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id).replies.push(c)
    } else {
      roots.push(c)
    }
  })
  return roots
}

// 列表：某作品下名场面（默认只返回 approved + public）
exports.listByMedia = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.mediaId)
    if (!mediaId) return res.cc(false, '媒体ID无效', 400)

    const {
      page = 1,
      pageSize = 20,
      moderation_status = 'approved',
      is_public = 'true',
      sort = 'created_at',
      order = 'DESC'
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const validSort = ['created_at', 'likes_count', 'favourites_count', 'comments_count', 'views']
    const sortField = validSort.includes(sort) ? sort : 'created_at'
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    const where = ['sm.media_id = ?']
    const params = [mediaId]

    if (moderation_status) {
      where.push('sm.moderation_status = ?')
      params.push(moderation_status)
    }
    if (String(is_public) === 'true') {
      where.push('sm.is_public = TRUE')
    }

    const userId = req.user?.id || null

    const listSql = `
      SELECT 
        sm.*,
        u.username AS submitter_username,
        u.avatar_url AS submitter_avatar,
        (SELECT GROUP_CONCAT(t.name) 
          FROM scene_moment_tags smt 
          JOIN tags t ON smt.tag_id = t.id 
          WHERE smt.scene_id = sm.id
        ) AS tag_names,
        ${userId ? '(SELECT 1 FROM scene_moment_likes sml WHERE sml.scene_id = sm.id AND sml.user_id = ? LIMIT 1) AS liked,' : 'NULL AS liked,'}
        ${userId ? "(SELECT 1 FROM favorites f WHERE f.target_type = 'scene_moment' AND f.target_id = sm.id AND f.user_id = ? LIMIT 1) AS favorited" : 'NULL AS favorited'}
      FROM scene_moments sm
      LEFT JOIN users u ON sm.submitter_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY sm.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `

    const listParams = [...params]
    if (userId) listParams.splice(0, 0, userId, userId) // liked + favorited 子查询参数
    listParams.push(limit, offset)

    const countSql = `
      SELECT COUNT(*) AS total
      FROM scene_moments sm
      WHERE ${where.join(' AND ')}
    `

    const [list, countResult] = await Promise.all([
      conMysql(listSql, listParams),
      conMysql(countSql, params)
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    const formatted = list.map((row) => {
      // 解析 image_url JSON 数组
      let imageUrls = []
      if (row.image_url) {
        try {
          const parsed = JSON.parse(row.image_url)
          imageUrls = Array.isArray(parsed) ? parsed : [row.image_url]
        } catch (e) {
          // 如果不是 JSON，当作单个 URL 处理（兼容旧数据）
          imageUrls = [row.image_url]
        }
      }
      
      return {
        ...row,
        image_url: imageUrls, // 返回数组格式
        liked: row.liked ? true : false,
        favorited: row.favorited ? true : false,
        tag_names: row.tag_names ? String(row.tag_names).split(',') : []
      }
    })

    res.cc(true, '获取名场面成功', 200, {
      list: formatted,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: limit
      }
    })
  } catch (err) {
    next(err)
  }
}

// 详情：名场面 + 标签 + 角色 + 登录态（liked/favorited）
exports.getDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)
    if (!id) return res.cc(false, '名场面ID无效', 400)

    const userId = req.user?.id || null

    const baseSql = `
      SELECT 
        sm.*,
        u.username AS submitter_username,
        u.avatar_url AS submitter_avatar,
        ${userId ? '(SELECT 1 FROM scene_moment_likes sml WHERE sml.scene_id = sm.id AND sml.user_id = ? LIMIT 1) AS liked,' : 'NULL AS liked,'}
        ${userId ? "(SELECT 1 FROM favorites f WHERE f.target_type = 'scene_moment' AND f.target_id = sm.id AND f.user_id = ? LIMIT 1) AS favorited" : 'NULL AS favorited'}
      FROM scene_moments sm
      LEFT JOIN users u ON sm.submitter_id = u.id
      WHERE sm.id = ?
      LIMIT 1
    `

    const baseParams = []
    if (userId) baseParams.push(userId, userId)
    baseParams.push(id)

    const [scene] = await conMysql(baseSql, baseParams)
    if (!scene) return res.cc(false, '名场面不存在', 404)
    if (!scene.is_public && (!userId || userId !== scene.submitter_id)) {
      return res.cc(false, '该名场面不可见', 403)
    }

    // 解析 image_url JSON 数组
    let imageUrls = []
    if (scene.image_url) {
      try {
        const parsed = JSON.parse(scene.image_url)
        imageUrls = Array.isArray(parsed) ? parsed : [scene.image_url]
      } catch (e) {
        // 如果不是 JSON，当作单个 URL 处理（兼容旧数据）
        imageUrls = [scene.image_url]
      }
    }

    // tags
    const tagsSql = `
      SELECT t.id, t.name, t.description, t.category
      FROM scene_moment_tags smt
      JOIN tags t ON smt.tag_id = t.id
      WHERE smt.scene_id = ?
    `
    const tags = await conMysql(tagsSql, [id])

    // characters
    const charsSql = `
      SELECT c.id, c.name_native, c.image_medium, c.image_large
      FROM scene_moment_characters smc
      JOIN characters c ON smc.character_id = c.id
      WHERE smc.scene_id = ?
    `
    const characters = await conMysql(charsSql, [id])

    // views +1
    await conMysql('UPDATE scene_moments SET views = views + 1 WHERE id = ?', [id])

    res.cc(true, '获取名场面详情成功', 200, {
      ...scene,
      image_url: imageUrls, // 返回数组格式
      liked: scene.liked ? true : false,
      favorited: scene.favorited ? true : false,
      tags,
      characters
    })
  } catch (err) {
    next(err)
  }
}

// 创建名场面（集成自动审核机制）
exports.create = async (req, res, next) => {
  try {
    const submitterId = req.user?.id
    if (!submitterId) return res.cc(false, '请先登录', 401)

    const {
      media_id,
      title,
      episode,
      time_position,
      image_url, // 可能是字符串或数组
      quote_text,
      description,
      season,
      part,
      main_character_id,
      is_public = true,
      tag_ids = [],
      character_ids = []
    } = req.body

    // 处理 image_url：如果是数组，转换为 JSON 字符串；如果是字符串，检查是否为 JSON 数组
    let imageUrlJson = null
    if (image_url) {
      if (Array.isArray(image_url)) {
        // 确保数组不为空且每个元素都是字符串
        if (image_url.length > 0 && image_url.every(url => typeof url === 'string')) {
          imageUrlJson = JSON.stringify(image_url)
        } else {
          return res.cc(false, '图片地址数组格式不正确', 400)
        }
      } else if (typeof image_url === 'string') {
        // 兼容旧格式：如果是单个 URL，转换为数组
        try {
          // 尝试解析 JSON
          const parsed = JSON.parse(image_url)
          if (Array.isArray(parsed)) {
            imageUrlJson = image_url
          } else {
            // 单个 URL，转换为数组
            imageUrlJson = JSON.stringify([image_url])
          }
        } catch (e) {
          // 不是 JSON，当作单个 URL 处理
          imageUrlJson = JSON.stringify([image_url])
        }
      } else {
        return res.cc(false, '图片地址格式不正确', 400)
      }
    } else {
      return res.cc(false, '请至少上传一张图片', 400)
    }

    // 准备内容审核数据
    const contentForModeration = {
      title: title || '',
      quote_text: quote_text || '',
      description: description || '',
      content_text: `${title || ''} ${quote_text || ''} ${description || ''}`.trim(),
      user_id: submitterId,
      submitter_id: submitterId
    }

    // 执行自动审核
    const moderationResult = await moderationService.moderateContent(contentForModeration, 'scene_moment', submitterId)

    // 根据审核结果确定初始状态
    let initialModerationStatus = 'pending'
    let reviewMessage = '提交成功，等待审核'

    if (moderationResult.status === 'approved') {
      initialModerationStatus = 'approved'
      reviewMessage = '发布成功'
    } else if (moderationResult.status === 'rejected') {
      initialModerationStatus = 'rejected'
      reviewMessage = '内容未通过审核'
    }

    const insertSql = `
      INSERT INTO scene_moments
      (media_id, title, episode, time_position, image_url, quote_text, description, season, part, main_character_id, submitter_id, moderation_status, moderation_score, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(insertSql, [
      media_id,
      title,
      episode || null,
      time_position ?? null,
      imageUrlJson,
      quote_text || null,
      description || null,
      season ?? null,
      part || null,
      main_character_id ?? null,
      submitterId,
      initialModerationStatus,
      moderationResult.score,
      is_public ? 1 : 0
    ])

    if (result.affectedRows !== 1) return res.cc(false, '创建失败', 500)
    const sceneId = result.insertId

    // tags relation
    if (Array.isArray(tag_ids) && tag_ids.length) {
      const placeholders = tag_ids.map(() => '(?, ?)').join(', ')
      const params = []
      tag_ids.forEach((tid) => {
        params.push(sceneId, tid)
      })
      await conMysql(`INSERT IGNORE INTO scene_moment_tags (scene_id, tag_id) VALUES ${placeholders}`, params)
    }

    // characters relation
    if (Array.isArray(character_ids) && character_ids.length) {
      const placeholders = character_ids.map(() => '(?, ?)').join(', ')
      const params = []
      character_ids.forEach((cid) => {
        params.push(sceneId, cid)
      })
      await conMysql(`INSERT IGNORE INTO scene_moment_characters (scene_id, character_id) VALUES ${placeholders}`, params)
    }

    // 如果需要人工审核，添加到审核队列
    if (initialModerationStatus === 'pending') {
      await this.addToModerationQueue(sceneId, submitterId, moderationResult)
    }

    // 更新用户审核统计
    await moderationService.updateUserModerationStats(submitterId, moderationResult.status, moderationResult.score)

    res.cc(true, reviewMessage, 200, {
      id: sceneId,
      moderation_status: initialModerationStatus,
      moderation_score: moderationResult.score,
      moderation_result: moderationResult
    })
  } catch (err) {
    next(err)
  }
}

// 添加到审核队列
exports.addToModerationQueue = async (sceneId, userId, moderationResult) => {
  const insertQueueSql = `
    INSERT INTO moderation_queue
    (content_type, content_id, user_id, priority, reason, auto_moderation_score, triggered_rules)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `

  // 根据违规严重程度确定优先级
  let priority = 'normal'
  if (moderationResult.score >= 20) {
    priority = 'high'
  } else if (moderationResult.score >= 10) {
    priority = 'urgent'
  }

  const reason = moderationResult.violations.map(v => v.reason).join('; ')

  await conMysql(insertQueueSql, [
    'scene_moment',
    sceneId,
    userId,
    priority,
    reason || '自动审核标记为待人工审核',
    moderationResult.score,
    JSON.stringify(moderationResult.triggeredRules)
  ])
}

// 点赞/取消点赞
exports.toggleLike = async (req, res, next) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.cc(false, '请先登录', 401)

    const sceneId = parseInt(req.params.id)
    if (!sceneId) return res.cc(false, '名场面ID无效', 400)

    const [exist] = await conMysql(
      'SELECT id FROM scene_moment_likes WHERE scene_id = ? AND user_id = ?',
      [sceneId, userId]
    )

    if (exist) {
      await conMysql('DELETE FROM scene_moment_likes WHERE id = ?', [exist.id])
      await conMysql('UPDATE scene_moments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [sceneId])
      const [row] = await conMysql('SELECT likes_count FROM scene_moments WHERE id = ?', [sceneId])
      return res.cc(true, '取消点赞成功', 200, { liked: false, likes_count: row?.likes_count ?? 0 })
    }

    await conMysql('INSERT INTO scene_moment_likes (scene_id, user_id) VALUES (?, ?)', [sceneId, userId])
    await conMysql('UPDATE scene_moments SET likes_count = likes_count + 1 WHERE id = ?', [sceneId])
    const [row] = await conMysql('SELECT likes_count FROM scene_moments WHERE id = ?', [sceneId])
    res.cc(true, '点赞成功', 200, { liked: true, likes_count: row?.likes_count ?? 0 })
  } catch (err) {
    // 兼容并发下 UNIQUE 约束
    if (String(err?.code) === 'ER_DUP_ENTRY') {
      return res.cc(true, '已点赞', 200, { liked: true })
    }
    next(err)
  }
}

// 评论列表（树形）
exports.listComments = async (req, res, next) => {
  try {
    const sceneId = parseInt(req.params.id)
    if (!sceneId) return res.cc(false, '名场面ID无效', 400)

    const sql = `
      SELECT 
        c.id, c.scene_id, c.user_id, c.parent_id, c.content, c.created_at, c.updated_at,
        u.username, u.avatar_url
      FROM scene_moment_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.scene_id = ? AND c.is_deleted = FALSE
      ORDER BY c.created_at ASC
    `
    const list = await conMysql(sql, [sceneId])
    res.cc(true, '获取评论成功', 200, { list: buildCommentTree(list) })
  } catch (err) {
    next(err)
  }
}

// 发表评论
exports.createComment = async (req, res, next) => {
  try {
    const userId = req.user?.id
    if (!userId) return res.cc(false, '请先登录', 401)

    const sceneId = parseInt(req.params.id)
    if (!sceneId) return res.cc(false, '名场面ID无效', 400)

    const { content, parent_id } = req.body

    // 如果 parent_id 存在，验证其属于同一 scene
    if (parent_id) {
      const [p] = await conMysql('SELECT id FROM scene_moment_comments WHERE id = ? AND scene_id = ? AND is_deleted = FALSE', [parent_id, sceneId])
      if (!p) return res.cc(false, '父评论不存在', 400)
    }

    const result = await conMysql(
      'INSERT INTO scene_moment_comments (scene_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
      [sceneId, userId, parent_id || null, content]
    )

    if (result.affectedRows !== 1) return res.cc(false, '发表评论失败', 500)

    await conMysql('UPDATE scene_moments SET comments_count = comments_count + 1 WHERE id = ?', [sceneId])

    res.cc(true, '评论成功', 200, { id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 上传媒体文件（图片或GIF）
exports.uploadMedia = (req, res) => {
  if (!req.file) {
    return res.cc(false, '没有上传文件', 400)
  }

  // 验证文件类型
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedImageTypes.includes(req.file.mimetype)) {
    return res.cc(false, '不支持的文件格式，仅支持 JPEG、PNG、GIF、WebP', 400)
  }

  // 验证文件大小（图片5MB，GIF 10MB）
  const maxSize = req.file.mimetype === 'image/gif' ? 10 * 1024 * 1024 : 5 * 1024 * 1024
  if (req.file.size > maxSize) {
    const typeName = req.file.mimetype === 'image/gif' ? 'GIF' : '图片'
    const maxSizeText = req.file.mimetype === 'image/gif' ? '10MB' : '5MB'
    return res.cc(false, `${typeName}文件大小不能超过${maxSizeText}`, 400)
  }

  // 返回文件的访问URL
  const url = `http://localhost:3000/uploads/${req.file.filename}`
  const fileType = req.file.mimetype === 'image/gif' ? 'gif' : 'image'

  res.cc(true, '上传成功', 200, {
    url,
    fileType,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size
  })
}

// 搜索名场面
exports.search = async (req, res, next) => {
  try {
    const {
      q = '', // 搜索关键词
      work_name, // 作品名称
      character_name, // 角色名称
      tag_name, // 标签名称
      episode, // 集数
      sort = 'created_at',
      order = 'DESC',
      page = 1,
      pageSize = 20
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const validSort = ['created_at', 'likes_count', 'favourites_count', 'comments_count', 'views']
    const sortField = validSort.includes(sort) ? sort : 'created_at'
    const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // 构建搜索条件
    const where = ['sm.moderation_status = "approved"', 'sm.is_public = TRUE']
    const params = []

    // 全文搜索
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`
      where.push('(sm.title LIKE ? OR sm.quote_text LIKE ? OR sm.description LIKE ?)')
      params.push(searchTerm, searchTerm, searchTerm)
    }

    // 作品名称搜索
    if (work_name && work_name.trim()) {
      where.push('m.title LIKE ? OR m.title_native LIKE ?')
      const workTerm = `%${work_name.trim()}%`
      params.push(workTerm, workTerm)
    }

    // 角色名称搜索
    if (character_name && character_name.trim()) {
      where.push('EXISTS (SELECT 1 FROM scene_moment_characters smc JOIN characters c ON smc.character_id = c.id WHERE smc.scene_id = sm.id AND (c.name_native LIKE ? OR c.name_alternative LIKE ?))')
      const charTerm = `%${character_name.trim()}%`
      params.push(charTerm, charTerm)
    }

    // 标签搜索
    if (tag_name && tag_name.trim()) {
      where.push('EXISTS (SELECT 1 FROM scene_moment_tags smt JOIN tags t ON smt.tag_id = t.id WHERE smt.scene_id = sm.id AND t.name LIKE ?)')
      const tagTerm = `%${tag_name.trim()}%`
      params.push(tagTerm)
    }

    // 集数搜索
    if (episode && episode.trim()) {
      where.push('sm.episode LIKE ?')
      params.push(`%${episode.trim()}%`)
    }

    const userId = req.user?.id || null

    const listSql = `
      SELECT
        sm.*,
        m.title as media_title,
        m.title_native as media_title_native,
        u.username AS submitter_username,
        u.avatar_url AS submitter_avatar,
        (SELECT GROUP_CONCAT(t.name)
          FROM scene_moment_tags smt
          JOIN tags t ON smt.tag_id = t.id
          WHERE smt.scene_id = sm.id
        ) AS tag_names,
        ${userId ? '(SELECT 1 FROM scene_moment_likes sml WHERE sml.scene_id = sm.id AND sml.user_id = ? LIMIT 1) AS liked,' : 'NULL AS liked,'}
        ${userId ? "(SELECT 1 FROM favorites f WHERE f.target_type = 'scene_moment' AND f.target_id = sm.id AND f.user_id = ? LIMIT 1) AS favorited" : 'NULL AS favorited'}
      FROM scene_moments sm
      LEFT JOIN media m ON sm.media_id = m.id
      LEFT JOIN users u ON sm.submitter_id = u.id
      WHERE ${where.join(' AND ')}
      ORDER BY sm.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `

    const listParams = [...params]
    if (userId) listParams.splice(0, 0, userId, userId) // liked + favorited 子查询参数
    listParams.push(limit, offset)

    const countSql = `
      SELECT COUNT(*) AS total
      FROM scene_moments sm
      LEFT JOIN media m ON sm.media_id = m.id
      WHERE ${where.join(' AND ')}
    `

    const [list, countResult] = await Promise.all([
      conMysql(listSql, listParams),
      conMysql(countSql, params)
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    const formatted = list.map((row) => {
      // 解析 image_url JSON 数组
      let imageUrls = []
      if (row.image_url) {
        try {
          const parsed = JSON.parse(row.image_url)
          imageUrls = Array.isArray(parsed) ? parsed : [row.image_url]
        } catch (e) {
          // 如果不是 JSON，当作单个 URL 处理（兼容旧数据）
          imageUrls = [row.image_url]
        }
      }
      
      return {
        ...row,
        image_url: imageUrls, // 返回数组格式
        liked: row.liked ? true : false,
        favorited: row.favorited ? true : false,
        tag_names: row.tag_names ? String(row.tag_names).split(',') : []
      }
    })

    res.cc(true, '搜索成功', 200, {
      list: formatted,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: limit
      },
      search: {
        query: q,
        filters: {
          work_name,
          character_name,
          tag_name,
          episode
        }
      }
    })
  } catch (err) {
    next(err)
  }
}


