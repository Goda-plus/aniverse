import request from './api_index'

// 获取所有分类（genres）
export const getAllGenres = () => request.get('/api/genre/list')

// 根据分类获取社区列表
export const getSubredditsByGenre = (params) => request.get('/api/genre/subreddits', { params })

// 获取推荐社区
export const getRecommendedSubreddits = (params) => request.get('/api/genre/recommended', { params })

// 获取最受欢迎的社区
export const getPopularSubreddits = (params) => request.get('/api/genre/popular', { params })

