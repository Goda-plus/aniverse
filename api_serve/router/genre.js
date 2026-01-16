const express = require('express')
const router = express.Router()
const genreHandler = require('../router_handler/genre')
const optionalAuth = require('../middleware/optionalAuth')

// 获取所有分类（genres）
router.get('/list', genreHandler.getAllGenres)

// 根据分类获取社区列表（可选认证：支持未登录访问，但登录后能获取用户相关信息）
router.get('/subreddits', optionalAuth, genreHandler.getSubredditsByGenre)

// 获取推荐社区（可选认证：支持未登录访问，但登录后能获取用户相关信息）
router.get('/recommended', optionalAuth, genreHandler.getRecommendedSubreddits)

// 获取最受欢迎的社区（可选认证：支持未登录访问，但登录后能获取用户相关信息）
router.get('/popular', optionalAuth, genreHandler.getPopularSubreddits)

module.exports = router

