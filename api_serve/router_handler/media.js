const { conMysql } = require('../db/index')

// 获取媒体列表（支持分页、筛选、排序）
exports.getMediaList = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      format,
      status,
      source,
      season,
      season_year,
      genre_id,
      tag_id,
      search,
      sort = 'popularity', // popularity, average_score, mean_score, created_at
      order = 'DESC' // ASC, DESC
    } = req.query

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    let sql = `
      SELECT 
        m.*,
        GROUP_CONCAT(DISTINCT g.name) as genres,
        GROUP_CONCAT(DISTINCT t.name) as tags
      FROM media m
      LEFT JOIN media_genres mg ON m.id = mg.media_id
      LEFT JOIN genres g ON mg.genre_id = g.id
      LEFT JOIN media_tags mt ON m.id = mt.media_id
      LEFT JOIN tags t ON mt.tag_id = t.id
      WHERE 1=1
    `
    const params = []

    // 筛选条件
    if (format) {
      sql += ' AND m.format = ?'
      params.push(format)
    }
    if (status) {
      sql += ' AND m.status = ?'
      params.push(status)
    }
    if (source) {
      sql += ' AND m.source = ?'
      params.push(source)
    }
    if (season) {
      sql += ' AND m.season = ?'
      params.push(season)
    }
    if (season_year) {
      sql += ' AND m.season_year = ?'
      params.push(season_year)
    }
    if (genre_id) {
      sql += ' AND EXISTS (SELECT 1 FROM media_genres mg2 WHERE mg2.media_id = m.id AND mg2.genre_id = ?)'
      params.push(genre_id)
    }
    if (tag_id) {
      sql += ' AND EXISTS (SELECT 1 FROM media_tags mt2 WHERE mt2.media_id = m.id AND mt2.tag_id = ?)'
      params.push(tag_id)
    }
    if (search) {
      sql += ' AND (m.title_native LIKE ? OR m.title_english LIKE ? OR m.description LIKE ?)'
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    // 分组
    sql += ' GROUP BY m.id'

    // 排序
    const validSorts = ['popularity', 'average_score', 'mean_score', 'created_at']
    const sortField = validSorts.includes(sort) ? sort : 'popularity'
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    sql += ` ORDER BY m.${sortField} ${sortOrder}`

    // 分页
    sql += ' LIMIT ? OFFSET ?'
    params.push(limit, offset)

    // 查询总数
    let countSql = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM media m
      WHERE 1=1
    `
    const countParams = []
    
    if (format) {
      countSql += ' AND m.format = ?'
      countParams.push(format)
    }
    if (status) {
      countSql += ' AND m.status = ?'
      countParams.push(status)
    }
    if (source) {
      countSql += ' AND m.source = ?'
      countParams.push(source)
    }
    if (season) {
      countSql += ' AND m.season = ?'
      countParams.push(season)
    }
    if (season_year) {
      countSql += ' AND m.season_year = ?'
      countParams.push(season_year)
    }
    if (genre_id) {
      countSql += ' AND EXISTS (SELECT 1 FROM media_genres mg2 WHERE mg2.media_id = m.id AND mg2.genre_id = ?)'
      countParams.push(genre_id)
    }
    if (tag_id) {
      countSql += ' AND EXISTS (SELECT 1 FROM media_tags mt2 WHERE mt2.media_id = m.id AND mt2.tag_id = ?)'
      countParams.push(tag_id)
    }
    if (search) {
      countSql += ' AND (m.title_native LIKE ? OR m.title_english LIKE ? OR m.description LIKE ?)'
      const searchPattern = `%${search}%`
      countParams.push(searchPattern, searchPattern, searchPattern)
    }

    const [mediaList, countResult] = await Promise.all([
      conMysql(sql, params),
      conMysql(countSql, countParams)
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    // 处理genres和tags为数组
    const formattedList = mediaList.map(item => ({
      ...item,
      genres: item.genres ? item.genres.split(',') : [],
      tags: item.tags ? item.tags.split(',') : []
    }))

    res.cc(true, '获取媒体列表成功', 200, {
      list: formattedList,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: limit,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1
      }
    })
  } catch (err) {
    next(err)
  }
}

// 获取媒体详情
exports.getMediaDetail = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    // 获取媒体基本信息
    const mediaSql = 'SELECT * FROM media WHERE id = ?'
    const [media] = await conMysql(mediaSql, [mediaId])

    if (!media) {
      return res.cc(false, '媒体不存在', 404)
    }

    // 获取类型
    const genresSql = `
      SELECT g.id, g.name
      FROM genres g
      INNER JOIN media_genres mg ON g.id = mg.genre_id
      WHERE mg.media_id = ?
    `
    const genres = await conMysql(genresSql, [mediaId])

    // 获取标签
    const tagsSql = `
      SELECT t.id, t.name, t.description, t.category
      FROM tags t
      INNER JOIN media_tags mt ON t.id = mt.tag_id
      WHERE mt.media_id = ?
    `
    const tags = await conMysql(tagsSql, [mediaId])

    // 获取同义词
    const synonymsSql = 'SELECT * FROM synonyms WHERE media_id = ?'
    const synonyms = await conMysql(synonymsSql, [mediaId])

    // 获取角色
    const charactersSql = `
      SELECT 
        c.id,
        c.name_native,
        c.name_alternative,
        c.description,
        c.gender,
        c.image_large,
        c.image_medium,
        mc.role,
        va.id as voice_actor_id,
        va.name_native as voice_actor_name,
        va.image_large as voice_actor_image
      FROM characters c
      INNER JOIN media_characters mc ON c.id = mc.character_id
      LEFT JOIN voice_actors va ON mc.voice_actor_id = va.id
      WHERE mc.media_id = ? AND voice_actor_id IS NOT NULL
      ORDER BY 
        CASE mc.role
          WHEN 'MAIN' THEN 1
          WHEN 'SUPPORTING' THEN 2
          WHEN 'BACKGROUND' THEN 3
        END
    `
    const characters = await conMysql(charactersSql, [mediaId])

    // 获取关系
    const relationsSql = `
      SELECT 
        mr.id,
        mr.relation_type,
        m.id as related_media_id,
        m.title_native,
        m.title_english,
        m.format,
        m.cover_image_medium
      FROM media_relations mr
      INNER JOIN media m ON mr.target_media_id = m.id
      WHERE mr.source_media_id = ? 
    `
    const relations = await conMysql(relationsSql, [mediaId])

    // 获取最近的趋势数据
    const trendsSql = `
      SELECT * FROM trends
      WHERE media_id = ?
      ORDER BY date DESC
      LIMIT 30
    `
    const trends = await conMysql(trendsSql, [mediaId])

    // 获取排名
    const rankingsSql = `
      SELECT * FROM rankings
      WHERE media_id = ?
      ORDER BY all_time DESC, year DESC, rank ASC
    `
    const rankings = await conMysql(rankingsSql, [mediaId])

    res.cc(true, '获取媒体详情成功', 200, {
      ...media,
      genres,
      tags,
      synonyms,
      characters,
      relations,
      trends,
      rankings
    })
  } catch (err) {
    next(err)
  }
}

// 创建媒体
exports.createMedia = async (req, res, next) => {
  try {
    const {
      id,
      title_native,
      title_english,
      description,
      format,
      status,
      source,
      start_date,
      end_date,
      season,
      season_year,
      episodes,
      duration,
      chapters,
      volumes,
      hashtag,
      cover_image_extra_large,
      cover_image_large,
      cover_image_medium,
      cover_image_color,
      banner_image,
      average_score,
      mean_score,
      popularity,
      favourites,
      is_boolean,
      country_of_origin
    } = req.body

    if (!id) {
      return res.cc(false, '媒体ID不能为空', 400)
    }

    // 检查ID是否已存在
    const checkSql = 'SELECT id FROM media WHERE id = ?'
    const existing = await conMysql(checkSql, [id])
    if (existing.length > 0) {
      return res.cc(false, '媒体ID已存在', 400)
    }

    const sql = `
      INSERT INTO media (
        id, title_native, title_english, description, format, status, source,
        start_date, end_date, season, season_year, episodes, duration,
        chapters, volumes, hashtag, cover_image_extra_large, cover_image_large,
        cover_image_medium, cover_image_color, banner_image, average_score,
        mean_score, popularity, favourites, is_boolean, country_of_origin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const result = await conMysql(sql, [
      id, title_native, title_english, description, format, status, source,
      start_date || null, end_date || null, season || null, season_year || null,
      episodes || null, duration || null, chapters || null, volumes || null,
      hashtag || null, cover_image_extra_large || null, cover_image_large || null,
      cover_image_medium || null, cover_image_color || null, banner_image || null,
      average_score || null, mean_score || null, popularity || null,
      favourites || null, is_boolean || false, country_of_origin || null
    ])

    if (result.affectedRows !== 1) {
      return res.cc(false, '创建媒体失败', 500)
    }

    res.cc(true, '创建媒体成功', 200, { id })
  } catch (err) {
    next(err)
  }
}

// 更新媒体
exports.updateMedia = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    // 检查媒体是否存在
    const checkSql = 'SELECT id FROM media WHERE id = ?'
    const [existing] = await conMysql(checkSql, [mediaId])
    if (!existing) {
      return res.cc(false, '媒体不存在', 404)
    }

    const updateFields = []
    const updateValues = []

    const allowedFields = [
      'title_native', 'title_english', 'description', 'format', 'status', 'source',
      'start_date', 'end_date', 'season', 'season_year', 'episodes', 'duration',
      'chapters', 'volumes', 'hashtag', 'cover_image_extra_large', 'cover_image_large',
      'cover_image_medium', 'cover_image_color', 'banner_image', 'average_score',
      'mean_score', 'popularity', 'favourites', 'is_boolean', 'country_of_origin'
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

    updateValues.push(mediaId)
    const sql = `UPDATE media SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows !== 1) {
      return res.cc(false, '更新媒体失败', 500)
    }

    res.cc(true, '更新媒体成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除媒体
exports.deleteMedia = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = 'DELETE FROM media WHERE id = ?'
    const result = await conMysql(sql, [mediaId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除媒体失败', 500)
    }

    res.cc(true, '删除媒体成功', 200)
  } catch (err) {
    next(err)
  }
}

// 搜索媒体
exports.searchMedia = async (req, res, next) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query

    if (!keyword) {
      return res.cc(false, '搜索关键词不能为空', 400)
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)
    const searchPattern = `%${keyword}%`

    const sql = `
      SELECT DISTINCT m.*
      FROM media m
      LEFT JOIN synonyms s ON m.id = s.media_id
      WHERE m.title_native LIKE ? 
         OR m.title_english LIKE ?
         OR m.description LIKE ?
         OR s.synonym LIKE ?
      ORDER BY m.popularity DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(DISTINCT m.id) as total
      FROM media m
      LEFT JOIN synonyms s ON m.id = s.media_id
      WHERE m.title_native LIKE ? 
         OR m.title_english LIKE ?
         OR m.description LIKE ?
         OR s.synonym LIKE ?
    `

    const [results, countResult] = await Promise.all([
      conMysql(sql, [searchPattern, searchPattern, searchPattern, searchPattern, limit, offset]),
      conMysql(countSql, [searchPattern, searchPattern, searchPattern, searchPattern])
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / limit)

    res.cc(true, '搜索成功', 200, {
      list: results,
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

// 获取媒体标签
exports.getMediaTags = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = `
      SELECT t.*
      FROM tags t
      INNER JOIN media_tags mt ON t.id = mt.tag_id
      WHERE mt.media_id = ?
    `
    const tags = await conMysql(sql, [mediaId])

    res.cc(true, '获取标签成功', 200, tags)
  } catch (err) {
    next(err)
  }
}

// 添加媒体标签
exports.addMediaTag = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const { tag_id } = req.body

    if (!mediaId || !tag_id) {
      return res.cc(false, '媒体ID和标签ID不能为空', 400)
    }

    // 检查是否已存在
    const checkSql = 'SELECT * FROM media_tags WHERE media_id = ? AND tag_id = ?'
    const existing = await conMysql(checkSql, [mediaId, tag_id])
    if (existing.length > 0) {
      return res.cc(false, '标签已存在', 400)
    }

    const sql = 'INSERT INTO media_tags (media_id, tag_id) VALUES (?, ?)'
    const result = await conMysql(sql, [mediaId, tag_id])

    if (result.affectedRows !== 1) {
      return res.cc(false, '添加标签失败', 500)
    }

    res.cc(true, '添加标签成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除媒体标签
exports.removeMediaTag = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const tagId = parseInt(req.params.tagId)

    if (!mediaId || !tagId) {
      return res.cc(false, '媒体ID和标签ID不能为空', 400)
    }

    const sql = 'DELETE FROM media_tags WHERE media_id = ? AND tag_id = ?'
    const result = await conMysql(sql, [mediaId, tagId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除标签失败', 500)
    }

    res.cc(true, '删除标签成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取媒体类型
exports.getMediaGenres = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = `
      SELECT g.*
      FROM genres g
      INNER JOIN media_genres mg ON g.id = mg.genre_id
      WHERE mg.media_id = ?
    `
    const genres = await conMysql(sql, [mediaId])

    res.cc(true, '获取类型成功', 200, genres)
  } catch (err) {
    next(err)
  }
}

// 添加媒体类型
exports.addMediaGenre = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const { genre_id } = req.body

    if (!mediaId || !genre_id) {
      return res.cc(false, '媒体ID和类型ID不能为空', 400)
    }

    // 检查是否已存在
    const checkSql = 'SELECT * FROM media_genres WHERE media_id = ? AND genre_id = ?'
    const existing = await conMysql(checkSql, [mediaId, genre_id])
    if (existing.length > 0) {
      return res.cc(false, '类型已存在', 400)
    }

    const sql = 'INSERT INTO media_genres (media_id, genre_id) VALUES (?, ?)'
    const result = await conMysql(sql, [mediaId, genre_id])

    if (result.affectedRows !== 1) {
      return res.cc(false, '添加类型失败', 500)
    }

    res.cc(true, '添加类型成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除媒体类型
exports.removeMediaGenre = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const genreId = parseInt(req.params.genreId)

    if (!mediaId || !genreId) {
      return res.cc(false, '媒体ID和类型ID不能为空', 400)
    }

    const sql = 'DELETE FROM media_genres WHERE media_id = ? AND genre_id = ?'
    const result = await conMysql(sql, [mediaId, genreId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除类型失败', 500)
    }

    res.cc(true, '删除类型成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取媒体角色
exports.getMediaCharacters = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = `
      SELECT 
        c.*,
        mc.role,
        mc.voice_actor_id,
        va.name_native as voice_actor_name,
        va.image_large as voice_actor_image
      FROM characters c
      INNER JOIN media_characters mc ON c.id = mc.character_id
      LEFT JOIN voice_actors va ON mc.voice_actor_id = va.id
      WHERE mc.media_id = ?
      ORDER BY 
        CASE mc.role
          WHEN 'MAIN' THEN 1
          WHEN 'SUPPORTING' THEN 2
          WHEN 'BACKGROUND' THEN 3
        END
    `
    const characters = await conMysql(sql, [mediaId])

    res.cc(true, '获取角色成功', 200, characters)
  } catch (err) {
    next(err)
  }
}

// 获取媒体关系
exports.getMediaRelations = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = `
      SELECT 
        mr.id,
        mr.relation_type,
        m.id as related_media_id,
        m.title_native,
        m.title_english,
        m.format,
        m.cover_image_medium
      FROM media_relations mr
      INNER JOIN media m ON mr.target_media_id = m.id
      WHERE mr.source_media_id = ?
    `
    const relations = await conMysql(sql, [mediaId])

    res.cc(true, '获取关系成功', 200, relations)
  } catch (err) {
    next(err)
  }
}

// 添加媒体关系
exports.addMediaRelation = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const { target_media_id, relation_type } = req.body

    if (!mediaId || !target_media_id || !relation_type) {
      return res.cc(false, '参数不完整', 400)
    }

    if (mediaId === target_media_id) {
      return res.cc(false, '不能与自己建立关系', 400)
    }

    // 检查是否已存在
    const checkSql = 'SELECT * FROM media_relations WHERE source_media_id = ? AND target_media_id = ?'
    const existing = await conMysql(checkSql, [mediaId, target_media_id])
    if (existing.length > 0) {
      return res.cc(false, '关系已存在', 400)
    }

    const sql = 'INSERT INTO media_relations (source_media_id, target_media_id, relation_type) VALUES (?, ?, ?)'
    const result = await conMysql(sql, [mediaId, target_media_id, relation_type])

    if (result.affectedRows !== 1) {
      return res.cc(false, '添加关系失败', 500)
    }

    res.cc(true, '添加关系成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取媒体趋势
exports.getMediaTrends = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const { limit = 30 } = req.query

    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = `
      SELECT * FROM trends
      WHERE media_id = ?
      ORDER BY date DESC
      LIMIT ?
    `
    const trends = await conMysql(sql, [mediaId, parseInt(limit)])

    res.cc(true, '获取趋势成功', 200, trends)
  } catch (err) {
    next(err)
  }
}

// 获取媒体排名
exports.getMediaRankings = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = `
      SELECT * FROM rankings
      WHERE media_id = ?
      ORDER BY all_time DESC, year DESC, rank ASC
    `
    const rankings = await conMysql(sql, [mediaId])

    res.cc(true, '获取排名成功', 200, rankings)
  } catch (err) {
    next(err)
  }
}

// 添加媒体角色
exports.addMediaCharacter = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const { character_id, role, voice_actor_id, language } = req.body

    if (!mediaId || !character_id || !role) {
      return res.cc(false, '媒体ID、角色ID和角色类型不能为空', 400)
    }

    // 检查是否已存在（考虑voice_actor_id的唯一性约束）
    const checkSql = 'SELECT * FROM media_characters WHERE media_id = ? AND character_id = ? AND voice_actor_id = ?'
    const existing = await conMysql(checkSql, [mediaId, character_id, voice_actor_id || null])
    if (existing.length > 0) {
      return res.cc(false, '角色关系已存在', 400)
    }

    const sql = 'INSERT INTO media_characters (media_id, character_id, role, voice_actor_id, language) VALUES (?, ?, ?, ?, ?)'
    const result = await conMysql(sql, [mediaId, character_id, role, voice_actor_id || null, language || 'ja'])

    if (result.affectedRows !== 1) {
      return res.cc(false, '添加角色失败', 500)
    }

    res.cc(true, '添加角色成功', 200, { id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 删除媒体角色
exports.removeMediaCharacter = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const characterId = parseInt(req.params.characterId)

    if (!mediaId || !characterId) {
      return res.cc(false, '媒体ID和角色ID不能为空', 400)
    }

    // 如果有voice_actor_id参数，则删除特定关系；否则删除所有该角色的关系
    const { voice_actor_id } = req.query
    let sql, params

    if (voice_actor_id) {
      sql = 'DELETE FROM media_characters WHERE media_id = ? AND character_id = ? AND voice_actor_id = ?'
      params = [mediaId, characterId, voice_actor_id]
    } else {
      sql = 'DELETE FROM media_characters WHERE media_id = ? AND character_id = ?'
      params = [mediaId, characterId]
    }

    const result = await conMysql(sql, params)

    if (result.affectedRows === 0) {
      return res.cc(false, '角色关系不存在', 404)
    }

    res.cc(true, '删除角色成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除媒体关系
exports.removeMediaRelation = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const relationId = parseInt(req.params.relationId)

    if (!mediaId || !relationId) {
      return res.cc(false, '媒体ID和关系ID不能为空', 400)
    }

    const sql = 'DELETE FROM media_relations WHERE id = ? AND source_media_id = ?'
    const result = await conMysql(sql, [relationId, mediaId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除关系失败', 500)
    }

    res.cc(true, '删除关系成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取媒体同义词
exports.getMediaSynonyms = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    if (!mediaId) {
      return res.cc(false, '媒体ID无效', 400)
    }

    const sql = 'SELECT * FROM synonyms WHERE media_id = ?'
    const synonyms = await conMysql(sql, [mediaId])

    res.cc(true, '获取同义词成功', 200, synonyms)
  } catch (err) {
    next(err)
  }
}

// 添加媒体同义词
exports.addMediaSynonym = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const { synonym, language_code } = req.body

    if (!mediaId || !synonym) {
      return res.cc(false, '媒体ID和同义词不能为空', 400)
    }

    const sql = 'INSERT INTO synonyms (media_id, synonym, language_code) VALUES (?, ?, ?)'
    const result = await conMysql(sql, [mediaId, synonym, language_code || null])

    if (result.affectedRows !== 1) {
      return res.cc(false, '添加同义词失败', 500)
    }

    res.cc(true, '添加同义词成功', 200, { id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 删除媒体同义词
exports.removeMediaSynonym = async (req, res, next) => {
  try {
    const mediaId = parseInt(req.params.id)
    const synonymId = parseInt(req.params.synonymId)

    if (!mediaId || !synonymId) {
      return res.cc(false, '媒体ID和同义词ID不能为空', 400)
    }

    const sql = 'DELETE FROM synonyms WHERE id = ? AND media_id = ?'
    const result = await conMysql(sql, [synonymId, mediaId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除同义词失败', 500)
    }

    res.cc(true, '删除同义词成功', 200)
  } catch (err) {
    next(err)
  }
}

