const {conMysql} = require('../db/index') // 你现有的数据库连接模块

// 收藏/取消收藏
exports.toggleFavorite = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { target_type, target_id, genres, tags } = req.body
  
    // 查询是否已经收藏
    const checkSql = 'SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?'
    const [exist] = await conMysql(checkSql, [user_id, target_type, target_id])

    if (exist) {
      // 取消收藏
      const delSql = 'DELETE FROM favorites WHERE id = ?'
      await conMysql(delSql, [exist.id])
      return res.cc(true, '取消收藏成功', 200, { favorited: false })
    } else {
      // 添加收藏，处理 genres 和 tags（如果是数组或对象，转换为 JSON 字符串）
      let genresJson = null
      let tagsJson = null
      
      if (genres !== undefined && genres !== null) {
        genresJson = typeof genres === 'string' ? genres : JSON.stringify(genres)
      }
      
      if (tags !== undefined && tags !== null) {
        tagsJson = typeof tags === 'string' ? tags : JSON.stringify(tags)
      }
      
      const insertSql = 'INSERT INTO favorites (user_id, target_type, target_id, genres, tags) VALUES (?, ?, ?, ?, ?)'
      await conMysql(insertSql, [user_id, target_type, target_id, genresJson, tagsJson])
      return res.cc(true, '收藏成功', 200, { favorited: true })
    }
  } catch (err) {
    next(err)
  }
}

// 检查是否已收藏
exports.checkFavorite = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { target_type, target_id } = req.query
    
    if (!target_type || !target_id) {
      return res.cc(false, '缺少必要参数', 400)
    }
    
    if (!['post', 'subreddit', 'media', 'character', 'scene_moment'].includes(target_type)) {
      return res.cc(false, '无效的 target_type 参数', 400)
    }

    const checkSql = 'SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?'
    const [exist] = await conMysql(checkSql, [user_id, target_type, target_id])
    
    res.cc(true, '查询成功', 200, { favorited: !!exist })
  } catch (err) {
    next(err)
  }
}

// 批量检查收藏状态
exports.checkFavoritesBatch = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { target_type, target_ids } = req.body
    
    if (!target_type || !Array.isArray(target_ids) || target_ids.length === 0) {
      return res.cc(false, '缺少必要参数', 400)
    }
    
    if (!['post', 'subreddit', 'media', 'character', 'scene_moment'].includes(target_type)) {
      return res.cc(false, '无效的 target_type 参数', 400)
    }

    if (target_ids.length === 0) {
      return res.cc(true, '查询成功', 200, { favorited_map: {} })
    }

    const placeholders = target_ids.map(() => '?').join(',')
    const checkSql = `SELECT target_id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})`
    const results = await conMysql(checkSql, [user_id, target_type, ...target_ids])
    
    const favoritedSet = new Set(results.map(r => r.target_id))
    const favorited_map = {}
    target_ids.forEach(id => {
      favorited_map[id] = favoritedSet.has(id)
    })
    
    res.cc(true, '查询成功', 200, { favorited_map })
  } catch (err) {
    next(err)
  }
}

// 获取用户收藏的帖子或板块
exports.getFavorites = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const target_type = req.query.target_type
    if (!['post', 'subreddit', 'media', 'character', 'scene_moment'].includes(target_type)) {
      return res.cc(false, '无效的 target_type 参数', 400)
    }

    let sql, data
    if (target_type === 'post') {
      sql = `
        SELECT 
          p.*,
          f.genres, 
          f.tags, 
          f.created_at as favorited_at,
          u.username as author,
          u.avatar_url as authorAvatar,
          s.name as subreddit,
          s.image_url as subredditIcon,
          COALESCE(SUM(v.vote_type), 0) as score,
          COUNT(DISTINCT c.id) as commentCount,
          uv.vote_type as userVote,
          p.created_at as createdAt,
          p.image_url as image
        FROM favorites f
        JOIN posts p ON f.target_id = p.id
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN subreddits s ON p.subreddit_id = s.id
        LEFT JOIN votes v ON p.id = v.post_id
        LEFT JOIN comments c ON p.id = c.post_id
        LEFT JOIN votes uv ON p.id = uv.post_id AND uv.user_id = ?
        WHERE f.user_id = ? AND f.target_type = 'post'
        GROUP BY p.id, f.genres, f.tags, f.created_at, u.username, u.avatar_url, s.name, s.image_url, uv.vote_type
        ORDER BY f.created_at DESC
      `
    } else if (target_type === 'subreddit') {
      sql = `
        SELECT 
          s.*, 
          f.genres, 
          f.tags, 
          f.created_at as favorited_at,
          COUNT(DISTINCT sm.user_id) as member_count
        FROM favorites f
        JOIN subreddits s ON f.target_id = s.id
        LEFT JOIN subreddit_members sm ON s.id = sm.subreddit_id
        WHERE f.user_id = ? AND f.target_type = 'subreddit'
        GROUP BY s.id, f.genres, f.tags, f.created_at
        ORDER BY f.created_at DESC
      `
    } else if (target_type === 'media') {
      sql = `
        SELECT m.*, f.genres, f.tags, f.created_at as favorited_at
        FROM favorites f
        JOIN media m ON f.target_id = m.id
        WHERE f.user_id = ? AND f.target_type = 'media'
        ORDER BY f.created_at DESC
      `
    } else if (target_type === 'character') {
      sql = `
        SELECT c.*, f.genres, f.tags, f.created_at as favorited_at
        FROM favorites f
        JOIN characters c ON f.target_id = c.id
        WHERE f.user_id = ? AND f.target_type = 'character'
        ORDER BY f.created_at DESC
      `
    } else if (target_type === 'scene_moment') {
      sql = `
        SELECT sm.*, f.genres, f.tags, f.created_at as favorited_at
        FROM favorites f
        JOIN scene_moments sm ON f.target_id = sm.id
        WHERE f.user_id = ? AND f.target_type = 'scene_moment'
        ORDER BY f.created_at DESC
      `
    }

    // 根据不同的 target_type 传递不同的参数
    if (target_type === 'post') {
      data = await conMysql(sql, [user_id, user_id])
    } else {
      data = await conMysql(sql, [user_id])
    }
    
    // 解析 JSON 字段（如果存在）并添加 favorited 标记
    data = data.map(item => {
      if (item.genres) {
        try {
          item.genres = typeof item.genres === 'string' ? JSON.parse(item.genres) : item.genres
        } catch (e) {
          // 如果解析失败，保持原值
        }
      }
      if (item.tags) {
        try {
          item.tags = typeof item.tags === 'string' ? JSON.parse(item.tags) : item.tags
        } catch (e) {
          // 如果解析失败，保持原值
        }
      }
      // 添加 favorited 标记，因为这些都是收藏的项目
      item.favorited = true
      return item
    })
    
    res.cc(true, '获取收藏列表成功', 200, { items: data })
  } catch (err) {
    next(err)
  }
}
