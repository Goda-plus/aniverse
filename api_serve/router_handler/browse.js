const { conMysql } = require('../db/index')

// 添加或更新浏览记录
exports.addOrUpdateHistory = async (req, res, next) => {
  try {
    const { target_type, target_id } = req.body
    const user_id = req.user.id

    const sql = `
      INSERT INTO browse_history (user_id, target_type, target_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE last_visited_at = CURRENT_TIMESTAMP
    `
    await conMysql(sql, [user_id, target_type, target_id])

    res.cc(true, '记录浏览历史成功', 201)
  } catch (err) {
    next(err)
  }
}

// 获取当前用户的浏览历史记录
exports.getBrowseHistory = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize

    // 获取浏览历史中的帖子（假设 target_type = 'post'）
    const sql = `
      SELECT 
        p.id AS post_id,
        p.title,
        p.content_html,
        p.content_text,
        p.image_url,
        p.created_at,
        p.updated_at,
        u.id AS user_id,
        u.username,
        u.avatar_url,
        u.bio,
        s.name as subreddit_name,
        bh.last_visited_at,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM votes v_up WHERE v_up.post_id = p.id AND v_up.vote_type = 'up') AS upvotes,
        (SELECT COUNT(*) FROM votes v_down WHERE v_down.post_id = p.id AND v_down.vote_type = 'down') AS downvotes,
        (SELECT vote_type FROM votes v_user WHERE v_user.post_id = p.id AND v_user.user_id = ? LIMIT 1) AS user_vote
      FROM browse_history bh
      INNER JOIN posts p ON bh.target_id = p.id AND bh.target_type = 'post'
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE bh.user_id = ?
      GROUP BY p.id, u.id, s.id, bh.last_visited_at
      ORDER BY bh.last_visited_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) as total 
      FROM browse_history
      WHERE user_id = ? AND target_type = 'post'
    `
    
    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [user_id, user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])

    // 计算净点赞数和用户投票状态
    const postsWithNetVotes = posts.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes),
      user_vote: post.user_vote === 'up' ? 1 : post.user_vote === 'down' ? -1 : 0
    }))

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取历史记录成功', 200, {
      posts: postsWithNetVotes,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (err) {
    next(err)
  }
}

// 删除指定浏览记录
exports.deleteHistoryItem = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { target_type, target_id } = req.body

    const sql = `
      DELETE FROM browse_history
      WHERE user_id = ? AND target_type = ? AND target_id = ?
    `
    const result = await conMysql(sql, [user_id, target_type, target_id])

    if (result.affectedRows === 0) {
      return res.cc(false, '未找到对应的浏览记录', 404)
    }

    res.cc(true, '删除浏览记录成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除当前用户所有历史记录
exports.clearAllHistory = async (req, res, next) => {
  try {
    const user_id = req.user.id

    const sql = 'DELETE FROM browse_history WHERE user_id = ?'
    await conMysql(sql, [user_id])

    res.cc(true, '已清空所有浏览历史', 200)
  } catch (err) {
    next(err)
  }
}
