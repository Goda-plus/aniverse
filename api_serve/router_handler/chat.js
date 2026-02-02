const {conMysql} = require('../db')

exports.history = async (req, res, next) => {
  const { roomId, page = 1, pageSize = 20 } = req.query
  const userId = req.user.id
  const offset = (page - 1) * pageSize
  try {
    // 获取消息数据，过滤掉当前用户设置为不可见的消息
    const rows = await conMysql(
      `SELECT m.id, m.user_id, u.username, m.content, m.content_text, m.created_at
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.room_id = ?
       AND (m.unvisible_user_id IS NULL OR NOT FIND_IN_SET(?, m.unvisible_user_id))
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`, [roomId, userId, +pageSize + 1, +offset] // 多取一条来判断是否有更多数据
    )

    // 获取总数（需要考虑过滤条件）
    const countResult = await conMysql(
      `SELECT COUNT(*) as total FROM messages
       WHERE room_id = ?
       AND (unvisible_user_id IS NULL OR NOT FIND_IN_SET(?, unvisible_user_id))`,
      [roomId, userId]
    )
    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / pageSize)

    // 判断是否还有更多数据
    const hasMore = rows.length > pageSize
    // 如果有多取的一条数据，移除它
    const list = hasMore ? rows.slice(0, -1) : rows

    res.cc(true, '获取聊天记录成功', 200, {
      list: list.reverse(),
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: parseInt(pageSize),
        hasMore
      }
    })
  } catch (e) { next(e) }
}

// chat.js handler
exports.sendMessage = async (req, res, next) => {
  const { roomId, content, content_text } = req.body
  const userId = req.user.id
  if (!roomId || !content) return res.cc(false, '参数不完整', 400)

  // 如果没有提供 content_text，从 content 中提取纯文本（处理 HTML）
  let plainText = content_text
  if (!plainText && content) {
    // 简单的 HTML 标签移除
    plainText = content.replace(/<[^>]*>/g, '').trim()
  }
  // 如果仍然为空，使用 content 作为后备
  if (!plainText) {
    plainText = content.trim()
  }

  try {
    await conMysql(
      'INSERT INTO messages (room_id, user_id, content, content_text, created_at) VALUES (?, ?, ?, ?, NOW())',
      [roomId, userId, content, plainText]
    )
    res.cc(true, '消息发送成功')
  } catch (e) { next(e) }
}

exports.deleteMessage = async (req, res, next) => {
  const { messageId } = req.body
  const userId = req.user.id

  if (!messageId) return res.cc(false, '消息ID不能为空', 400)

  try {
    // 首先检查消息是否存在且属于当前用户
    const messageResult = await conMysql(
      'SELECT id, user_id FROM messages WHERE id = ?',
      [messageId]
    )

    if (messageResult.length === 0) {
      return res.cc(false, '消息不存在', 404)
    }

    if (messageResult[0].user_id !== userId) {
      return res.cc(false, '无权删除此消息', 403)
    }

    // 删除消息
    await conMysql(
      'DELETE FROM messages WHERE id = ?',
      [messageId]
    )

    res.cc(true, '消息删除成功')
  } catch (e) {
    next(e)
  }
}

exports.hideMessage = async (req, res, next) => {
  const { messageId } = req.body
  const userId = req.user.id

  if (!messageId) return res.cc(false, '消息ID不能为空', 400)

  try {
    // 首先检查消息是否存在
    const messageResult = await conMysql(
      'SELECT id, unvisible_user_id FROM messages WHERE id = ?',
      [messageId]
    )

    if (messageResult.length === 0) {
      return res.cc(false, '消息不存在', 404)
    }

    const message = messageResult[0]
    let unvisibleUserIds = message.unvisible_user_id ? message.unvisible_user_id.split(',') : []

    // 检查当前用户是否已经在不可见列表中
    if (unvisibleUserIds.includes(userId.toString())) {
      return res.cc(false, '消息已被隐藏', 400)
    }

    // 添加当前用户到不可见列表
    unvisibleUserIds.push(userId.toString())
    const newUnvisibleUserIds = unvisibleUserIds.join(',')

    // 更新消息的不可见用户列表
    await conMysql(
      'UPDATE messages SET unvisible_user_id = ? WHERE id = ?',
      [newUnvisibleUserIds, messageId]
    )

    res.cc(true, '消息隐藏成功')
  } catch (e) {
    next(e)
  }
}
