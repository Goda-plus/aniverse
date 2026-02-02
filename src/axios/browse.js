import request from './api_index'

// 添加浏览记录
export const addBrowse = (data) => request.post('/api/browse/add', data)

// 删除浏览历史项
export const deleteHistoryItem = (data) => request.delete('/api/browse/delete', { data })

// 清空所有浏览历史
export const clearAllHistory = (data) => request.delete('/api/browse/clear', data)

// 获取浏览列表（带分页，返回完整帖子信息）
export const getBrowseHistory = (data) => request.get('/api/browse/list', { params: data })

// 获取用户活动历史
export const getUserActivities = (data) => request.get('/api/browse/activities', { params: data })

// 获取用户统计数据
export const getUserStatistics = () => request.get('/api/browse/statistics')

