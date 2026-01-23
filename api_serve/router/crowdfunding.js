const express = require('express')
const router = express.Router()

const crowdfundingHandler = require('../router_handler/crowdfunding')
const optionalAuth = require('../middleware/optionalAuth')

// 项目列表（支持筛选、分页）- 公开接口，但支持可选认证
router.get('/projects', optionalAuth, crowdfundingHandler.listProjects)

// 项目详情
router.get('/projects/:id', crowdfundingHandler.getProjectDetail)

// 创建项目（需要登录）
router.post('/projects', crowdfundingHandler.createProject)

// 更新项目（需要登录，项目创建者）
router.put('/projects/:id', crowdfundingHandler.updateProject)

// 提交项目审核（需要登录，项目创建者）
router.post('/projects/:id/submit', crowdfundingHandler.submitForReview)

// 档位管理（需要登录，项目创建者）
router.post('/tiers', crowdfundingHandler.addTier)
router.put('/tiers/:id', crowdfundingHandler.updateTier)
router.delete('/tiers/:id', crowdfundingHandler.deleteTier)

// 支持项目（需要登录）
router.post('/backings', crowdfundingHandler.backProject)

// 用户支持记录（需要登录）
router.get('/my-backings', crowdfundingHandler.getUserBackings)

// 项目更新（需要登录，项目创建者）
router.post('/updates', crowdfundingHandler.createUpdate)

// 获取项目更新列表
router.get('/projects/:project_id/updates', crowdfundingHandler.getProjectUpdates)

// 评论管理
router.get('/projects/:project_id/comments', crowdfundingHandler.getProjectComments)
router.post('/comments', crowdfundingHandler.addComment)

// 管理功能（需要登录）
router.get('/my-projects', crowdfundingHandler.getMyProjects)
router.get('/projects/:project_id/backers', crowdfundingHandler.getProjectBackers)

module.exports = router
