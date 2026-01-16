const express = require('express')
const router = express.Router()
const expressJoi = require('@escook/express-joi')
const favoriteHandler = require('../router_handler/favorite')
const { toggle_favorite_schema, check_favorites_batch_schema } = require('../schema/favorite')

// 收藏或取消收藏（通用帖子/板块）
router.post('/toggle', expressJoi(toggle_favorite_schema), favoriteHandler.toggleFavorite)

// 检查是否已收藏
router.get('/check', favoriteHandler.checkFavorite)

// 批量检查收藏状态
router.post('/check-batch', expressJoi(check_favorites_batch_schema), favoriteHandler.checkFavoritesBatch)

// 获取用户的收藏列表（帖子或板块）
router.get('/list', favoriteHandler.getFavorites)

module.exports = router
