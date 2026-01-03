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
    res.cc(true, '获取房间成功', 200, rows)
  } catch (e) { next(e) }
}
