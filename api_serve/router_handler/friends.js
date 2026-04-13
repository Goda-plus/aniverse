const {conMysql} = require('../db')
const SHOP_SERVICE_PREFIX = '__SHOP_SERVICE__:'
const CROWDFUNDING_SUPPORT_PREFIX = '__CROWDFUNDING_SUPPORT__:'

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
      const relation = existing[0]
      if (relation.status === 'accepted') {
        return res.cc(false, '已是好友', 400)
      }
      if (relation.status === 'pending') {
        return res.cc(false, '好友请求已发送，请等待对方处理', 400)
      }
      // deleted / blocked 等状态，允许重新发起请求
      await conMysql(
        `UPDATE friends
         SET status = 'pending', created_at = NOW()
         WHERE user_id = ? AND friend_id = ?`,
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

      return res.cc(true, '好友请求已发送')
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
      // 插入/恢复对称记录（你也加他）
      await conMysql(
        `INSERT INTO friends (user_id, friend_id, status, created_at)
         VALUES (?, ?, 'accepted', NOW())
         ON DUPLICATE KEY UPDATE status = 'accepted'`,
        [userId, friendId]
      )

      // 发送实时通知给申请者
      const socketInstance = getSocketInstance()
      if (socketInstance) {
        socketInstance.sendToUser(friendId, 'friendRequestAccepted', {
          fromUserId: userId,
          fromUsername: req.user.username
        })
        // 双方都刷新好友列表/私聊列表，确保申请方界面即时更新
        const refreshPayload = {
          reason: 'friend_accepted',
          fromUserId: userId,
          targetUserId: Number(friendId)
        }
        socketInstance.sendToUser(friendId, 'friendListUpdated', refreshPayload)
        socketInstance.sendToUser(userId, 'friendListUpdated', refreshPayload)
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

    // 单向删除：仅将当前用户->对方关系标记为 deleted
    await conMysql(
      `UPDATE friends
       SET status = 'deleted'
       WHERE user_id = ? AND friend_id = ? AND status = 'accepted'`,
      [userId, friendId]
    )

    // 删除当前用户与该好友的“普通私聊会话”成员关系（仅删除方侧最近会话中消失）
    const directRooms = await conMysql(
      `SELECT r.id
       FROM chat_rooms r
       JOIN chat_room_members m1 ON m1.room_id = r.id AND m1.user_id = ?
       JOIN chat_room_members m2 ON m2.room_id = r.id AND m2.user_id = ?
       WHERE r.is_group = 0
         AND (r.name IS NULL OR (r.name NOT LIKE ? AND r.name NOT LIKE ?))`,
      [userId, friendId, `${SHOP_SERVICE_PREFIX}%`, `${CROWDFUNDING_SUPPORT_PREFIX}%`]
    )
    if (directRooms.length) {
      await conMysql(
        `DELETE FROM chat_room_members
         WHERE user_id = ?
           AND room_id IN (${directRooms.map(() => '?').join(',')})`,
        [userId, ...directRooms.map(room => room.id)]
      )
    }

    // 通知双方刷新好友/聊天列表
    const socketInstance = getSocketInstance()
    if (socketInstance) {
      socketInstance.sendToUser(userId, 'friendDeleted', {
        byUserId: userId,
        friendId: Number(friendId)
      })
      socketInstance.sendToUser(friendId, 'friendDeleted', {
        byUserId: userId,
        friendId: Number(userId)
      })
    }

    res.cc(true, '好友删除成功')
  } catch (e) { next(e) }
}

