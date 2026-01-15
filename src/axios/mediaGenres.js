import request from './api_index'

// ==================== 类型列表 ====================
// 获取所有类型列表
export const getGenresList = (params) => request.get('/api/media-genres/list', { params })

// ==================== 类型详情 ====================
// 获取类型详情
export const getGenreDetail = (id) => request.get(`/api/media-genres/detail/${id}`)

// ==================== 类型CRUD ====================
// 创建类型
export const createGenre = (data) => request.post('/api/media-genres/create', data)

// 更新类型
export const updateGenre = (id, data) => request.put(`/api/media-genres/update/${id}`, data)

// 删除类型
export const deleteGenre = (id) => request.delete(`/api/media-genres/delete/${id}`)

// ==================== 类型下的媒体 ====================
// 获取类型下的媒体列表
export const getGenreMedia = (id, params) => request.get(`/api/media-genres/${id}/media`, { params })

