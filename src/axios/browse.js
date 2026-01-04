import request from './api_index'

// 添加浏览记录
export const addBrowse = (data) => request.post('/api/browse/add', data)

// 删除浏览历史项
export const deleteHistoryItem = (data) => request.delete('/api/browse/delete', data)

// 清空所有浏览历史
export const clearAllHistory = (data) => request.delete('/api/browse/clear', data)

// 获取浏览列表
export const browseList = (data) => request.get('/api/browse/list', data)

