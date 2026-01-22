const { conMysql } = require('../db/index')

// 获取角色列表
exports.getCharactersList = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      gender,
      search
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    let sql = 'SELECT * FROM characters WHERE 1=1'
    const params = []

    if (gender) {
      sql += ' AND gender = ?'
      params.push(gender)
    }
    if (search) {
      sql += ' AND (name_native LIKE ? OR name_alternative LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern)
    }

    sql += ' ORDER BY name_native ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const countSql = sql.replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0]
    const countParams = params.slice(0, -2)

    const [characters, countResult] = await Promise.all([
      conMysql(sql, params),
      conMysql(countSql, countParams)
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    res.cc(true, '获取角色列表成功', 200, {
      list: characters,
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

// 获取角色详情
exports.getCharacterDetail = async (req, res, next) => {
  try {
    const characterId = parseInt(req.params.id)
    if (!characterId) {
      return res.cc(false, '角色ID无效', 400)
    }

    const sql = 'SELECT * FROM characters WHERE id = ?'
    const [character] = await conMysql(sql, [characterId])

    if (!character) {
      return res.cc(false, '角色不存在', 404)
    }

    // 获取角色参与的媒体
    const mediaSql = `
      SELECT 
        m.id,
        m.title_native,
        m.title_english,
        m.format,
        m.cover_image_medium,
        mc.role
      FROM media m
      INNER JOIN media_characters mc ON m.id = mc.media_id
      WHERE mc.character_id = ?
      ORDER BY 
        CASE mc.role
          WHEN 'MAIN' THEN 1
          WHEN 'SUPPORTING' THEN 2
          WHEN 'BACKGROUND' THEN 3
        END
    `
    const media = await conMysql(mediaSql, [characterId])

    res.cc(true, '获取角色详情成功', 200, {
      ...character,
      media
    })
  } catch (err) {
    next(err)
  }
}

// 创建角色
exports.createCharacter = async (req, res, next) => {
  try {
    const {
      id,
      name_native,
      name_alternative,
      description,
      gender,
      date_of_birth_year,
      date_of_birth_month,
      date_of_birth_day,
      age,
      blood_type,
      image_large,
      image_medium
    } = req.body

    if (!id || !name_native) {
      return res.cc(false, '角色ID和名称不能为空', 400)
    }

    // 检查ID是否已存在
    const checkSql = 'SELECT id FROM characters WHERE id = ?'
    const existing = await conMysql(checkSql, [id])
    if (existing.length > 0) {
      return res.cc(false, '角色ID已存在', 400)
    }

    const sql = `
      INSERT INTO characters (
        id, name_native, name_alternative, description, gender,
        date_of_birth_year, date_of_birth_month, date_of_birth_day,
        age, blood_type, image_large, image_medium
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const result = await conMysql(sql, [
      id,
      name_native,
      name_alternative ? JSON.stringify(name_alternative) : null,
      description || null,
      gender || null,
      date_of_birth_year || null,
      date_of_birth_month || null,
      date_of_birth_day || null,
      age || null,
      blood_type || null,
      image_large || null,
      image_medium || null
    ])

    if (result.affectedRows !== 1) {
      return res.cc(false, '创建角色失败', 500)
    }

    res.cc(true, '创建角色成功', 200, { id })
  } catch (err) {
    next(err)
  }
}

// 更新角色
exports.updateCharacter = async (req, res, next) => {
  try {
    const characterId = parseInt(req.params.id)
    if (!characterId) {
      return res.cc(false, '角色ID无效', 400)
    }

    const updateFields = []
    const updateValues = []

    const allowedFields = [
      'name_native', 'name_alternative', 'description', 'gender',
      'date_of_birth_year', 'date_of_birth_month', 'date_of_birth_day',
      'age', 'blood_type', 'image_large', 'image_medium'
    ]

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'name_alternative' && typeof req.body[field] === 'object') {
          updateFields.push(`${field} = ?`)
          updateValues.push(JSON.stringify(req.body[field]))
        } else {
          updateFields.push(`${field} = ?`)
          updateValues.push(req.body[field])
        }
      }
    })

    if (updateFields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    updateValues.push(characterId)
    const sql = `UPDATE characters SET ${updateFields.join(', ')} WHERE id = ?`
    
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows !== 1) {
      return res.cc(false, '更新角色失败', 500)
    }

    res.cc(true, '更新角色成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除角色
exports.deleteCharacter = async (req, res, next) => {
  try {
    const characterId = parseInt(req.params.id)
    if (!characterId) {
      return res.cc(false, '角色ID无效', 400)
    }

    const sql = 'DELETE FROM characters WHERE id = ?'
    const result = await conMysql(sql, [characterId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除角色失败', 500)
    }

    res.cc(true, '删除角色成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取角色参与的媒体列表
exports.getCharacterMedia = async (req, res, next) => {
  try {
    const characterId = parseInt(req.params.id)
    const { page = 1, pageSize = 20 } = req.query

    if (!characterId) {
      return res.cc(false, '角色ID无效', 400)
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const sql = `
      SELECT DISTINCT
    m.*,
    mc.role
FROM media m
INNER JOIN media_characters mc ON m.id = mc.media_id
WHERE mc.character_id = ?
ORDER BY 
    CASE mc.role
        WHEN 'MAIN' THEN 1
        WHEN 'SUPPORTING' THEN 2
        WHEN 'BACKGROUND' THEN 3
    END,
    m.popularity DESC
    LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) as total
      FROM media_characters
      WHERE character_id = ?
    `

    const [mediaList, countResult] = await Promise.all([
      conMysql(sql, [characterId, limit, offset]),
      conMysql(countSql, [characterId])
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

