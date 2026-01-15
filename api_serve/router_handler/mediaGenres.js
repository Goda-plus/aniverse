const { conMysql } = require('../db/index')

// 获取所有类型列表
exports.getGenresList = async (req, res, next) => {
  try {
    const { search } = req.query

    let sql = 'SELECT * FROM genres WHERE 1=1'
    const params = []

    if (search) {
      sql += ' AND name LIKE ?'
      params.push(`%${search}%`)
    }

    sql += ' ORDER BY name ASC'

    const genres = await conMysql(sql, params)

    res.cc(true, '获取类型列表成功', 200, genres)
  } catch (err) {
    next(err)
  }
}

// 获取类型详情
exports.getGenreDetail = async (req, res, next) => {
  try {
    const genreId = parseInt(req.params.id)
    if (!genreId) {
      return res.cc(false, '类型ID无效', 400)
    }

    const sql = 'SELECT * FROM genres WHERE id = ?'
    const [genre] = await conMysql(sql, [genreId])

    if (!genre) {
      return res.cc(false, '类型不存在', 404)
    }

    res.cc(true, '获取类型详情成功', 200, genre)
  } catch (err) {
    next(err)
  }
}

// 创建类型
exports.createGenre = async (req, res, next) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.cc(false, '类型名称不能为空', 400)
    }

    // 检查名称是否已存在
    const checkSql = 'SELECT id FROM genres WHERE name = ?'
    const existing = await conMysql(checkSql, [name])
    if (existing.length > 0) {
      return res.cc(false, '类型名称已存在', 400)
    }

    const sql = 'INSERT INTO genres (name) VALUES (?)'
    const result = await conMysql(sql, [name])

    if (result.affectedRows !== 1) {
      return res.cc(false, '创建类型失败', 500)
    }

    res.cc(true, '创建类型成功', 200, { id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 更新类型
exports.updateGenre = async (req, res, next) => {
  try {
    const genreId = parseInt(req.params.id)
    const { name } = req.body

    if (!genreId) {
      return res.cc(false, '类型ID无效', 400)
    }

    if (!name) {
      return res.cc(false, '类型名称不能为空', 400)
    }

    // 检查类型是否存在
    const checkSql = 'SELECT id FROM genres WHERE id = ?'
    const [existing] = await conMysql(checkSql, [genreId])
    if (!existing) {
      return res.cc(false, '类型不存在', 404)
    }

    // 检查新名称是否与其他类型冲突
    const nameCheckSql = 'SELECT id FROM genres WHERE name = ? AND id != ?'
    const nameConflict = await conMysql(nameCheckSql, [name, genreId])
    if (nameConflict.length > 0) {
      return res.cc(false, '类型名称已存在', 400)
    }

    const sql = 'UPDATE genres SET name = ? WHERE id = ?'
    const result = await conMysql(sql, [name, genreId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '更新类型失败', 500)
    }

    res.cc(true, '更新类型成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除类型
exports.deleteGenre = async (req, res, next) => {
  try {
    const genreId = parseInt(req.params.id)
    if (!genreId) {
      return res.cc(false, '类型ID无效', 400)
    }

    const sql = 'DELETE FROM genres WHERE id = ?'
    const result = await conMysql(sql, [genreId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '删除类型失败', 500)
    }

    res.cc(true, '删除类型成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取类型下的媒体列表
exports.getGenreMedia = async (req, res, next) => {
  try {
    const genreId = parseInt(req.params.id)
    const { page = 1, pageSize = 20 } = req.query

    if (!genreId) {
      return res.cc(false, '类型ID无效', 400)
    }

    const offset = (parseInt(page) - 1) * parseInt(pageSize)
    const limit = parseInt(pageSize)

    const sql = `
      SELECT m.*
      FROM media m
      INNER JOIN media_genres mg ON m.id = mg.media_id
      WHERE mg.genre_id = ?
      ORDER BY m.popularity DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) as total
      FROM media m
      INNER JOIN media_genres mg ON m.id = mg.media_id
      WHERE mg.genre_id = ?
    `

    const [mediaList, countResult] = await Promise.all([
      conMysql(sql, [genreId, limit, offset]),
      conMysql(countSql, [genreId])
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

