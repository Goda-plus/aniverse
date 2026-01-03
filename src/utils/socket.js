
import { io } from 'socket.io-client'

let socket = null

// 获取存储方式
const getStorage = () => {
  const remember = localStorage.getItem('remember') === 'true'
  return remember ? localStorage : sessionStorage
}

// 获取token
const getToken = () => {
  const storage = getStorage()
  console.log('token', storage.getItem('token'))
  return storage.getItem('token')
}

export function initSocket () {
  if (!socket) {
    socket = io('http://localhost:3000', {
      auth: {
        // 统一使用 Bearer 形式，后端 express-jwt 会兼容解析
        token: getToken()?.startsWith('Bearer ') ? getToken() : `Bearer ${getToken() || ''}`
      }
    })

    socket.on('connect', () => {
      console.log('✅ 已连接 Socket:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('❌ 断开 Socket')
    })

    socket.on('connect_error', (err) => {
      console.error('连接失败：', err.message)
    })
  }

  return socket
}

export function getSocket () {
  return socket
}
