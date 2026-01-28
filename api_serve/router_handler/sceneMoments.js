const { conMysql } = require('../db/index')

function buildCommentTree(list) {
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
      status = 'approved',
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

    if (status) {
      where.push('sm.status = ?')
      params.push(status)
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

    const formatted = list.map((row) => ({
      ...row,
      liked: row.liked ? true : false,
      favorited: row.favorited ? true : false,
      tag_names: row.tag_names ? String(row.tag_names).split(',') : []
    }))

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
      liked: scene.liked ? true : false,
      favorited: scene.favorited ? true : false,
      tags,
      characters
    })
  } catch (err) {
    next(err)
  }
}

// 创建名场面（默认 pending，等待审核；这里先直接 pending）
exports.create = async (req, res, next) => {
  try {
    const submitterId = req.user?.id
    if (!submitterId) return res.cc(false, '请先登录', 401)

    const {
      media_id,
      title,
      episode,
      time_position,
      image_url,
      quote_text,
      description,
      season,
      part,
      main_character_id,
      is_public = true,
      tag_ids = [],
      character_ids = []
    } = req.body

    const insertSql = `
      INSERT INTO scene_moments
      (media_id, title, episode, time_position, image_url, quote_text, description, season, part, main_character_id, submitter_id, status, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `
    const result = await conMysql(insertSql, [
      media_id,
      title,
      episode || null,
      time_position ?? null,
      image_url,
      quote_text || null,
      description || null,
      season ?? null,
      part || null,
      main_character_id ?? null,
      submitterId,
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

    res.cc(true, '提交成功，等待审核', 200, { id: sceneId })
  } catch (err) {
    next(err)
  }
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


