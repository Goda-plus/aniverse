const express = require('express')
const router = express.Router()

const userHandler = require('../router_handler/user')

// 表单验证中间件 & 规则
const expressJoi = require('@escook/express-joi')
const { reg_login_schema } = require('../schema/user')

// 注册用户
router.post('/register', expressJoi(reg_login_schema), userHandler.regUser)

// 登录用户
router.post('/login', expressJoi(reg_login_schema), userHandler.login)

// 搜索用户（按用户名关键字，需登录）
router.get('/search', userHandler.searchUsers)

module.exports = router
