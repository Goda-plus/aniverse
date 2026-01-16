import request from './api_index'

// 切换子版块成员状态（加入/退出）
export const toggleMember = (data) => request.post('/api/subredditMember/toggle', data)

// 获取社区成员列表
export const getMembersBySubreddit = (data) => request.get('/api/subredditMember/list', { params: data })

// 更新成员角色
export const updateMemberRole = (data) => request.put('/api/subredditMember/role', data)

// 移除成员
export const removeMember = (data) => request.delete('/api/subredditMember/remove', { data })

