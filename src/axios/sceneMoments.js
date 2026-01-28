import request from './api_index'

// 获取某作品下名场面列表
export const getSceneMomentsByMedia = (mediaId, params) =>
  request.get(`/api/scene-moments/media/${mediaId}`, { params })

// 名场面详情
export const getSceneMomentDetail = (id) =>
  request.get(`/api/scene-moments/${id}`)

// 创建名场面
export const createSceneMoment = (data) =>
  request.post('/api/scene-moments/create', data)

// 点赞/取消点赞
export const toggleSceneMomentLike = (id) =>
  request.post(`/api/scene-moments/${id}/like-toggle`, {})

// 评论列表
export const getSceneMomentComments = (id) =>
  request.get(`/api/scene-moments/${id}/comments`)

// 发表评论
export const createSceneMomentComment = (id, data) =>
  request.post(`/api/scene-moments/${id}/comments`, data)


