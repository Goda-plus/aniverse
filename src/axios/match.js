import request from './api_index'

// 获取推荐列表
export const getRecommendations = (params) => {
  return request.get('/api/user/recommendations', { params })
}

// 刷新推荐列表
export const refreshRecommendations = () => {
  return request.post('/api/user/recommendations/refresh')
}

// 忽略推荐
export const dismissRecommendation = (recommended_user_id) => {
  return request.post(`/api/user/recommendations/${recommended_user_id}/dismiss`)
}

// 获取与指定用户的相似度
export const getUserSimilarity = (user_id_2) => {
  return request.get(`/api/user/similarity/${user_id_2}`)
}













