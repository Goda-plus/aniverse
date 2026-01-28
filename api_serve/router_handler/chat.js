const {conMysql} = require('../db')

exports.history = async (req, res, next) => {
  const { roomId, page = 1, pageSize = 30 } = req.query
  const offset = (page - 1) * pageSize
  try {
    const rows = await conMysql(
      `SELECT m.id, m.user_id, u.username, m.content, m.content_text, m.created_at
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.room_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`, [roomId, +pageSize, +offset]
    )
    res.cc(true, 'success', 200, rows.reverse())
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
