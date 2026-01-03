const express = require('express')
const router = express.Router()

// 导入用户信息处理函数模块
const userinfo_handler = require('../router_handler/userinfo')

// 验证规则和中间件
const expressJoi = require('@escook/express-joi')
const {
  update_userinfo_schema,
  update_password_schema,
} = require('../schema/user')

// 获取用户信息
router.get('/userinfo', userinfo_handler.getUserInfo)

// 更新用户信息
router.post('/userinfo', expressJoi( update_userinfo_schema ), userinfo_handler.updateUserInfo)

// 更新密码
router.post('/updatepwd', expressJoi( update_password_schema ), userinfo_handler.updatePassword)

// 更新用户头像
router.post('/update-avatar', userinfo_handler.updateAvatar)

module.exports = router
