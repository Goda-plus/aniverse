const { Server } = require('socket.io')
const { expressjwt: expressJWT } = require('express-jwt')
const config = require('../config')
const {conMysql} = require('../db/index')

const userSocketMap = new Map()

// 获取用户 Socket ID 的工具函数
function getUserSocketId (userId) {
  return userSocketMap.get(userId)
}

// 向特定用户发送消息的工具函数
function sendToUser (io, userId, event, data) {
  const socketId = getUserSocketId(userId)
  if (socketId) {
    io.to(socketId).emit(event, data)
  }
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

    userSocketMap.set(socket.user.id, socket.id)

    socket.on('disconnect', () => {
      userSocketMap.delete(socket.user.id)
      console.log(` 用户 ${socket.user.username} 断开连接`)
    })

    // 用户加入房间
    socket.on('joinRoom', (roomId) => {
      if (!roomId) return
      socket.join(roomId)
      console.log(`用户 ${socket.user.username} 加入房间 ${roomId}`)
    })

    // 聊天消息事件
    socket.on('chatMessage', async ({ roomId, content }) => {
      if (!roomId || !content?.trim()) return

      const msg = {
        room_id: roomId,
        user_id: socket.user.id,
        username: socket.user.username,
        content
      }

      try {
        await conMysql(
          'INSERT INTO messages (room_id, user_id, content, created_at) VALUES (?,?,?,NOW())',
          [msg.room_id, msg.user_id, msg.content]
        )

        io.to(roomId).emit('chatMessage', {
          roomId: roomId,
          user: msg.username,
          userId: msg.user_id,
          content: msg.content,
          time: new Date()
        })
      } catch (error) {
        console.error('消息存储失败:', error)
      }
    })

    // 撤回消息（可选）
    socket.on('revokeMessage', async ({ msgId, roomId }) => {
      try {
        await conMysql(
          'UPDATE messages SET content=\'[已撤回]\' WHERE id=? AND user_id=?',
          [msgId, socket.user.id]
        )
        io.to(roomId).emit('revokeMessage', { msgId })
      } catch (error) {
        console.error('撤回失败:', error)
      }
    })
  })

  return {
    io,
    userSocketMap,
    sendToUser: (userId, event, data) => {
      console.log(`尝试向用户 ${userId} 发送事件 ${event}:`, data)
      const socketId = userSocketMap.get(userId)
      console.log(`用户 ${userId} 的socketId:`, socketId)
      if (socketId) {
        io.to(socketId).emit(event, data)
        console.log(`事件 ${event} 已发送给用户 ${userId}`)
      } else {
        console.log(`用户 ${userId} 未连接，无法发送事件 ${event}`)
      }
    }
  }
}

module.exports.userSocketMap = userSocketMap
