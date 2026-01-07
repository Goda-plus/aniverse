const express = require('express')
const router = express.Router()
const genreHandler = require('../router_handler/genre')

// 获取所有分类（genres）
router.get('/list', genreHandler.getAllGenres)

// 根据分类获取社区列表
router.get('/subreddits', genreHandler.getSubredditsByGenre)

// 获取推荐社区
router.get('/recommended', genreHandler.getRecommendedSubreddits)

// 获取最受欢迎的社区
router.get('/popular', genreHandler.getPopularSubreddits)

module.exports = router

