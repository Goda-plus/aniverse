const express = require('express')
const router = express.Router()
const adminHandler = require('../router_handler/admin')
const adminRoleHandler = require('../router_handler/adminRole')
const checkPermission = require('../middleware/checkPermission')
const moderationHandler = require('../router_handler/moderation')
const adminUserHandler = require('../router_handler/adminUser')
const adminSystemHandler = require('../router_handler/adminSystem')
const adminContentHandler = require('../router_handler/adminContent')
const adminMallHandler = require('../router_handler/adminMall')
const adminCrowdfundingHandler = require('../router_handler/adminCrowdfunding')
const adminStatsHandler = require('../router_handler/adminStats')

// ============================================
// 认证相关接口（不需要权限校验，但登录需要JWT）
// ============================================

// 管理员注册（公开接口）
router.post('/auth/register', adminHandler.register)

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

// 更新管理员信息（包括角色）
router.put('/admins/:id', checkPermission('admin.manage'), adminHandler.updateAdmin)

// 删除管理员
router.delete('/admins/:id', checkPermission('admin.manage'), adminHandler.deleteAdmin)

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

// ============================================
// 系统设置 & 操作日志（需要 statistics.read 或 admin.manage）
// ============================================
router.get('/settings', checkPermission('admin.manage'), adminSystemHandler.listSettings)
router.put('/settings', checkPermission('admin.manage'), adminSystemHandler.upsertSetting)
router.get('/logs', checkPermission('statistics.read'), adminSystemHandler.listAdminLogs)

// ============================================
// 用户管理（user.read / user.ban）
// ============================================
router.get('/users', checkPermission('user.read'), adminUserHandler.listUsers)
router.get('/users/:id', checkPermission('user.read'), adminUserHandler.getUserDetail)
router.put('/users/:id/ban', checkPermission('user.ban'), adminUserHandler.banOrUnbanUser)

// ============================================
// 内容运营管理（审核队列/敏感词/规则/举报反馈）
// ============================================
// 审核队列（使用现有 moderation handler，增加权限保护）
router.get('/moderation/queue', checkPermission('post.review'), moderationHandler.getModerationQueue)
router.get('/moderation/queue/detail', checkPermission('post.review'), moderationHandler.getModerationQueueDetail)
router.post('/moderation/review', checkPermission('post.review'), moderationHandler.reviewContent)
router.post('/moderation/assign', checkPermission('post.review'), moderationHandler.assignModerationTask)
router.get('/moderation/stats', checkPermission('statistics.read'), moderationHandler.getModerationStats)
router.get('/moderation/posts', checkPermission('post.review'), moderationHandler.getAllPostsForModeration)
router.post('/moderation/bulk-review', checkPermission('post.review'), moderationHandler.bulkReviewContent)

// 敏感词库（sensitive_word.manage）
router.get('/moderation/sensitive-words', checkPermission('sensitive_word.manage'), moderationHandler.getSensitiveWords)
router.post('/moderation/sensitive-words', checkPermission('sensitive_word.manage'), moderationHandler.addSensitiveWord)
router.put('/moderation/sensitive-words', checkPermission('sensitive_word.manage'), moderationHandler.updateSensitiveWord)
router.delete('/moderation/sensitive-words', checkPermission('sensitive_word.manage'), moderationHandler.deleteSensitiveWord)

// 审核规则（sensitive_word.manage 复用同一权限）
router.get('/moderation/rules', checkPermission('sensitive_word.manage'), moderationHandler.getModerationRules)
router.post('/moderation/rules', checkPermission('sensitive_word.manage'), moderationHandler.addModerationRule)
router.put('/moderation/rules', checkPermission('sensitive_word.manage'), moderationHandler.updateModerationRule)
router.delete('/moderation/rules', checkPermission('sensitive_word.manage'), moderationHandler.deleteModerationRule)

// 举报与反馈（report.read / report.handle）
router.get('/reports', checkPermission('report.read'), adminContentHandler.listReports)
router.put('/reports/:id/handle', checkPermission('report.handle'), adminContentHandler.handleReport)
router.get('/feedback', checkPermission('report.read'), adminContentHandler.listFeedback)
router.put('/feedback/:id/handle', checkPermission('report.handle'), adminContentHandler.handleFeedback)

// ============================================
// 电商运营管理（商品/订单/评价）
// ============================================
router.get('/mall/products', checkPermission('product.read'), adminMallHandler.listProducts)
router.put('/mall/products/:id', checkPermission('product.manage'), adminMallHandler.updateProduct)
router.get('/mall/orders', checkPermission('order.read'), adminMallHandler.listOrders)
router.put('/mall/orders/:id/status', checkPermission('order.ship'), adminMallHandler.updateOrderStatus)
router.get('/mall/reviews', checkPermission('product.read'), adminMallHandler.listReviews)
router.put('/mall/reviews/:id/approve', checkPermission('product.manage'), adminMallHandler.approveReview)

// 众筹审核（复用 product.manage 权限）
router.get('/crowdfunding/projects', checkPermission('product.manage'), adminCrowdfundingHandler.listProjects)
router.put('/crowdfunding/projects/:id/review', checkPermission('product.manage'), adminCrowdfundingHandler.reviewProject)

// ============================================
// 数据统计与分析（statistics.read）
// ============================================
router.get('/stats/overview', checkPermission('statistics.read'), adminStatsHandler.getOverview)

module.exports = router

