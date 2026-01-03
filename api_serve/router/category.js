const express = require('express')
const router = express.Router()
const categoryHandler = require('../router_handler/category')
const expressJoi = require('@escook/express-joi')
const { create_category_schema } = require('../schema/category')


// 创建分类
router.post('/create' ,expressJoi(create_category_schema), categoryHandler.createCategory)

// 获取所有分类
router.get('/list', categoryHandler.getAllCategories)

module.exports = router
