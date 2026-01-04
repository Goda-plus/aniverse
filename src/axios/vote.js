import request from './api_index'

// 获取用户投票状态
export const getUserVoteStatus = (data) => request.get('/api/vote/votelist', { params: data })

// 用户投票
export const userVote = (data) => request.post('/api/vote/vote', data)

// 获取投票统计
export const getVoteStats = (data) => request.get('/api/vote/count', { params: data })

