import request from './api_index'

// 切换收藏状态
export const toggleFavorite = (data) => request.post('/api/favorite/toggle', data)

// 获取收藏列表
export const getFavorite = (data) => request.get('/api/favorite/list', { params: data })

