import request from './api_index'

// 管理员认证相关
export const adminLogin = (data) => request.post('/api/admin/auth/login', data)
export const adminRegister = (data) => request.post('/api/admin/auth/register', data)
export const adminLogout = () => request.post('/api/admin/auth/logout')
export const getCurrentAdmin = () => request.get('/api/admin/auth/me')
export const changePassword = (data) => request.put('/api/admin/auth/change-password', data)

// 管理员管理
export const getAdminList = (params) => request.get('/api/admin/admins', { params })
export const createAdmin = (data) => request.post('/api/admin/admins', data)
export const updateAdminStatus = (id, data) => request.put(`/api/admin/admins/${id}/status`, data)
export const resetAdminPassword = (id, data) => request.put(`/api/admin/admins/${id}/reset-password`, data)

// 角色管理
export const getRoleList = () => request.get('/api/admin/roles')
export const getRoleDetail = (id) => request.get(`/api/admin/roles/${id}`)
export const createRole = (data) => request.post('/api/admin/roles', data)
export const updateRole = (id, data) => request.put(`/api/admin/roles/${id}`, data)
export const deleteRole = (id) => request.delete(`/api/admin/roles/${id}`)

// 系统设置
export const getSystemSettings = () => request.get('/api/admin/settings')
export const updateSystemSetting = (data) => request.put('/api/admin/settings', data)

// 操作日志
export const getAdminLogs = (params) => request.get('/api/admin/logs', { params })





