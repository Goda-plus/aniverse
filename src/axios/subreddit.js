import request from './api_index'

// 获取所有子版块
export const getAllSubreddits = (data) => request.get('/api/subreddit/list', { params: data })

// 搜索子版块
export const searchSubreddits = (data) => request.get('/api/subreddit/search', { params: data })

// 根据分类获取子版块
export const getSubredditsByCategory = (data) => request.get('/api/subreddit/sortlist', { params: data })

// 获取子版块详情
export const getSubredditDetail = (data) => request.get('/api/subreddit/detail', { params: data })

// 创建子版块
export const createSubreddit = (data) => request.post('/api/subreddit/create', data)

// 获取我创建的子版块
export const getMySubreddits = (data) => request.get('/api/subreddit/getCreateSu', data)

