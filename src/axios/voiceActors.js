import request from './api_index'

// ==================== 声优列表 ====================
// 获取声优列表
export const getVoiceActorsList = (params) => request.get('/api/voice-actors/list', { params })

// ==================== 声优详情 ====================
// 获取声优详情
export const getVoiceActorDetail = (id) => request.get(`/api/voice-actors/detail/${id}`)

// ==================== 声优CRUD ====================
// 创建声优
export const createVoiceActor = (data) => request.post('/api/voice-actors/create', data)

// 更新声优
export const updateVoiceActor = (id, data) => request.put(`/api/voice-actors/update/${id}`, data)

// 删除声优
export const deleteVoiceActor = (id) => request.delete(`/api/voice-actors/delete/${id}`)

// ==================== 声优配音的角色 ====================
// 获取声优配音的角色列表
export const getVoiceActorCharacters = (id, params) => request.get(`/api/voice-actors/${id}/characters`, { params })

