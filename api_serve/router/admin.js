const express = require('express')
const router = express.Router()
const adminHandler = require('../router_handler/admin')
const adminRoleHandler = require('../router_handler/adminRole')
const checkPermission = require('../middleware/checkPermission')

// ============================================
// 认证相关接口（不需要权限校验，但登录需要JWT）
// ============================================

// 管理员登录（公开接口）
router.post('/auth/login', adminHandler.login)

// 管理员退出（需要登录）
router.post('/auth/logout', adminHandler.logout)

// 修改密码（需要登录）
router.put('/auth/change-password', adminHandler.changePassword)

// 获取当前管理员信息（需要登录）
router.get('/auth/me', adminHandler.getCurrentAdmin)

// 获取当前管理员权限（供前端动态渲染菜单）
router.get('/auth/permissions', adminHandler.getCurrentAdmin)

// ============================================
// 管理员管理接口（需要 admin.manage 权限）
// ============================================

// 获取管理员列表
router.get('/admins', checkPermission('admin.manage'), adminHandler.getAdminList)

// 创建管理员
router.post('/admins', checkPermission('admin.manage'), adminHandler.createAdmin)

// 更新管理员状态（启用/禁用）
router.put('/admins/:id/status', checkPermission('admin.manage'), adminHandler.updateAdminStatus)

// 重置管理员密码
router.put('/admins/:id/reset-password', checkPermission('admin.manage'), adminHandler.resetAdminPassword)

// ============================================
// 角色管理接口（需要 role.manage 权限）
// ============================================

// 获取角色列表
router.get('/roles', checkPermission('role.manage'), adminRoleHandler.getRoleList)

// 获取角色详情
router.get('/roles/:id', checkPermission('role.manage'), adminRoleHandler.getRoleDetail)

// 创建角色
router.post('/roles', checkPermission('role.manage'), adminRoleHandler.createRole)

// 更新角色
router.put('/roles/:id', checkPermission('role.manage'), adminRoleHandler.updateRole)

// 删除角色
router.delete('/roles/:id', checkPermission('role.manage'), adminRoleHandler.deleteRole)

module.exports = router

