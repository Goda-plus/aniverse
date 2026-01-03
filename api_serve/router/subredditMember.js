const express = require('express')
const router = express.Router()
const memberHandler = require('../router_handler/subredditMember')
const expressJoi = require('@escook/express-joi')
const { add_member_schema } = require('../schema/subredditMember')

// 添加成员
router.post('/add', expressJoi(add_member_schema), memberHandler.addMember)

// 获取板块成员列表
router.get('/list', memberHandler.getMembersBySubreddit)

// 加入/退出板块切换
router.post('/toggle',memberHandler.toggleMember)


module.exports = router
