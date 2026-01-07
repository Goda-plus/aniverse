const { conMysql } = require('../db/index')

exports.createSubreddit = async (req, res, next) => {
  try {
    const { name, description, category_id, visibility, is_adult } = req.body
    const created_by = req.user.id

    // 1. 校验分类是否存在（使用 genres 表）
    const genreCheckSql = 'SELECT * FROM genres WHERE id = ?'
    const genres = await conMysql(genreCheckSql, [category_id])
    if (genres.length === 0) {
      return res.cc(false, '分类不存在', 400)
    }

    // 2. 检查板块名是否重复
    const checkSql = 'SELECT * FROM subreddits WHERE name = ?'
    const exists = await conMysql(checkSql, [name])
    if (exists.length > 0) {
      return res.cc(false, '板块名称已存在', 409)
    }

    // 3. 校验板块类型
    const validTypes = ['public', 'restricted', 'private']
    if (!validTypes.includes(visibility)) {
      return res.cc(false, '无效的板块类型（public/restricted/private）', 400)
    }

    // 4. 处理成人标记（转换为布尔类型）
    const adultFlag = String(is_adult).toLowerCase() === 'true'

    // 5. 插入板块，使用 genres_id 关联到 genres 表
    const insertSql = `
      INSERT INTO subreddits (name, description, created_by, genres_id, visibility, is_adult)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(insertSql, [
      name,
      description || null,
      created_by,
      category_id,
      visibility,
      adultFlag,
    ])

    if (result.affectedRows !== 1) {
      throw new Error('创建板块失败')
    }

    const subredditId = result.insertId

    // 6. 将创建者添加为板块成员（admin）
    const memberInsertSql = `
      INSERT INTO subreddit_members (user_id, subreddit_id, role)
      VALUES (?, ?, 'admin')
    `
    const memberResult = await conMysql(memberInsertSql, [created_by, subredditId])

    if (memberResult.affectedRows !== 1) {
      throw new Error('创建者添加为板块成员失败')
    }

    res.cc(true, '板块创建成功', 201)
  } catch (error) {
    next(error)
  }
}

exports.getMySubreddits = async (req, res, next) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.cc(false, '用户未登录或身份失效', 401)
    }

    const sql = `
      SELECT s.id, s.name, s.description, s.created_at,
             c.name AS category_name,
             s.visibility,
             s.is_adult
      FROM subreddits s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.created_by = ?
      ORDER BY s.created_at DESC
    `

    const result = await conMysql(sql, [userId])

    res.cc(true, '获取我创建的板块成功', 200, result)
  } catch (error) {
    console.error('获取我创建的板块失败:', error)
    next(error)
  }
}


// 获取全部板块，返回关联分类名称
exports.getAllSubreddits = async (req, res, next) => {
  try {
    // 获取分页参数，设置默认值
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 6
    const offset = (page - 1) * pageSize

    // 查询列表数据的SQL（添加分页限制）
    const listSql = `
      SELECT s.id, s.name, s.description, s.created_at, s.image_url,
        u.username AS created_by,
        c.name AS genres_name
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres c ON s.genres_id = c.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `

    // 查询总数的SQL
    const countSql = `
      SELECT COUNT(*) AS total
      FROM subreddits
    `

    // 执行查询
    const list = await conMysql(listSql, [pageSize, offset])
    const countRes = await conMysql(countSql)
    const total = countRes[0]?.total || 0
    const hasMore = offset + list.length < total

    // 返回结果
    res.cc(true, '获取版块列表成功', 200, {
      list,
      total,
      hasMore,
      page,
      pageSize
    })
  } catch (error) {
    next(error)
  }
}

exports.getSubredditsByCategory = async (req, res, next) => {
  const { category_id } = req.query
  const page = parseInt(req.query.page || 1)
  const pageSize = parseInt(req.query.pageSize || 6)
  const offset = (page - 1) * pageSize

  try {
    const listSql = `
      SELECT s.id, s.name, s.description, s.created_at,
             u.username AS created_by,
             c.name AS category_name,
             u.avatar_url AS category_ava
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.category_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) AS total
      FROM subreddits
      WHERE category_id = ?
    `

    const list = await conMysql(listSql, [category_id, pageSize, offset])
    const countRes = await conMysql(countSql, [category_id])
    const total = countRes[0]?.total || 0
    const hasMore = offset + list.length < total

    res.cc(true, '获取该分类下板块成功', 200, {
      list,
      total,
      hasMore,
      page,
      pageSize
    })
  } catch (error) {
    next(error)
  }
}

exports.searchSubredditsByName = async (req, res, next) => {
  const { keyword } = req.query
  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.pageSize) || 10
  const offset = (page - 1) * pageSize

  try {
    if (!keyword || keyword.trim() === '') {
      return res.cc(false, '搜索关键词不能为空', 400)
    }

    const searchKeyword = `%${keyword.trim()}%`

    // 查询匹配的板块
    const listSql = `
      SELECT s.id, s.name, s.description, s.created_at,
             u.username AS created_by,
             c.name AS category_name
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.name LIKE ? OR s.description LIKE ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `

    // 查询总数量
    const countSql = `
      SELECT COUNT(*) AS total
      FROM subreddits
      WHERE name LIKE ? OR description LIKE ?
    `

    const list = await conMysql(listSql, [
      searchKeyword, searchKeyword,
      pageSize, offset
    ])

    const countRes = await conMysql(countSql, [searchKeyword, searchKeyword])
    const total = countRes[0]?.total || 0
    const hasMore = offset + list.length < total

    res.cc(true, '搜索板块成功', 200, {
      list,
      total,
      hasMore,
      page,
      pageSize,
      keyword: keyword.trim()
    })
  } catch (error) {
    console.error('搜索板块失败:', error)
    next(error)
  }
}

exports.getSubredditDetail = async (req, res, next) => {
  const { id } = req.query
  const {user_id} = req.query
  try {
    if (!id) {
      return res.cc(false, '缺少社区ID参数', 400)
    }

    // 获取社区基本信息
    const subredditSql = `
      SELECT s.id, s.name, s.description, s.created_at,s.image_url,
             u.username AS created_by,
             c.ch_name AS genres_name
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres c ON s.genres_id = c.id
      WHERE s.id = ?
    `
    const result = await conMysql(subredditSql, [id])

    if (!result || result.length === 0) {
      return res.cc(false, '社区不存在', 404)
    }

    const subreddit = result[0]

    // 获取帖子数量
    const postCountSql = 'SELECT COUNT(*) AS post_count FROM posts WHERE subreddit_id = ?'
    const postCountResult = await conMysql(postCountSql, [id])
    const post_count = postCountResult[0].post_count

    // 获取成员数量
    const memberCountSql = 'SELECT COUNT(*) AS member_count FROM subreddit_members WHERE subreddit_id = ?'
    const memberCountResult = await conMysql(memberCountSql, [id])
    const member_count = memberCountResult[0].member_count

    // 判断当前用户是否已加入该社区（仅当已登录）
    let is_joined = false
    if (user_id) {
      const checkJoinSql = `
        SELECT * FROM subreddit_members
        WHERE user_id = ? AND subreddit_id = ?
        LIMIT 1
      `
      const joinResult = await conMysql(checkJoinSql, [user_id, id])
      is_joined = joinResult.length > 0
      
    }

    const detailResult = {
      ...subreddit,
      member_count,
      post_count,
      is_joined,
    }

    res.cc(true, '获取社区详情成功', 200, detailResult)
  } catch (error) {
    console.error('获取社区详情失败:', error)
    res.cc(false, '获取社区详情失败: ' + error.message, 500)
  }
}

