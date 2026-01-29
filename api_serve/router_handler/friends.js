const {conMysql} = require('../db')

// 获取 Socket.io 实例（通过全局变量）
const getSocketInstance = () => global.socketInstance

exports.requestFriend = async (req, res, next) => {
  let { friendId } = req.body
  const userId = req.user.id

  // 如果 friendId 不是数字，尝试按用户名查找
  if (isNaN(Number(friendId))) {
    const userRows = await conMysql('SELECT id FROM users WHERE username = ?', [friendId])
    if (!userRows.length) {
      return res.cc(false, '用户不存在', 404)
    }
    friendId = userRows[0].id
  }

  if (userId == friendId) {
    return res.cc(false, '不能添加自己为好友', 400)
  }

  try {
    const existing = await conMysql(
      `SELECT * FROM friends
       WHERE user_id = ? AND friend_id = ?`,
      [userId, friendId]
    )
    if (existing.length > 0) {
      return res.cc(false, '好友请求已存在或已是好友', 400)
    }

    await conMysql(
      `INSERT INTO friends (user_id, friend_id, status)
       VALUES (?, ?, 'pending')`,
      [userId, friendId]
    )

    // 发送实时通知给被申请者
    const socketInstance = getSocketInstance()
    if (socketInstance) {
      socketInstance.sendToUser(friendId, 'friendRequest', {
        fromUserId: userId,
        fromUsername: req.user.username,
        message: '想添加你为好友'
      })
    }

    res.cc(true, '好友请求已发送')
  } catch (e) { next(e) }
}


exports.handleRequest = async (req, res, next) => {
  const { friendId, action } = req.body   // action: accept / reject
  const userId = req.user.id

  try {
    if (action === 'accept') {
      // 更新请求状态
      await conMysql(
        `UPDATE friends SET status = 'accepted'
         WHERE user_id = ? AND friend_id = ? AND status = 'pending'`,
        [friendId, userId]
      )
      // 插入对称记录（你也加他）
      await conMysql(
        `INSERT IGNORE INTO friends (user_id, friend_id, status)
         VALUES (?, ?, 'accepted')`,
        [userId, friendId]
      )

      // 发送实时通知给申请者
      const socketInstance = getSocketInstance()
      if (socketInstance) {
        socketInstance.sendToUser(friendId, 'friendRequestAccepted', {
          fromUserId: userId,
          fromUsername: req.user.username
        })
      }

      res.cc(true, '好友请求已接受')
    } else {
      // 拒绝：删除请求
      await conMysql(
        `DELETE FROM friends
         WHERE user_id = ? AND friend_id = ? AND status = 'pending'`,
        [friendId, userId]
      )
      res.cc(true, '好友请求已拒绝')
    }
  } catch (e) { next(e) }
}


// 好友列表
exports.listFriends = async (req, res, next) => {
  const userId = req.user.id
  try {
    const rows = await conMysql(
      `SELECT u.id, u.username, f.tip
       FROM users u
       INNER JOIN friends f ON (
         (f.user_id = ? AND f.friend_id = u.id) 
       )
       WHERE f.status = 'accepted'`,
      [userId, userId]
    )
    res.cc(true, '获取好友列表成功', 200, rows)
  } catch (e) { next(e) }
}

exports.pendingRequests = async (req, res, next) => {
  const userId = req.user.id
  try {
    const rows = await conMysql(
      `SELECT f.user_id AS id, u.username
       FROM friends f
       JOIN users u ON f.user_id = u.id
       WHERE f.friend_id = ? AND f.status = 'pending'`,
      [userId]
    )
    res.cc(true, '获取待处理好友请求成功', 200, rows)
  } catch (e) { next(e) }
}

// 更新好友备注
exports.updateRemark = async (req, res, next) => {
  const { friendId, remark } = req.body
  const userId = req.user.id

  try {
    // 验证好友关系是否存在
    const friendCheck = await conMysql(
      `SELECT COUNT(*) as count FROM friends
       WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
       AND status = 'accepted'`,
      [userId, friendId, friendId, userId]
    )

    if (friendCheck[0].count === 0) {
      return res.cc(false, '好友关系不存在', 404)
    }

    // 更新备注（需要更新双方记录中的tip字段）
    await conMysql(
      `UPDATE friends SET tip = ?
       WHERE (user_id = ? AND friend_id = ?)`,
      [remark, userId, friendId]
    )

    res.cc(true, '备注更新成功')
  } catch (e) { next(e) }
}

// 删除好友
exports.deleteFriend = async (req, res, next) => {
  const { friendId } = req.body
  const userId = req.user.id

  try {
    // 验证好友关系是否存在
    const friendCheck = await conMysql(
      `SELECT COUNT(*) as count FROM friends
       WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
       AND status = 'accepted'`,
      [userId, friendId, friendId, userId]
    )

    if (friendCheck[0].count === 0) {
      return res.cc(false, '好友关系不存在', 404)
    }

    // 删除双方好友关系
    await conMysql(
      `DELETE FROM friends
       WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [userId, friendId, friendId, userId]
    )

    res.cc(true, '好友删除成功')
  } catch (e) { next(e) }
}

