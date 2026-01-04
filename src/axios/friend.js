import request from './api_index'

// 获取好友列表
export const getFriendList = () => request.get('/api/friends/list')

// 获取待处理请求
export const getPendingList = () => request.get('/api/friends/pendlist')

// 添加好友
export const addFriend = (data) => request.post('/api/friends/request', data)

// 处理好友请求
export const handleFriendRequest = (data) => request.post('/api/friends/handle', data)

