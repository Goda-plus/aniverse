const { Server } = require('socket.io')
const { expressjwt: expressJWT } = require('express-jwt')
const config = require('../config')
const {conMysql} = require('../db/index')
const SHOP_SERVICE_PREFIX = '__SHOP_SERVICE__:'
const CROWDFUNDING_SUPPORT_PREFIX = '__CROWDFUNDING_SUPPORT__:'

const userSocketMap = new Map()

// 统一用户ID类型，避免 Map 的 number/string 键不一致
function normalizeUserId (userId) {
  const normalized = Number(userId)
  return Number.isFinite(normalized) ? normalized : userId
}

// 获取用户 Socket ID 的工具函数
function getUserSocketId (userId) {
  return userSocketMap.get(normalizeUserId(userId))
}

// 向特定用户发送消息的工具函数
function sendToUser (io, userId, event, data) {
  const socketId = getUserSocketId(userId)
  if (socketId) {
    io.to(socketId).emit(event, data)
  }
}

async function isUserInRoom (userId, roomId) {
  const rows = await conMysql(
    `SELECT COUNT(*) AS count
     FROM chat_room_members
     WHERE room_id = ? AND user_id = ?`,
    [roomId, userId]
  )
  return Number(rows?.[0]?.count || 0) > 0
}

function isFriendSceneRoom (room) {
  const name = room?.name || ''
  return !room?.is_group &&
    !name.startsWith(SHOP_SERVICE_PREFIX) &&
    !name.startsWith(CROWDFUNDING_SUPPORT_PREFIX)
}

async function canSendInFriendDirectRoom (roomId, userId) {
  const [room] = await conMysql(
    'SELECT id, is_group, name FROM chat_rooms WHERE id = ? LIMIT 1',
    [roomId]
  )
  if (!room) {
    return { ok: false, reason: '聊天室不存在' }
  }

  if (!isFriendSceneRoom(room)) {
    return { ok: true }
  }

  const members = await conMysql(
    'SELECT user_id FROM chat_room_members WHERE room_id = ? LIMIT 2',
    [roomId]
  )
  const peer = members.find(m => Number(m.user_id) !== Number(userId))
  if (!peer) {
    return { ok: false, reason: '聊天室成员异常' }
  }

  // 单向删除规则：只有当“对方仍把我标记为 accepted”时，才允许我发消息给对方
  const accepted = await conMysql(
    `SELECT COUNT(*) AS count
     FROM friends
     WHERE user_id = ? AND friend_id = ? AND status = 'accepted'`,
    [peer.user_id, userId]
  )
  if (Number(accepted?.[0]?.count || 0) === 0) {
    return { ok: false, reason: '你已被对方删除，无法发送消息' }
  }
  return { ok: true }
}

let io = null

module.exports = function initSocket (server) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:8080', 'http://localhost:3000'],
      credentials: true
    }
  })

  // 使用 express-jwt 进行握手鉴权（支持 Bearer 与 auth.token）
  const authenticate = expressJWT({
    secret: config.jwtSecretKey,
    algorithms: ['HS256'],
    requestProperty: 'user'  // 将解析后的 token 数据放在 req.user 上
  })

  io.use((socket, next) => {
    // 允许前端通过 auth.token 传递（例如 'Bearer <token>'）
    const raw = socket.handshake.auth?.token
    if (raw && !socket.request.headers.authorization) {
      socket.request.headers.authorization = raw
    }

    authenticate(socket.request, {}, (err) => {
      if (err) return next(err)
      // express-jwt 会把 payload 放到 request.user 上
      const user = socket.request.user
      if (!user) return next(new Error('Unauthorized'))
      socket.user = user
      next()
    })
  })

  // 所有事件绑定写在这里（只能写一次 io.on('connection')）
  io.on('connection', (socket) => {
    console.log(` 用户 ${socket.user.username} 连接`)

    const normalizedUserId = normalizeUserId(socket.user.id)
    userSocketMap.set(normalizedUserId, socket.id)
    console.log(`已登记在线用户: userId=${normalizedUserId}, socketId=${socket.id}`)

    socket.on('disconnect', () => {
      userSocketMap.delete(normalizeUserId(socket.user.id))
      console.log(` 用户 ${socket.user.username} 断开连接`)
    })

    // 用户加入房间
    socket.on('joinRoom', (roomId) => {
      if (!roomId) return
      socket.join(roomId)
      console.log(`用户 ${socket.user.username} 加入房间 ${roomId}`)
    })

    // 聊天消息事件
    socket.on('chatMessage', async ({ roomId, content, content_text, imageUrl, fileUrl, fileName, fileSize, messageType }) => {
      if (!roomId || !content?.trim()) return

      // 如果没有提供 content_text，从 content 中提取纯文本（处理 HTML）
      let plainText = content_text
      if (!plainText && content) {
        // 简单的 HTML 标签移除（如果后端需要处理）
        plainText = content.replace(/<[^>]*>/g, '').trim()
      }
      // 如果仍然为空，使用 content 作为后备
      if (!plainText) {
        plainText = content.trim()
      }

      const msg = {
        room_id: roomId,
        user_id: socket.user.id,
        username: socket.user.username,
        content,
        content_text: plainText
      }

      try {
        const inRoom = await isUserInRoom(msg.user_id, msg.room_id)
        if (!inRoom) {
          socket.emit('chatBlocked', { message: '你不在该聊天室中，无法发送消息' })
          return
        }

        const permission = await canSendInFriendDirectRoom(msg.room_id, msg.user_id)
        if (!permission.ok) {
          socket.emit('chatBlocked', { message: permission.reason || '当前无法发送消息' })
          return
        }

        // 插入消息并获取插入的ID
        const result = await conMysql(
          'INSERT INTO messages (room_id, user_id, content, content_text, created_at) VALUES (?,?,?,?,NOW())',
          [msg.room_id, msg.user_id, msg.content, msg.content_text]
        )
        // 获取插入消息的ID（使用 LAST_INSERT_ID()）
        const messageId = result.insertId

        io.to(roomId).emit('chatMessage', {
          id: messageId,
          roomId: roomId,
          user: msg.username,
          userId: msg.user_id,
          content: msg.content,
          content_text: msg.content_text,
          imageUrl,
          fileUrl,
          fileName,
          fileSize,
          messageType: messageType || 'text',
          time: new Date()
        })
      } catch (error) {
        console.error('消息存储失败:', error)
      }
    })

    // 撤回消息（支持 recallMessage 和 revokeMessage 两种事件名）
    const handleRecallMessage = async ({ msgId, roomId, messageId }) => {
      const id = msgId || messageId
      if (!id || !roomId) return
      try {
        await conMysql(
          'UPDATE messages SET content=\'[已撤回]\', content_text=\'[已撤回]\' WHERE id=? AND user_id=?',
          [id, socket.user.id]
        )
        io.to(roomId).emit('messageRecalled', { messageId: id, roomId })
      } catch (error) {
        console.error('撤回失败:', error)
      }
    }
    
    socket.on('recallMessage', handleRecallMessage)
    socket.on('revokeMessage', handleRecallMessage)
  })

  return {
    io,
    userSocketMap,
    sendToUser: (userId, event, data) => {
      const normalizedUserId = normalizeUserId(userId)
      console.log(`尝试向用户 ${normalizedUserId} 发送事件 ${event}:`, data)
      const socketId = getUserSocketId(normalizedUserId)
      console.log(`用户 ${normalizedUserId} 的socketId:`, socketId)
      if (socketId) {
        io.to(socketId).emit(event, data)
        console.log(`事件 ${event} 已发送给用户 ${normalizedUserId}`)
      } else {
        console.log(`用户 ${normalizedUserId} 未连接，无法发送事件 ${event}`)
      }
    }
  }
}

module.exports.userSocketMap = userSocketMap
