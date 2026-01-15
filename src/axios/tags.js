import request from './api_index'

// ==================== 标签列表 ====================
// 获取标签列表
export const getTagsList = (params) => request.get('/api/tags/list', { params })

// ==================== 标签详情 ====================
// 获取标签详情
export const getTagDetail = (id) => request.get(`/api/tags/detail/${id}`)

// ==================== 标签CRUD ====================
// 创建标签
export const createTag = (data) => request.post('/api/tags/create', data)

// 更新标签
export const updateTag = (id, data) => request.put(`/api/tags/update/${id}`, data)

// 删除标签
export const deleteTag = (id) => request.delete(`/api/tags/delete/${id}`)

// ==================== 标签下的媒体 ====================
// 获取标签下的媒体列表
export const getTagMedia = (id, params) => request.get(`/api/tags/${id}/media`, { params })

