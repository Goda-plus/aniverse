import request from './api_index'

// ==================== 角色列表 ====================
// 获取角色列表
export const getCharactersList = (params) => request.get('/api/characters/list', { params })

// ==================== 角色详情 ====================
// 获取角色详情
export const getCharacterDetail = (id) => request.get(`/api/characters/detail/${id}`)

// ==================== 角色CRUD ====================
// 创建角色
export const createCharacter = (data) => request.post('/api/characters/create', data)

// 更新角色
export const updateCharacter = (id, data) => request.put(`/api/characters/update/${id}`, data)

// 删除角色
export const deleteCharacter = (id) => request.delete(`/api/characters/delete/${id}`)

// ==================== 角色参与的媒体 ====================
// 获取角色参与的媒体列表
export const getCharacterMedia = (id, params) => request.get(`/api/characters/${id}/media`, { params })

