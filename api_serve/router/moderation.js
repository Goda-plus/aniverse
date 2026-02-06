const express = require('express')
const router = express.Router()

const moderationHandler = require('../router_handler/moderation')

// 获取审核队列列表
router.get('/queue', moderationHandler.getModerationQueue)

// 获取审核队列详情
router.get('/queue/detail', moderationHandler.getModerationQueueDetail)

// 审核内容（批准或拒绝）
router.post('/review', moderationHandler.reviewContent)

// 分配审核任务
router.post('/assign', moderationHandler.assignModerationTask)

// 获取审核统计
router.get('/stats', moderationHandler.getModerationStats)

// 获取所有帖子（审核员专用）
router.get('/posts', moderationHandler.getAllPostsForModeration)

// 批量审核内容
router.post('/bulk-review', moderationHandler.bulkReviewContent)

// 敏感词管理
router.get('/sensitive-words', moderationHandler.getSensitiveWords)
router.post('/sensitive-words', moderationHandler.addSensitiveWord)
router.put('/sensitive-words', moderationHandler.updateSensitiveWord)
router.delete('/sensitive-words', moderationHandler.deleteSensitiveWord)

// 审核规则管理
router.get('/rules', moderationHandler.getModerationRules)
router.post('/rules', moderationHandler.addModerationRule)
router.put('/rules', moderationHandler.updateModerationRule)
router.delete('/rules', moderationHandler.deleteModerationRule)

// 用户审核统计
router.get('/user-stats', moderationHandler.getUserModerationStats)

module.exports = router
