const { conMysql } = require('../db/index')
const moderationService = require('../utils/moderationService')

function normalizeTags (input) {
  if (input === undefined) return undefined
  if (input === null) return null
  // 前端可能传 '' / 'null'
  if (typeof input === 'string') {
    const s = input.trim()
    if (!s || s === 'null') return null
    try {
      const parsed = JSON.parse(s)
      if (!Array.isArray(parsed)) return null
      const cleaned = parsed
        .filter(Boolean)
        .map(t => ({
          id: Number(t.id),
          name: String(t.name || '').trim()
        }))
        .filter(t => Number.isFinite(t.id) && t.id > 0 && t.name)
        .slice(0, 5)
      return cleaned.length ? JSON.stringify(cleaned) : null
    } catch (e) {
      return null
    }
  }
  if (Array.isArray(input)) {
    const cleaned = input
      .filter(Boolean)
      .map(t => ({
        id: Number(t.id),
        name: String(t.name || '').trim()
      }))
      .filter(t => Number.isFinite(t.id) && t.id > 0 && t.name)
      .slice(0, 5)
    return cleaned.length ? JSON.stringify(cleaned) : null
  }
  return null
}

// 创建帖子（支持独立发布或发布到板块）
exports.createPost = async (req, res, next) => {
  try {
    const { title, content_html, content_text, image_url, subreddit_id, subreddit, is_draft, tags } = req.body
    const user_id = req.user.id
    const draftStatus = is_draft === 1 ? 1 : 0  // 默认为0（已发布）
    const tagsJson = normalizeTags(tags)

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
      INSERT INTO posts (user_id, subreddit_id, title, content_html, content_text, image_url, is_draft, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(sql, [
      user_id,
      subId,
      title,
      content_html,
      content_text || null,
      image_url || null,
      draftStatus,
      tagsJson
    ])

    if (result.affectedRows !== 1) {
      return res.cc(false, '帖子创建失败', 500)
    }

    const postId = result.insertId

    // 如果是草稿，不进行审核
    if (draftStatus === 1) {
      const message = '草稿保存成功'
      res.cc(true, message, 200, { post_id: postId, is_draft: draftStatus })
      return
    }

    // 对已发布的帖子进行内容审核
    const contentToModerate = {
      id: postId,
      title: title || '',
      content_text: content_text || '',
      content_html: content_html || ''
    }

    const moderationResult = await moderationService.moderateContent(contentToModerate, 'post', user_id)

    // 更新帖子的审核状态
    let moderationStatus = 'approved'
    let moderatedBy = null
    let violationReason = null

    if (moderationResult.status === 'rejected') {
      moderationStatus = 'rejected'
      violationReason = moderationResult.violations.map(v => v.reason).join('; ')
      moderatedBy = 0 // 0表示自动审核
    } else if (moderationResult.status === 'pending') {
      moderationStatus = 'pending'
      // 添加到人工审核队列
      await addToModerationQueue(postId, 'post', user_id, contentToModerate, moderationResult)
    }

    // 更新帖子审核状态
    const updateSql = `
      UPDATE posts
      SET moderation_status = ?, moderation_score = ?, moderated_at = NOW(), moderated_by = ?, violation_reason = ?
      WHERE id = ?
    `
    await conMysql(updateSql, [
      moderationStatus,
      moderationResult.score,
      moderatedBy,
      violationReason,
      postId
    ])

    // 更新用户审核统计
    await moderationService.updateUserModerationStats(user_id, moderationResult.action, moderationResult.score)

    let message = '帖子发布成功'
    if (moderationResult.status === 'rejected') {
      message = '帖子因违反社区准则已被拒绝发布'
    } else if (moderationResult.status === 'pending') {
      message = '帖子已提交，正在等待人工审核'
    }

    res.cc(true, message, 200, {
      post_id: postId,
      is_draft: draftStatus,
      moderation_status: moderationStatus,
      moderation_score: moderationResult.score
    })
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
  const sortType = req.query.sort || 'best' // 支持: best, hot, top, new, rising
  const offset = (page - 1) * pageSize

  const orderByClause = buildOrderByClause(sortType)

  try {
    // 基础查询语句，不带任何 WHERE / GROUP / ORDER / LIMIT
    let sql = `
      SELECT
        posts.id AS post_id,
        posts.title,
        posts.content_html,
        posts.content_text,
        posts.image_url,
        posts.tags,
        posts.heat_score,
        posts.created_at,
        posts.updated_at,
        users.id AS user_id,
        users.username,
        users.avatar_url,
        users.bio,
        COUNT(DISTINCT comments.id) AS comment_count,
        COUNT(DISTINCT CASE WHEN votes.vote_type = 'up' THEN votes.id END) AS upvotes,
        COUNT(DISTINCT CASE WHEN votes.vote_type = 'down' THEN votes.id END) AS downvotes
      FROM posts
      JOIN users ON posts.user_id = users.id
      LEFT JOIN comments ON comments.post_id = posts.id
      LEFT JOIN votes ON votes.post_id = posts.id
    `

    const params = []

    // 如果有 subreddit_id，则按社区筛选
    if (subreddit_id) {
      sql += ' WHERE posts.subreddit_id = ? AND (posts.is_draft IS NULL OR posts.is_draft = 0) AND posts.moderation_status = "approved" '
      params.push(subreddit_id)
    } else {
      sql += ' WHERE (posts.is_draft IS NULL OR posts.is_draft = 0) AND posts.moderation_status = "approved" AND posts.moderation_status = "approved" '
    }

    // 统一追加分组、排序和分页
    sql += `
      GROUP BY posts.id, users.id, posts.tags
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `

    params.push(pageSize, offset)

    const result = await conMysql(sql, params)

    // 计算净点赞数
    const postsWithNetVotes = result.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes) > 0
        ? Number(post.upvotes - post.downvotes) : Number(post.downvotes - post.upvotes) > 0
          ? -Number(post.downvotes - post.upvotes) : 0
    }))

    res.cc(true, '获取帖子成功', 200, postsWithNetVotes)

  } catch (err) {
    console.error('获取帖子失败:', err)
    res.cc(false, err.message, 500, null)
  }
}



// 构建排序SQL的辅助函数
function buildOrderByClause(sortType) {
  switch (sortType) {
    case 'hot':
      // 热门：基于热度评分排序
      return 'posts.heat_score DESC, posts.created_at DESC'
    case 'top':
      // 最热：基于净投票数排序
      return '(COUNT(DISTINCT CASE WHEN votes.vote_type = \'up\' THEN votes.id END) - COUNT(DISTINCT CASE WHEN votes.vote_type = \'down\' THEN votes.id END)) DESC, posts.created_at DESC'
    case 'new':
      // 最新：按创建时间倒序
      return 'posts.created_at DESC'
    case 'rising':
      // 上升：基于最近的互动排序（这里简化为按热度评分和时间结合）
      return 'posts.heat_score DESC, posts.created_at DESC'
    case 'best':
    default:
      // 最佳：默认按热度评分排序
      return 'posts.heat_score DESC, posts.created_at DESC'
  }
}

exports.getAllPostsWithUserAndStats = async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.pageSize) || 10
  const sortType = req.query.sort || 'best' // 支持: best, hot, top, new, rising
  const offset = (page - 1) * pageSize

  const orderByClause = buildOrderByClause(sortType)

  const sql = `
    SELECT
  posts.id AS post_id,
  posts.title,
  posts.content_html,
  posts.content_text,
  posts.image_url,
  posts.tags,
  posts.heat_score,
  posts.created_at,
  posts.updated_at,
  users.id AS user_id,
  users.username,
  users.avatar_url,
  users.bio,
  subreddits.name AS subreddit_name,
  COUNT(DISTINCT comments.id) AS comment_count,
  COUNT(DISTINCT CASE WHEN votes.vote_type = 'up' THEN votes.id END) AS upvotes,
  COUNT(DISTINCT CASE WHEN votes.vote_type = 'down' THEN votes.id END) AS downvotes
FROM posts
JOIN users ON posts.user_id = users.id
LEFT JOIN subreddits ON posts.subreddit_id = subreddits.id
LEFT JOIN comments ON comments.post_id = posts.id
LEFT JOIN votes ON votes.post_id = posts.id
WHERE (posts.is_draft IS NULL OR posts.is_draft = 0) AND posts.moderation_status = "approved"
GROUP BY posts.id, users.id, subreddits.id, posts.tags
ORDER BY ${orderByClause}
    LIMIT ? OFFSET ?
  `

  try {
    const result = await conMysql(sql, [pageSize, offset])

    // 计算净点赞数
    const postsWithNetVotes = result.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes) > 0
        ? Number(post.upvotes - post.downvotes) : Number(post.downvotes - post.upvotes) > 0
          ? -Number(post.downvotes - post.upvotes) : 0
    }))

    res.cc(true, '获取帖子成功', 200, postsWithNetVotes)
  } catch (err) {
    console.error('获取帖子失败:', err)
    res.cc(false, '获取帖子失败', 500, null)
  }
}



exports.getUserPostDetail = async (req, res, next) => {
  try {
    const post_id = parseInt(req.query.post_id)
    const user_id = req.auth?.id || null

    if (!post_id) return res.cc(false, '缺少 post_id 参数', 400)

    // 查询帖子详情 + 用户信息 + 投票统计 + 评论数
    // 如果是作者本人，可以查看草稿；否则只能查看已发布的帖子
    const detailSql = `
      SELECT 
        p.id AS post_id,
        p.title,
        p.content_html,
        p.content_text,
        p.image_url,
        p.tags,
        p.created_at,
        p.updated_at,
        p.is_draft,
        u.id AS user_id,
        u.username,
        u.avatar_url,
        s.name AS subreddit_name,
        COUNT(DISTINCT c.id) AS comment_count,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'up' THEN v.id END) AS upvotes,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'down' THEN v.id END) AS downvotes
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN votes v ON v.post_id = p.id
      WHERE p.id = ? AND (p.user_id = ? OR (p.is_draft IS NULL OR p.is_draft = 0))
      GROUP BY p.id, u.id, s.id, p.tags
    `
    const [post] = await conMysql(detailSql, [post_id, user_id])

    if (!post) return res.cc(false, '帖子不存在', 404)

    // 计算净票数
    post.net_votes = post.upvotes - post.downvotes
    if (post.upvotes || post.downvotes) {
      post.voted = true
    } else {
      post.voted = false
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

    // 获取帖子及作者信息（游客只能查看已发布的帖子）
    const postSql = `
      SELECT 
        p.id AS post_id,
        p.title,
        p.content_html,
        p.content_text,
        p.image_url,
        p.tags,
        p.created_at,
        p.updated_at,
        u.id AS user_id,
        u.username,
        u.avatar_url,
        s.name AS subreddit_name,
        COUNT(DISTINCT c.id) AS comment_count,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'up' THEN v.id END) AS upvotes,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'down' THEN v.id END) AS downvotes
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN votes v ON v.post_id = p.id
      WHERE p.id = ? AND (p.is_draft IS NULL OR p.is_draft = 0)
      GROUP BY p.id, u.id, s.id, p.tags
    `
    const [post] = await conMysql(postSql, [post_id])
    if (!post) return res.cc(false, '帖子不存在', 404)

    // 计算净票数
    post.net_votes = post.upvotes - post.downvotes
    if (post.upvotes || post.downvotes) {
      post.voted = true
    } else {
      post.voted = false
    }

    res.cc(true, '游客获取帖子详情成功', 200, {
      post,
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

// 获取当前用户的帖子（带分页，支持筛选草稿或已发布）
exports.getCurrentUserPosts = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10, is_draft } = req.query
    const offset = (page - 1) * pageSize

    // 构建WHERE条件
    let whereCondition = 'WHERE p.user_id = ?'
    const params = [user_id]

    // 如果指定了is_draft参数，则筛选
    if (is_draft !== undefined) {
      const draftValue = is_draft === '1' || is_draft === 1 ? 1 : 0
      whereCondition += ' AND p.is_draft = ?'
      params.push(draftValue)
    } else {
      // 默认只显示已发布的帖子（包括审核中和被拒绝的）
      whereCondition += ' AND (p.is_draft IS NULL OR p.is_draft = 0)'
    }

    const sql = `
       SELECT 
        p.*,
        u.username,
        u.avatar_url,
        s.name as subreddit_name,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'up') as upvotes,
        (SELECT COUNT(*) FROM votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'down') as downvotes
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      ${whereCondition}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `SELECT COUNT(*) as total FROM posts p ${whereCondition}`
    
    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [...params, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, params)
    ])

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取当前用户帖子成功', 200,{
      posts,
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

// 获取当前用户点赞过的帖子（带分页）
exports.getUpvotedPosts = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize

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
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM votes v_up WHERE v_up.post_id = p.id AND v_up.vote_type = 'up') AS upvotes,
        (SELECT COUNT(*) FROM votes v_down WHERE v_down.post_id = p.id AND v_down.vote_type = 'down') AS downvotes
      FROM votes v
      INNER JOIN posts p ON v.post_id = p.id
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE v.user_id = ? AND v.vote_type = 'up' AND (p.is_draft IS NULL OR p.is_draft = 0)
      GROUP BY p.id, u.id, s.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(DISTINCT v.post_id) as total 
      FROM votes v
      INNER JOIN posts p ON v.post_id = p.id
      WHERE v.user_id = ? AND v.vote_type = 'up' AND (p.is_draft IS NULL OR p.is_draft = 0)
    `
    
    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])

    // 计算净点赞数
    const postsWithNetVotes = posts.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes)
    }))

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取点赞帖子成功', 200, {
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

// 获取当前用户点踩过的帖子（带分页）
exports.getDownvotedPosts = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize

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
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM votes v_up WHERE v_up.post_id = p.id AND v_up.vote_type = 'up') AS upvotes,
        (SELECT COUNT(*) FROM votes v_down WHERE v_down.post_id = p.id AND v_down.vote_type = 'down') AS downvotes
      FROM votes v
      INNER JOIN posts p ON v.post_id = p.id
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE v.user_id = ? AND v.vote_type = 'down' AND (p.is_draft IS NULL OR p.is_draft = 0)
      GROUP BY p.id, u.id, s.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(DISTINCT v.post_id) as total 
      FROM votes v
      INNER JOIN posts p ON v.post_id = p.id
      WHERE v.user_id = ? AND v.vote_type = 'down' AND (p.is_draft IS NULL OR p.is_draft = 0)
    `
    
    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])

    // 计算净点赞数
    const postsWithNetVotes = posts.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes)
    }))

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取点踩帖子成功', 200, {
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

// 获取当前用户评论过的帖子（带分页）
exports.getCommentedPosts = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize

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
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM votes v_up WHERE v_up.post_id = p.id AND v_up.vote_type = 'up') AS upvotes,
        (SELECT COUNT(*) FROM votes v_down WHERE v_down.post_id = p.id AND v_down.vote_type = 'down') AS downvotes
      FROM comments c
      INNER JOIN posts p ON c.post_id = p.id
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE c.user_id = ? AND (p.is_draft IS NULL OR p.is_draft = 0)
      GROUP BY p.id, u.id, s.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(DISTINCT c.post_id) as total 
      FROM comments c
      INNER JOIN posts p ON c.post_id = p.id
      WHERE c.user_id = ? AND (p.is_draft IS NULL OR p.is_draft = 0)
    `
    
    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])

    // 计算净点赞数
    const postsWithNetVotes = posts.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes)
    }))

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取评论帖子成功', 200, {
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

// 更新帖子（用于更新草稿或发布草稿）
exports.updatePost = async (req, res, next) => {
  try {
    const { post_id, title, content_html, content_text, image_url, subreddit_id, is_draft, tags } = req.body
    const user_id = req.user.id

    if (!post_id) return res.cc(false, '缺少 post_id', 400)

    // 校验是否本人
    const [post] = await conMysql('SELECT user_id FROM posts WHERE id = ?', [post_id])
    if (!post) return res.cc(false, '帖子不存在', 404)
    if (post.user_id !== user_id) return res.cc(false, '无权修改', 403)

    // 构建更新字段
    const updateFields = []
    const updateValues = []

    if (title !== undefined) {
      updateFields.push('title = ?')
      updateValues.push(title)
    }
    if (content_html !== undefined) {
      updateFields.push('content_html = ?')
      updateValues.push(content_html)
    }
    if (content_text !== undefined) {
      updateFields.push('content_text = ?')
      updateValues.push(content_text)
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?')
      updateValues.push(image_url || null)
    }
    if (subreddit_id !== undefined) {
      // 如果指定板块，验证其是否存在
      if (subreddit_id) {
        const subCheck = await conMysql('SELECT * FROM subreddits WHERE id = ?', [subreddit_id])
        if (subCheck.length === 0) {
          return res.cc(false, '所属板块不存在', 400)
        }
      }
      updateFields.push('subreddit_id = ?')
      updateValues.push(subreddit_id || null)
    }
    if (is_draft !== undefined) {
      updateFields.push('is_draft = ?')
      updateValues.push(is_draft === 1 ? 1 : 0)
    }
    if (tags !== undefined) {
      updateFields.push('tags = ?')
      updateValues.push(normalizeTags(tags))
    }

    // 更新更新时间
    updateFields.push('updated_at = NOW()')
    updateValues.push(post_id)

    if (updateFields.length === 1) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    const sql = `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows !== 1) {
      return res.cc(false, '更新失败', 500)
    }

    const message = is_draft === 1 ? '草稿保存成功' : is_draft === 0 ? '帖子发布成功' : '更新成功'
    res.cc(true, message, 200)
  } catch (err) {
    next(err)
  }
}

// 获取当前用户的草稿列表（带分页）
exports.getDrafts = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize

    const sql = `
       SELECT 
        p.*,
        u.username,
        u.avatar_url,
        s.name as subreddit_name,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'up') as upvotes,
        (SELECT COUNT(*) FROM votes pv WHERE pv.post_id = p.id AND pv.vote_type = 'down') as downvotes
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE p.user_id = ? AND p.is_draft = 1
      ORDER BY p.updated_at DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = 'SELECT COUNT(*) as total FROM posts WHERE user_id = ? AND is_draft = 1'
    
    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取草稿列表成功', 200, {
      posts,
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

    // 1. 删除帖子的所有投票记录（解决外键约束问题）
    await conMysql('DELETE FROM votes WHERE post_id = ?', [post_id])

    // 2. 删除帖子的所有评论（评论的投票会在删除评论时自动处理）
    // 先获取所有评论ID
    const comments = await conMysql('SELECT id FROM comments WHERE post_id = ?', [post_id])

    // 删除每个评论的投票记录
    for (const comment of comments) {
      await conMysql('DELETE FROM votes WHERE comment_id = ?', [comment.id])
    }

    // 删除所有评论
    await conMysql('DELETE FROM comments WHERE post_id = ?', [post_id])

    // 3. 删除浏览历史记录
    await conMysql('DELETE FROM browse_history WHERE target_type = ? AND target_id = ?', ['post', post_id])

    // 4. 最后删除帖子本身
    await conMysql('DELETE FROM posts WHERE id = ?', [post_id])
    res.cc(true, '删除成功', 200)
  } catch (err) {
    next(err)
  }
}

// 添加内容到人工审核队列
const addToModerationQueue = async (contentId, contentType, userId, content, moderationResult) => {
  const contentText = contentType === 'post'
    ? `${content.title}\n\n${content.content_text}`.substring(0, 500)
    : content.content_text || content.content_html || ''

  const sql = `
    INSERT INTO moderation_queue
    (content_type, content_id, user_id, content_text, content_html, moderation_reason, severity_score, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `

  const reason = moderationResult.violations.map(v => v.reason).join('; ')

  await conMysql(sql, [
    contentType,
    contentId,
    userId,
    contentText,
    content.content_html || null,
    reason,
    moderationResult.score,
    moderationResult.score > 50 ? 'high' : moderationResult.score > 20 ? 'normal' : 'low'
  ])
}
