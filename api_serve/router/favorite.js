const express = require('express')
const router = express.Router()
const expressJoi = require('@escook/express-joi')
const favoriteHandler = require('../router_handler/favorite')
const { toggle_favorite_schema } = require('../schema/favorite')

// 收藏或取消收藏（通用帖子/板块）
router.post('/toggle', expressJoi(toggle_favorite_schema), favoriteHandler.toggleFavorite)

// 获取用户的收藏列表（帖子或板块）
router.get('/list', favoriteHandler.getFavorites)

module.exports = router
