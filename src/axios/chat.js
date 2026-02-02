import request from './api_index'

// 获取聊天记录
export const getChatHistory = (params) => request.get('/api/chat/history', { params })

// 获取房间列表
export const getRoomList = () => request.get('/api/chatRoom/list')

// 发送聊天消息
export const sendChatMsg = (data) => request.post('/api/chat/send', data)

// 删除消息
export const deleteMessage = (data) => request.post('/api/chat/delete', data)

// 隐藏消息（对当前用户不可见）
export const hideMessage = (data) => request.post('/api/chat/hide', data)

// 创建房间（私聊/群聊）
export const createRoom = (data) => request.post('/api/chatRoom/create', data)

