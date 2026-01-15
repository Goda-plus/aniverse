const { conMysql } = require('../db/index')

// 获取标签列表
exports.getTagsList = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      category,
      search,
      is_adult
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    let sql = 'SELECT * FROM tags WHERE 1=1'
    const params = []

    if (category) {
      sql += ' AND category = ?'
      params.push(category)
    }
    if (search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern)
    }
    if (is_adult !== undefined) {
      sql += ' AND is_adult = ?'
      params.push(is_adult === 'true' || is_adult === '1' ? 1 : 0)
    }

    sql += ' ORDER BY rank DESC, name ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const countSql = sql.replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0]
    const countParams = params.slice(0, -2)

    const [tags, countResult] = await Promise.all([
      conMysql(sql, params),
      conMysql(countSql, countParams)
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    res.cc(true, '获取标签列表成功', 200, {
      list: tags,
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

// 获取标签详情
exports.getTagDetail = async (req, res, next) => {
  try {
    const tagId = parseInt(req.params.id)
    if (!tagId) {
      return res.cc(false, '标签ID无效', 400)
    }

    const sql = 'SELECT * FROM tags WHERE id = ?'
    const [tag] = await conMysql(sql, [tagId])

    if (!tag) {
      return res.cc(false, '标签不存在', 404)
    }

    res.cc(true, '获取标签详情成功', 200, tag)
  } catch (err) {
    next(err)
  }
}

// 创建标签
exports.createTag = async (req, res, next) => {
  try {
    const {
      id,
      name,
      description,
      category,
      rank,
      is_general_spoiler,
      is_media_spoiler,
      is_adult
    } = req.body

    if (!id || !name) {
      return res.cc(false, '标签ID和名称不能为空', 400)
    }

    // 检查ID是否已存在
    const checkSql = 'SELECT id FROM tags WHERE id = ?'
    const existing = await conMysql(checkSql, [id])
    if (existing.length > 0) {
      return res.cc(false, '标签ID已存在', 400)
    }

    const sql = `
      INSERT INTO tags (id, name, description, category, rank, is_general_spoiler, is_media_spoiler, is_adult)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const result = await conMysql(sql, [
      id,
      name,
      description || null,
      category || null,
      rank || 0,
      is_general_spoiler || false,
      is_media_spoiler || false,
      is_adult || false
    ])

    if (result.affectedRows !== 1) {
      return res.cc(false, '创建标签失败', 500)
    }

    res.cc(true, '创建标签成功', 200, { id })
  } catch (err) {
    next(err)
  }
}

// 更新标签
exports.updateTag = async (req, res, next) => {
  try {
    const tagId = parseInt(req.params.id)
    if (!tagId) {
      return res.cc(false, '标签ID无效', 400)
    }

    const updateFields = []
    const updateValues = []

    const allowedFields = [
      'name', 'description', 'category', 'rank',
      'is_general_spoiler', 'is_media_spoiler', 'is_adult'
    ]

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`)
        updateValues.push(req.body[field])
      }
    })

    if (updateFields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    updateValues.push(tagId)
    const sql = `UPDATE tags SET ${updateFields.join(', ')} WHERE id = ?`
    
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows !== 1) {
      return res.cc(false, '更新标签失败', 500)
    }

    res.cc(true, '更新标签成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除标签
exports.deleteTag = async (req, res, next) => {
  try {
    const tagId = parseInt(req.params.id)
    if (!tagId) {
      return res.cc(false, '标签ID无效', 400)
    }

    const sql = 'DELETE FROM tags WHERE id = ?'
    const result = await conMysql(sql, [tagId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除标签失败', 500)
    }

    res.cc(true, '删除标签成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取标签下的媒体列表
exports.getTagMedia = async (req, res, next) => {
  try {
    const tagId = parseInt(req.params.id)
    const { page = 1, pageSize = 20 } = req.query

    if (!tagId) {
      return res.cc(false, '标签ID无效', 400)
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const sql = `
      SELECT m.*
      FROM media m
      INNER JOIN media_tags mt ON m.id = mt.media_id
      WHERE mt.tag_id = ?
      ORDER BY m.popularity DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) as total
      FROM media m
      INNER JOIN media_tags mt ON m.id = mt.media_id
      WHERE mt.tag_id = ?
    `

    const [mediaList, countResult] = await Promise.all([
      conMysql(sql, [tagId, limit, offset]),
      conMysql(countSql, [tagId])
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    res.cc(true, '获取媒体列表成功', 200, {
      list: mediaList,
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

