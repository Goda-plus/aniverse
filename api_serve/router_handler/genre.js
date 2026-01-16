const { conMysql } = require('../db/index')

// 获取所有分类（genres）
exports.getAllGenres = async (req, res, next) => {
  try {
    const sql = 'SELECT * FROM genres ORDER BY name ASC'
    const genres = await conMysql(sql)
    res.cc(true, '获取分类列表成功', 200, genres)
  } catch (err) {
    next(err)
  }
}

// 根据分类获取社区列表
exports.getSubredditsByGenre = async (req, res, next) => {
  try {
    const { genre_id, page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize
    const userId = req.user?.id

    if (!genre_id) {
      return res.cc(false, '缺少分类ID参数', 400)
    }

    // 查询该分类下的社区
    const listSql = `
      SELECT s.id, s.name, s.description, s.created_at,s.image_url,
             u.username AS created_by,
             g.name AS genre_name,
             COUNT(DISTINCT sm.user_id) AS member_count,
             COUNT(DISTINCT p.id) AS post_count
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres g ON s.genres_id = g.id
      LEFT JOIN subreddit_members sm ON s.id = sm.subreddit_id
      LEFT JOIN posts p ON s.id = p.subreddit_id
      WHERE s.genres_id = ?
      GROUP BY s.id
      ORDER BY member_count DESC, s.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) AS total
      FROM subreddits
      WHERE genres_id = ?
    `

    const list = await conMysql(listSql, [genre_id, Number(pageSize), offset])
    const countRes = await conMysql(countSql, [genre_id])
    const total = countRes[0]?.total || 0

    // 批量查询用户是否已加入这些社区
    let joinedSubredditIds = []
    if (userId && list.length > 0) {
      const subredditIds = list.map(item => item.id)
      const placeholders = subredditIds.map(() => '?').join(',')
      const checkJoinSql = `
        SELECT subreddit_id 
        FROM subreddit_members 
        WHERE user_id = ? AND subreddit_id IN (${placeholders})
      `
      const joinResult = await conMysql(checkJoinSql, [userId, ...subredditIds])
      joinedSubredditIds = joinResult.map(item => item.subreddit_id)
    }

    // 为每个社区添加 is_joined 字段
    const listWithBoolean = list.map(item => ({
      ...item,
      is_joined: userId ? joinedSubredditIds.includes(item.id) : false
    }))

    res.cc(true, '获取该分类下社区成功', 200, {
      list: listWithBoolean,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      hasMore: offset + list.length < total
    })
  } catch (err) {
    next(err)
  }
}

// 获取推荐社区（基于用户兴趣或热门度）
exports.getRecommendedSubreddits = async (req, res, next) => {
  try {
    const { limit = 6 } = req.query
    const userId = req.user?.id

    // 获取推荐社区（按成员数和帖子数排序）
    const sql = `
      SELECT s.id, s.name, s.description, s.created_at,s.image_url,
             u.username AS created_by,
             g.name AS genre_name,
             COUNT(DISTINCT sm.user_id) AS member_count,
             COUNT(DISTINCT p.id) AS post_count
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres g ON s.genres_id = g.id
      LEFT JOIN subreddit_members sm ON s.id = sm.subreddit_id
      LEFT JOIN posts p ON s.id = p.subreddit_id
      WHERE s.visibility = 'public'
      GROUP BY s.id
      ORDER BY member_count DESC, post_count DESC, s.created_at DESC
      LIMIT ?
    `

    const list = await conMysql(sql, [Number(limit)])

    // 批量查询用户是否已加入这些社区
    let joinedSubredditIds = []
    if (userId && list.length > 0) {
      const subredditIds = list.map(item => item.id)
      const placeholders = subredditIds.map(() => '?').join(',')
      const checkJoinSql = `
        SELECT subreddit_id 
        FROM subreddit_members 
        WHERE user_id = ? AND subreddit_id IN (${placeholders})
      `
      const joinResult = await conMysql(checkJoinSql, [userId, ...subredditIds])
      joinedSubredditIds = joinResult.map(item => item.subreddit_id)
    }

    // 为每个社区添加 is_joined 字段
    const listWithBoolean = list.map(item => ({
      ...item,
      is_joined: userId ? joinedSubredditIds.includes(item.id) : false
    }))

    res.cc(true, '获取推荐社区成功', 200, listWithBoolean)
  } catch (err) {
    next(err)
  }
}

// 获取最受欢迎的社区
exports.getPopularSubreddits = async (req, res, next) => {
  try {
    const { limit = 6 } = req.query
    const userId = req.user?.id

    // 获取最受欢迎的社区（按成员数排序）
    const sql = `
      SELECT s.id, s.name, s.description, s.created_at,s.image_url,
             u.username AS created_by,
             g.name AS genre_name,
             COUNT(DISTINCT sm.user_id) AS member_count,
             COUNT(DISTINCT p.id) AS post_count
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres g ON s.genres_id = g.id
      LEFT JOIN subreddit_members sm ON s.id = sm.subreddit_id
      LEFT JOIN posts p ON s.id = p.subreddit_id
      WHERE s.visibility = 'public'
      GROUP BY s.id
      ORDER BY member_count DESC, s.created_at DESC
      LIMIT ?
    `

    const list = await conMysql(sql, [Number(limit)])

    // 批量查询用户是否已加入这些社区
    let joinedSubredditIds = []
    if (userId && list.length > 0) {
      const subredditIds = list.map(item => item.id)
      const placeholders = subredditIds.map(() => '?').join(',')
      const checkJoinSql = `
        SELECT subreddit_id 
        FROM subreddit_members 
        WHERE user_id = ? AND subreddit_id IN (${placeholders})
      `
      const joinResult = await conMysql(checkJoinSql, [userId, ...subredditIds])
      joinedSubredditIds = joinResult.map(item => item.subreddit_id)
    }

    // 为每个社区添加 is_joined 字段
    const listWithBoolean = list.map(item => ({
      ...item,
      is_joined: userId ? joinedSubredditIds.includes(item.id) : false
    }))

    res.cc(true, '获取最受欢迎社区成功', 200, listWithBoolean)
  } catch (err) {
    next(err)
  }
}

