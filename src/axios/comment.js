import request from './api_index'

// 根据帖子ID获取评论
export const getCommentsByPostId = (data) => request.get('/api/comment/list', { params: data })

// 创建评论
export const createComment = (data) => request.post('/api/comment/create', data)

// 获取顶级评论
export const getTopLevelComments = (data) => request.get('/api/comment/top', { params: data })

// 获取评论树（一次获取20条顶级评论及其所有子孙评论）
export const getCommentTree = (data) => request.get('/api/comment/tree', { params: data })

// 根据父评论ID获取回复
export const getRepliesByParentId = (data) => request.get('/api/comment/child', { params: data })

// 删除评论
export const deleteComment = (comment_id) => request.delete('/api/comment/delete', { data: { comment_id } })

// 获取当前用户的评论列表（带分页）
export const getUserComments = (data) => request.get('/api/comment/user', { params: data })

