import request from './api_index'

// ==================== 媒体列表 ====================
// 获取媒体列表（支持分页、筛选、排序）
export const getMediaList = (params) => request.get('/api/media/list', { params })

// 搜索媒体
export const searchMedia = (params) => request.get('/api/media/search', { params })

// ==================== 媒体详情 ====================
// 获取媒体详情（包含关联信息）
export const getMediaDetail = (id) => request.get(`/api/media/detail/${id}`)

// ==================== 媒体CRUD ====================
// 创建媒体
export const createMedia = (data) => request.post('/api/media/create', data)

// 更新媒体
export const updateMedia = (id, data) => request.put(`/api/media/update/${id}`, data)

// 删除媒体
export const deleteMedia = (id) => request.delete(`/api/media/delete/${id}`)

// ==================== 媒体标签 ====================
// 获取媒体标签
export const getMediaTags = (id) => request.get(`/api/media/${id}/tags`)

// 添加媒体标签
export const addMediaTag = (id, data) => request.post(`/api/media/${id}/tags`, data)

// 删除媒体标签
export const removeMediaTag = (id, tagId) => request.delete(`/api/media/${id}/tags/${tagId}`)

// ==================== 媒体类型 ====================
// 获取媒体类型
export const getMediaGenres = (id) => request.get(`/api/media/${id}/genres`)

// 添加媒体类型
export const addMediaGenre = (id, data) => request.post(`/api/media/${id}/genres`, data)

// 删除媒体类型
export const removeMediaGenre = (id, genreId) => request.delete(`/api/media/${id}/genres/${genreId}`)

// ==================== 媒体角色 ====================
// 获取媒体角色
export const getMediaCharacters = (id) => request.get(`/api/media/${id}/characters`)

// 添加媒体角色
export const addMediaCharacter = (id, data) => request.post(`/api/media/${id}/characters`, data)

// 删除媒体角色
export const removeMediaCharacter = (id, characterId) => request.delete(`/api/media/${id}/characters/${characterId}`)

// ==================== 媒体关系 ====================
// 获取媒体关系
export const getMediaRelations = (id) => request.get(`/api/media/${id}/relations`)

// 添加媒体关系
export const addMediaRelation = (id, data) => request.post(`/api/media/${id}/relations`, data)

// 删除媒体关系
export const removeMediaRelation = (id, relationId) => request.delete(`/api/media/${id}/relations/${relationId}`)

// ==================== 媒体趋势和排名 ====================
// 获取媒体趋势
export const getMediaTrends = (id, params) => request.get(`/api/media/${id}/trends`, { params })

// 获取媒体排名
export const getMediaRankings = (id) => request.get(`/api/media/${id}/rankings`)

// ==================== 媒体同义词 ====================
// 获取媒体同义词
export const getMediaSynonyms = (id) => request.get(`/api/media/${id}/synonyms`)

// 添加媒体同义词
export const addMediaSynonym = (id, data) => request.post(`/api/media/${id}/synonyms`, data)

// 删除媒体同义词
export const removeMediaSynonym = (id, synonymId) => request.delete(`/api/media/${id}/synonyms/${synonymId}`)

