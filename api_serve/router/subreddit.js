const express = require('express')
const router = express.Router()
const optionalAuth = require('../middleware/optionalAuth')

// 控制器
const subredditHandler = require('../router_handler/subreddit')

// 表单验证中间件
const expressJoi = require('@escook/express-joi')

// 验证规则
const { create_subreddit_schema } = require('../schema/subreddit')

// 创建板块
router.post('/create', expressJoi(create_subreddit_schema), subredditHandler.createSubreddit)

// 获取全部板块
router.get('/list', subredditHandler.getAllSubreddits)

// 搜索板块
router.get('/search', subredditHandler.searchSubredditsByName)

// 获取某分类下的板块
router.get('/sortlist', subredditHandler.getSubredditsByCategory)

// 获取板块详情
router.get('/detail', optionalAuth, subredditHandler.getSubredditDetail)

//获得用户创建的板块
router.get('/getCreateSu',subredditHandler.getMySubreddits)

// 解散/删除板块
router.delete('/:id', subredditHandler.deleteSubreddit)

module.exports = router
