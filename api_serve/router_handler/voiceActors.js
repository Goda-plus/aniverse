const { conMysql } = require('../db/index')

// 获取声优列表
exports.getVoiceActorsList = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      gender,
      search
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    let sql = 'SELECT * FROM voice_actors WHERE 1=1'
    const params = []

    if (gender) {
      sql += ' AND gender = ?'
      params.push(gender)
    }
    if (search) {
      sql += ' AND name_native LIKE ?'
      const searchPattern = `%${search}%`
      params.push(searchPattern)
    }

    sql += ' ORDER BY name_native ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const countSql = sql.replace(/SELECT \* FROM/, 'SELECT COUNT(*) as total FROM').split('ORDER BY')[0]
    const countParams = params.slice(0, -2)

    const [voiceActors, countResult] = await Promise.all([
      conMysql(sql, params),
      conMysql(countSql, countParams)
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    res.cc(true, '获取声优列表成功', 200, {
      list: voiceActors,
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

// 获取声优详情
exports.getVoiceActorDetail = async (req, res, next) => {
  try {
    const voiceActorId = parseInt(req.params.id)
    if (!voiceActorId) {
      return res.cc(false, '声优ID无效', 400)
    }

    const sql = 'SELECT * FROM voice_actors WHERE id = ?'
    const [voiceActor] = await conMysql(sql, [voiceActorId])

    if (!voiceActor) {
      return res.cc(false, '声优不存在', 404)
    }

    // 获取声优配音的角色
    const charactersSql = `
      SELECT 
        c.id,
        c.name_native,
        c.name_alternative,
        c.image_medium,
        m.id as media_id,
        m.title_native,
        m.title_english,
        m.format,
        mc.role
      FROM characters c
      INNER JOIN media_characters mc ON c.id = mc.character_id
      INNER JOIN media m ON mc.media_id = m.id
      WHERE mc.voice_actor_id = ?
      ORDER BY m.popularity DESC
    `
    const characters = await conMysql(charactersSql, [voiceActorId])

    res.cc(true, '获取声优详情成功', 200, {
      ...voiceActor,
      characters
    })
  } catch (err) {
    next(err)
  }
}

// 创建声优
exports.createVoiceActor = async (req, res, next) => {
  try {
    const {
      id,
      name_native,
      description,
      gender,
      age,
      date_of_birth,
      date_of_death,
      image_large,
      image_medium
    } = req.body

    if (!id || !name_native) {
      return res.cc(false, '声优ID和名称不能为空', 400)
    }

    // 检查ID是否已存在
    const checkSql = 'SELECT id FROM voice_actors WHERE id = ?'
    const existing = await conMysql(checkSql, [id])
    if (existing.length > 0) {
      return res.cc(false, '声优ID已存在', 400)
    }

    const sql = `
      INSERT INTO voice_actors (
        id, name_native, description, gender, age,
        date_of_birth, date_of_death, image_large, image_medium
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const result = await conMysql(sql, [
      id,
      name_native,
      description || null,
      gender || null,
      age || null,
      date_of_birth || null,
      date_of_death || null,
      image_large || null,
      image_medium || null
    ])

    if (result.affectedRows !== 1) {
      return res.cc(false, '创建声优失败', 500)
    }

    res.cc(true, '创建声优成功', 200, { id })
  } catch (err) {
    next(err)
  }
}

// 更新声优
exports.updateVoiceActor = async (req, res, next) => {
  try {
    const voiceActorId = parseInt(req.params.id)
    if (!voiceActorId) {
      return res.cc(false, '声优ID无效', 400)
    }

    const updateFields = []
    const updateValues = []

    const allowedFields = [
      'name_native', 'description', 'gender', 'age',
      'date_of_birth', 'date_of_death', 'image_large', 'image_medium'
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

    updateValues.push(voiceActorId)
    const sql = `UPDATE voice_actors SET ${updateFields.join(', ')} WHERE id = ?`
    
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows !== 1) {
      return res.cc(false, '更新声优失败', 500)
    }

    res.cc(true, '更新声优成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除声优
exports.deleteVoiceActor = async (req, res, next) => {
  try {
    const voiceActorId = parseInt(req.params.id)
    if (!voiceActorId) {
      return res.cc(false, '声优ID无效', 400)
    }

    const sql = 'DELETE FROM voice_actors WHERE id = ?'
    const result = await conMysql(sql, [voiceActorId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除声优失败', 500)
    }

    res.cc(true, '删除声优成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取声优配音的角色列表
exports.getVoiceActorCharacters = async (req, res, next) => {
  try {
    const voiceActorId = parseInt(req.params.id)
    const { page = 1, pageSize = 20 } = req.query

    if (!voiceActorId) {
      return res.cc(false, '声优ID无效', 400)
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const sql = `
      SELECT 
        c.id,
        c.name_native,
        c.name_alternative,
        c.image_medium,
        m.id as media_id,
        m.title_native,
        m.title_english,
        m.format,
        mc.role
      FROM characters c
      INNER JOIN media_characters mc ON c.id = mc.character_id
      INNER JOIN media m ON mc.media_id = m.id
      WHERE mc.voice_actor_id = ?
      ORDER BY m.popularity DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) as total
      FROM media_characters
      WHERE voice_actor_id = ?
    `

    const [characters, countResult] = await Promise.all([
      conMysql(sql, [voiceActorId, limit, offset]),
      conMysql(countSql, [voiceActorId])
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

