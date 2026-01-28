const express = require('express')
const router = express.Router()
const userInterestHandler = require('../router_handler/userInterest')
const authenticateToken = require('../middleware/optionalAuth')

// 获取用户兴趣标签列表
router.get('/interests', authenticateToken, userInterestHandler.getUserInterests)

// 添加兴趣标签
router.post('/interests', authenticateToken, userInterestHandler.addUserInterest)

// 批量添加兴趣标签
router.post('/interests/batch', authenticateToken, userInterestHandler.batchAddInterests)

// 删除兴趣标签
router.delete('/interests/:tag_id', authenticateToken, userInterestHandler.removeUserInterest)

// 更新兴趣标签权重
router.put('/interests/:tag_id/weight', authenticateToken, userInterestHandler.updateInterestWeight)

// 获取推荐标签
router.get('/interests/recommended', authenticateToken, userInterestHandler.getRecommendedTags)

module.exports = router

