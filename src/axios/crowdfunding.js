import request from './api_index'

// ==================== 项目 ====================
// 获取众筹项目列表（支持筛选、分页）
export const listCrowdfundingProjects = (params) => request.get('/api/crowdfunding/projects', { params })

// 获取众筹项目详情
export const getCrowdfundingProjectDetail = (id) => request.get(`/api/crowdfunding/projects/${id}`)

// 创建众筹项目（需登录）
export const createCrowdfundingProject = (data) => request.post('/api/crowdfunding/projects', data)

// 更新众筹项目（需登录，创建者）
export const updateCrowdfundingProject = (id, data) => request.put(`/api/crowdfunding/projects/${id}`, data)

// 提交审核（需登录，创建者）
export const submitCrowdfundingProjectForReview = (id) => request.post(`/api/crowdfunding/projects/${id}/submit`)

// 获取我创建的项目（需登录）
export const getMyCrowdfundingProjects = (params) => request.get('/api/crowdfunding/my-projects', { params })

// 获取项目支持者列表（需登录，创建者）
export const getCrowdfundingProjectBackers = (projectId, params) =>
  request.get(`/api/crowdfunding/projects/${projectId}/backers`, { params })

// 获取发起人统计（公开）
export const getCrowdfundingCreatorStats = (creatorId) =>
  request.get(`/api/crowdfunding/creators/${creatorId}/stats`)

// ==================== 档位 ====================
export const addCrowdfundingTier = (data) => request.post('/api/crowdfunding/tiers', data)
export const updateCrowdfundingTier = (id, data) => request.put(`/api/crowdfunding/tiers/${id}`, data)
export const deleteCrowdfundingTier = (id) => request.delete(`/api/crowdfunding/tiers/${id}`)

// ==================== 支持/回报 ====================
// 支持项目（需登录）
export const backCrowdfundingProject = (data) => request.post('/api/crowdfunding/backings', data)

// 获取我的支持记录（需登录）
export const getMyCrowdfundingBackings = (params) => request.get('/api/crowdfunding/my-backings', { params })

// ==================== 项目更新 ====================
// 创建项目更新（需登录，创建者）
export const createCrowdfundingUpdate = (data) => request.post('/api/crowdfunding/updates', data)

// 获取项目更新列表（公开）
export const listCrowdfundingProjectUpdates = (projectId, params) =>
  request.get(`/api/crowdfunding/projects/${projectId}/updates`, { params })

// ==================== 评论 ====================
// 获取项目评论（公开）
export const listCrowdfundingProjectComments = (projectId, params) =>
  request.get(`/api/crowdfunding/projects/${projectId}/comments`, { params })

// 添加评论（需登录）
export const addCrowdfundingComment = (data) => request.post('/api/crowdfunding/comments', data)


