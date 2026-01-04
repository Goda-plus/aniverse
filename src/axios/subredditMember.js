import request from './api_index'

// 切换子版块成员状态（加入/退出）
export const toggleMember = (data) => request.post('/api/subredditMember/toggle', data)

