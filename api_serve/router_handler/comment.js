const { conMysql } = require('../db/index')

// 创建评论
exports.createComment = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { post_id, content, parent_comment_id } = req.body

    const sql = `
      INSERT INTO comments (post_id, user_id, content, parent_comment_id)
      VALUES (?, ?, ?, ?)
    `
    const result = await conMysql(sql, [post_id, user_id, content, parent_comment_id || null])

    if (result.affectedRows !== 1) {
      return res.cc(false, '评论发布失败', 500)
    }

    res.cc(true, '评论发布成功', 201)
  } catch (err) {
    next(err)
  }
}

// 获取某个帖子的评论列表（按时间倒序）
// /api/comment/list
// req.query: { post_id, parent_id (nullable), page, pageSize }

exports.getCommentsByPostId = async (req, res, next) => {
  try {
    const { post_id, parent_id, page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize
    const isRoot = parent_id === undefined || parent_id === null || parent_id === 'null'
    const sql = `
      SELECT c.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM comments WHERE parent_comment_id = c.id) as reply_count,
        EXISTS(SELECT 1 FROM comments WHERE parent_comment_id = c.id) as has_children
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND 
            ${isRoot ? 'c.parent_comment_id IS NULL' : 'c.parent_comment_id = ?'}
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `
    const params = isRoot
      ? [post_id, +pageSize, +offset]
      : [post_id, parent_id, +pageSize, +offset]

    const result = await conMysql(sql, params)
    res.cc(true, '获取评论成功', 200, result)
  } catch (err) {
    next(err)
  }
}


exports.getRepliesByParentId = async (req, res, next) => {
  const { parent_id, page = 1, pageSize = 5 } = req.query
  if (!parent_id) return res.cc(false, 'parent_id 是必须的', 400)

  const offset = (page - 1) * pageSize

  try {
    const sql = `
      SELECT c.*, u.username, u.avatar_url,
        EXISTS(SELECT 1 FROM comments WHERE parent_comment_id = c.id) AS has_children
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_comment_id = ?
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `
    const result = await conMysql(sql, [parent_id, +pageSize, +offset])
    res.cc(true, '获取子评论成功', 200, result)
  } catch (err) {
    next(err)
  }
}


exports.getTopLevelComments = async (req, res, next) => {
  const { post_id, page = 1, pageSize = 10 } = req.query
  if (!post_id) return res.cc(false, 'post_id 是必须的', 400)

  const offset = (page - 1) * pageSize

  try {
    const sql = `
      SELECT c.*, u.username, u.avatar_url,
        EXISTS(SELECT 1 FROM comments WHERE parent_comment_id = c.id) AS has_children
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.parent_comment_id IS NULL
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `
    const result = await conMysql(sql, [post_id, +pageSize, +offset])
    res.cc(true, '获取父评论成功', 200, result)
  } catch (err) {
    next(err)
  }
}

// 获取评论树（递归构建树形结构）
const buildCommentTree = (parentId, allCommentsMap) => {
  const children = []
  
  // 遍历所有评论，找到parent_comment_id等于parentId的评论
  for (const comment of allCommentsMap.values()) {
    if (comment.parent_comment_id === parentId) {
      const commentNode = {
        ...comment,
        replies: buildCommentTree(comment.id, allCommentsMap),
        has_children: false,
        reply_count: 0
      }
      commentNode.has_children = commentNode.replies.length > 0
      commentNode.reply_count = commentNode.replies.length
      children.push(commentNode)
    }
  }
  
  return children
}

// 获取评论树（一次获取20条顶级评论及其所有子孙评论）
exports.getCommentTree = async (req, res, next) => {
  const { post_id, page = 1, pageSize = 20 } = req.query
  if (!post_id) return res.cc(false, 'post_id 是必须的', 400)

  const offset = (page - 1) * pageSize

  try {
    // 1. 先获取指定页的顶级评论
    const topLevelSql = `
      SELECT c.*, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.parent_comment_id IS NULL
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `
    const topLevelComments = await conMysql(topLevelSql, [post_id, +pageSize, +offset])

    if (topLevelComments.length === 0) {
      return res.cc(true, '获取评论树成功', 200, [])
    }

    // 2. 获取该帖子的所有评论（包括顶级和所有子级）
    const allCommentsSql = `
      SELECT c.*, u.username, u.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `
    const allComments = await conMysql(allCommentsSql, [post_id])

    // 3. 构建评论Map，方便查找
    const allCommentsMap = new Map()
    allComments.forEach(comment => {
      allCommentsMap.set(comment.id, comment)
    })

    // 4. 为每个顶级评论构建完整的子树
    const result = topLevelComments.map(topComment => {
      const commentNode = {
        ...topComment,
        replies: buildCommentTree(topComment.id, allCommentsMap),
        has_children: false,
        reply_count: 0
      }
      commentNode.has_children = commentNode.replies.length > 0
      commentNode.reply_count = commentNode.replies.length
      return commentNode
    })

    res.cc(true, '获取评论树成功', 200, result)
  } catch (err) {
    console.error('获取评论树失败:', err)
    next(err)
  }
}

// 删除评论
exports.deleteComment = async (req, res, next) => {
  try {
    const comment_id = req.body.comment_id || req.query.comment_id
    const user_id = req.user.id
    if (!comment_id) return res.cc(false, '缺少 comment_id', 400)

    // 校验是否本人
    const [comment] = await conMysql('SELECT user_id FROM comments WHERE id = ?', [comment_id])
    if (!comment) return res.cc(false, '评论不存在', 404)
    if (comment.user_id !== user_id) return res.cc(false, '无权删除', 403)

    // 删除评论（可级联删除子评论，或只删除本条）
    await conMysql('DELETE FROM comments WHERE id = ?', [comment_id])
    res.cc(true, '删除成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取当前用户的评论列表（带分页）
exports.getUserComments = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 20 } = req.query
    const offset = (page - 1) * pageSize

    const sql = `
      SELECT 
        c.id,
        c.post_id,
        c.content,
        c.parent_comment_id,
        c.created_at,
        p.title AS post_title,
        p.content_text AS post_content_text,
        u_post.username AS post_author,
        u_post.avatar_url AS post_author_avatar,
        s.name AS subreddit_name,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS post_comment_count
      FROM comments c
      INNER JOIN posts p ON c.post_id = p.id
      INNER JOIN users u_post ON p.user_id = u_post.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE c.user_id = ? AND (p.is_draft IS NULL OR p.is_draft = 0)
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) as total 
      FROM comments c
      INNER JOIN posts p ON c.post_id = p.id
      WHERE c.user_id = ? AND (p.is_draft IS NULL OR p.is_draft = 0)
    `
    
    const [comments, totalResult] = await Promise.all([
      conMysql(sql, [user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取用户评论成功', 200, {
      comments: comments,
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


