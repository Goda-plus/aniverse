import request from './api_index'

// 切换收藏状态
export const toggleFavorite = (data) => request.post('/api/favorite/toggle', data)

// 检查是否已收藏
export const checkFavorite = (params) => request.get('/api/favorite/check', { params })

// 批量检查收藏状态
export const checkFavoritesBatch = (data) => request.post('/api/favorite/check-batch', data)

// 获取收藏列表
export const getFavorite = (data) => request.get('/api/favorite/list', { params: data })

