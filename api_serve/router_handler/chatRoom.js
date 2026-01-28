const {conMysql} = require('../db')

// 创建私聊或群聊
exports.createRoom = async (req, res, next) => {
  const { memberIds = [], name } = req.body        // memberIds: [id1,id2...]
  const userId = req.user.id
  const isGroup = memberIds.length > 1
  try {
    // 私聊：检查是否已有
    if (!isGroup) {
      const [room] = await conMysql(
        `SELECT r.id
         FROM chat_rooms r
         JOIN chat_room_members m1 ON m1.room_id = r.id AND m1.user_id = ?
         JOIN chat_room_members m2 ON m2.room_id = r.id AND m2.user_id = ?
         WHERE r.is_group = 0
         LIMIT 1`, [userId, memberIds[0]]
      )
      if (room) return res.cc(true, '已存在', 200, { roomId: room.id })
    }
    // 1. 新建房间
    const result = await conMysql(
      `INSERT INTO chat_rooms (is_group, name, created_by)
       VALUES (?,?,?)`, [isGroup, name || null, userId]
    )
    const roomId = result.insertId
    // 2. 插入成员
    await conMysql(
      `INSERT INTO chat_room_members (room_id, user_id)
       VALUES ${[userId, ...memberIds].map(() => '(?,?)').join(',')}`,
      [roomId, userId, ...memberIds.flatMap(id => [roomId, id])]
    )
    res.cc(true, '创建成功', 200, { roomId })
  } catch (e) { next(e) }
}

// 获取我参与的房间
exports.listRooms = async (req, res, next) => {
  const userId = req.user.id
  try {
    const rows = await conMysql(
      `SELECT r.id, r.is_group, r.name, r.created_at
       FROM chat_rooms r
       JOIN chat_room_members m ON m.room_id = r.id
       WHERE m.user_id = ? ORDER BY r.created_at DESC`, [userId]
    )
    
    // 为每个房间获取成员信息和最后一条消息
    for (const room of rows) {
      // 获取房间成员
      const members = await conMysql(
        `SELECT u.id, u.username, u.avatar_url
         FROM chat_room_members m
         JOIN users u ON m.user_id = u.id
         WHERE m.room_id = ? AND u.id != ?`, [room.id, userId]
      )
      room.members = members
      
      // 获取最后一条消息
      const [lastMsg] = await conMysql(
        `SELECT m.content, u.username, m.created_at, m.content_text
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.room_id = ?
         ORDER BY m.created_at DESC
         LIMIT 1`, [room.id]
      )
      if (lastMsg) {
        room.lastMessage = lastMsg
      }
    }
    
    res.cc(true, '获取房间成功', 200, rows)
  } catch (e) { next(e) }
}
