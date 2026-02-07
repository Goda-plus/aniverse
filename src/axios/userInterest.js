import request from './api_index'

// 获取用户兴趣标签列表
export const getUserInterests = () => {
  return request.get('/api/user/interests')
}

// 添加兴趣标签
export const addUserInterest = (data) => {
  return request.post('/api/user/interests', data)
}

// 批量添加兴趣标签
export const batchAddInterests = (data) => {
  return request.post('/api/user/interests/batch', data)
}

// 删除兴趣标签
export const removeUserInterest = (tag_id) => {
  return request.delete(`/api/user/interests/${tag_id}`)
}

// 更新兴趣标签权重
export const updateInterestWeight = (tag_id, data) => {
  return request.put(`/api/user/interests/${tag_id}/weight`, data)
}

// 获取推荐标签
export const getRecommendedTags = (params) => {
  return request.get('/api/user/interests/recommended', { params })
}














