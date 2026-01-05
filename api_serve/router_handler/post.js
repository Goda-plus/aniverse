const { conMysql } = require('../db/index')

// 创建帖子（支持独立发布或发布到板块）
exports.createPost = async (req, res, next) => {
  try {
    const { title, content_html, content_text, image_url, subreddit_id, subreddit } = req.body
    const user_id = req.user.id

    let subId = null

    // 处理 subreddit_id 或 subreddit 名称
    if (subreddit_id) {
      subId = subreddit_id === null || subreddit_id === '' ? null : subreddit_id
    } else if (subreddit) {
      // 如果传入的是 subreddit 名称，查找对应的 id
      const subCheck = await conMysql('SELECT id FROM subreddits WHERE name = ?', [subreddit])
      if (subCheck.length === 0) {
        return res.cc(false, '所属板块不存在', 400)
      }
      subId = subCheck[0].id
    }

    // 如果指定板块，验证其是否存在
    if (subId) {
      const subCheck = await conMysql('SELECT * FROM subreddits WHERE id = ?', [subId])
      if (subCheck.length === 0) {
        return res.cc(false, '所属板块不存在', 400)
      }
    }

    const sql = `
      INSERT INTO posts (user_id, subreddit_id, title, content_html, content_text, image_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(sql, [
      user_id,
      subId,
      title,
      content_html,
      content_text || null,
      image_url || null
    ])

    if (result.affectedRows !== 1) {
      return res.cc(false, '帖子创建失败', 500)
    }

    res.cc(true, '帖子发布成功', 200)
  } catch (err) {
    next(err)
  }
}

// 查询帖子列表（支持：全部独立帖 or 某板块）
// 修改 getPostsBySubreddit 接口，加分页逻辑


exports.getPostsBySubredditWithUserAndStats = async (req, res) => {
  const subreddit_id = req.query.subreddit_id || null
  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.pageSize) || 10
  const offset = (page - 1) * pageSize

  try {
    let sql = `
      SELECT 
        posts.id AS post_id,
        posts.title,
        posts.content_html,
        posts.content_text,
        posts.image_url,
        posts.created_at,
        posts.updated_at,
        users.id AS user_id,
        users.username,
        users.avatar_url,
        users.bio,
        COUNT(DISTINCT comments.id) AS comment_count,
        COALESCE(SUM(CASE WHEN votes.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS upvotes,
        COALESCE(SUM(CASE WHEN votes.vote_type = 'down' THEN 1 ELSE 0 END), 0) AS downvotes
      FROM posts
      JOIN users ON posts.user_id = users.id
      LEFT JOIN comments ON comments.post_id = posts.id
      LEFT JOIN votes ON votes.post_id = posts.id
    `

    let params = []

    if (subreddit_id) {
      sql += ' WHERE posts.subreddit_id = ? '
      params.push(subreddit_id)
    }

    sql += `
      GROUP BY posts.id, users.id
      ORDER BY posts.created_at DESC
      LIMIT ? OFFSET ?
    `

    params.push(pageSize, offset)

    const result = await conMysql(sql, params)

    // 计算净点赞数
    const postsWithNetVotes = result.map(post => ({
      ...post,
      net_votes: post.upvotes - post.downvotes
    }))

    res.cc(true, '获取帖子成功', 200, postsWithNetVotes)

  } catch (err) {
    console.error(err)
    res.cc(false, '获取帖子失败', 500, null)
  }
}



exports.getAllPostsWithUserAndStats = async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.pageSize) || 10
  const offset = (page - 1) * pageSize

  const sql = `
    SELECT 
      posts.id AS post_id,
      posts.title,
      posts.content_html,
      posts.content_text,
      posts.image_url,
      posts.created_at,
      posts.updated_at,
      users.id AS user_id,
      users.username,
      users.avatar_url,
      users.bio,
      COUNT(DISTINCT comments.id) AS comment_count,
      SUM(CASE WHEN votes.vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
      SUM(CASE WHEN votes.vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
    FROM posts
    JOIN users ON posts.user_id = users.id
    LEFT JOIN comments ON comments.post_id = posts.id
    LEFT JOIN votes ON votes.post_id = posts.id
    GROUP BY posts.id, users.id
    ORDER BY posts.created_at DESC
    LIMIT ? OFFSET ?
  `

  try {
    const result = await conMysql(sql, [pageSize, offset])
    
    // 计算净点赞数
    const postsWithNetVotes = result.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes) || 0
    })) 
    
    res.cc(true, '获取帖子成功', 200, postsWithNetVotes)
  } catch (err) {
    console.error(err)
    res.cc(false, '获取帖子失败', 500, null)
  }
}



exports.getUserPostDetail = async (req, res, next) => {
  try {
    const post_id = parseInt(req.query.post_id)
    const user_id = req.auth?.id || null

    if (!post_id) return res.cc(false, '缺少 post_id 参数', 400)

    // 查询帖子详情 + 用户信息 + 投票统计 + 评论数
    const detailSql = `
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
        COUNT(DISTINCT c.id) AS comment_count,
        SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
        SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN votes v ON v.post_id = p.id
      WHERE p.id = ?
      GROUP BY p.id, u.id
    `
    const [post] = await conMysql(detailSql, [post_id])

    if (!post) return res.cc(false, '帖子不存在', 404)

    // 计算净票数
    post.net_votes = post.upvotes - post.downvotes

    // 查询当前用户是否投票过（如果已登录）
    if (user_id) {
      const voteSql = `
        SELECT vote_type FROM votes 
        WHERE post_id = ? AND user_id = ? 
        LIMIT 1
      `
      const [vote] = await conMysql(voteSql, [post_id, user_id])
      post.voted = !!vote
      post.vote_type = vote?.vote_type || null
    } else {
      post.voted = false
      post.vote_type = null
    }

    // 不返回评论列表，只返回 post
    res.cc(true, '获取帖子详情成功', 200, {
      post
    })

  } catch (err) {
    next(err)
  }
}


exports.getGuestPostDetail = async (req, res, next) => {
  try {
    const post_id = parseInt(req.query.post_id)
    if (!post_id) return res.cc(false, '缺少 post_id 参数', 400)

    // 获取帖子及作者信息
    const postSql = `
      SELECT 
        p.id AS post_id, p.title, p.content_html, p.content_text, p.image_url, p.created_at, p.updated_at,
        u.id AS user_id, u.username, u.avatar_url
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `
    const [post] = await conMysql(postSql, [post_id])
    if (!post) return res.cc(false, '帖子不存在', 404)

    // 获取点赞数
    const voteSql = 'SELECT COUNT(*) AS vote_count FROM votes WHERE post_id = ? AND vote_type = \'up\''
    const [{ vote_count }] = await conMysql(voteSql, [post_id])

    // 获取评论（带用户信息）
    const commentSql = `
      SELECT c.id, c.content, c.created_at, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `
    const comments = await conMysql(commentSql, [post_id])

    res.cc(true, '游客获取帖子详情成功', 200, {
      post,
      vote_count,
      comments
    })
  } catch (err) {
    next(err)
  }
}

// 上传图片
exports.uploadImage = (req, res) => {
  if (!req.file) {
    return res.cc(false, '没有上传文件', 400)
  }
  // 返回图片的访问URL
  const url = `http://localhost:3000/uploads/${req.file.filename}`
  res.cc(true, '上传成功', 200, { url })
}

// 上传视频
exports.uploadVideo = (req, res) => {
  if (!req.file) {
    return res.cc(false, '没有上传文件', 400)
  }
  // 验证文件类型
  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.cc(false, '不支持的视频格式', 400)
  }
  // 返回视频的访问URL
  const url = `http://localhost:3000/uploads/${req.file.filename}`
  res.cc(true, '上传成功', 200, { url })
}

// 删除帖子
exports.deletePost = async (req, res, next) => {
  try {
    const post_id = req.body.post_id || req.query.post_id
    const user_id = req.user.id
    if (!post_id) return res.cc(false, '缺少 post_id', 400)

    // 校验是否本人
    const [post] = await conMysql('SELECT user_id FROM posts WHERE id = ?', [post_id])
    if (!post) return res.cc(false, '帖子不存在', 404)
    if (post.user_id !== user_id) return res.cc(false, '无权删除', 403)

    // 删除帖子（可级联删除评论、投票等）
    await conMysql('DELETE FROM posts WHERE id = ?', [post_id])
    res.cc(true, '删除成功', 200)
  } catch (err) {
    next(err)
  }
}
