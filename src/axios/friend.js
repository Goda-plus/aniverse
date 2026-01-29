import request from './api_index'

// 获取好友列表
export const getFriendList = () => request.get('/api/friends/list')

// 获取待处理请求
export const getPendingList = () => request.get('/api/friends/pendlist')

// 添加好友
export const addFriend = (data) => request.post('/api/friends/request', data)

// 搜索用户（按用户名关键字）
export const searchUsers = (keyword) => request.get('/api/user/search', { params: { username: keyword } })

// 处理好友请求
export const handleFriendRequest = (data) => request.post('/api/friends/handle', data)

// 更新好友备注
export const updateFriendRemark = (data) => request.put('/api/friends/remark', data)

// 删除好友
export const deleteFriend = (data) => request.delete('/api/friends/friend', { data })

