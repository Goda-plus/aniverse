const {conMysql} = require('../db')

exports.history = async (req, res, next) => {
  const { roomId, page = 1, pageSize = 20 } = req.query
  const offset = (page - 1) * pageSize
  try {
    // 获取消息数据
    const rows = await conMysql(
      `SELECT m.id, m.user_id, u.username, m.content, m.content_text, m.created_at
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.room_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`, [roomId, +pageSize + 1, +offset] // 多取一条来判断是否有更多数据
    )

    // 获取总数
    const countResult = await conMysql(
      `SELECT COUNT(*) as total FROM messages WHERE room_id = ?`, [roomId]
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
      `INSERT INTO messages (room_id, user_id, content, content_text, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [roomId, userId, content, plainText]
    )
    res.cc(true, '消息发送成功')
  } catch (e) { next(e) }
}
