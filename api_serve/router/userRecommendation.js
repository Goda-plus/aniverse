const express = require('express')
const router = express.Router()
const userRecommendationHandler = require('../router_handler/userRecommendation')
const authenticateToken = require('../middleware/optionalAuth')

// 获取推荐列表
router.get('/recommendations', authenticateToken, userRecommendationHandler.getRecommendations)

// 刷新推荐列表
router.post('/recommendations/refresh', authenticateToken, userRecommendationHandler.refreshRecommendations)

// 忽略推荐
router.post('/recommendations/:recommended_user_id/dismiss', authenticateToken, userRecommendationHandler.dismissRecommendation)

// 获取与指定用户的相似度
router.get('/similarity/:user_id_2', authenticateToken, userRecommendationHandler.getUserSimilarity)

// 管理员接口：手动执行相似度计算
router.post('/admin/similarity/calculate', authenticateToken, userRecommendationHandler.manualSimilarityCalculation)

// 管理员接口：手动更新推荐列表
router.post('/admin/recommendations/update', authenticateToken, userRecommendationHandler.manualRecommendationUpdate)

module.exports = router

