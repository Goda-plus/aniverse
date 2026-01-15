const express = require('express')
const router = express.Router()
const tagsHandler = require('../router_handler/tags')

// 获取标签列表
router.get('/list', tagsHandler.getTagsList)

// 获取标签详情
router.get('/detail/:id', tagsHandler.getTagDetail)

// 创建标签
router.post('/create', tagsHandler.createTag)

// 更新标签
router.put('/update/:id', tagsHandler.updateTag)

// 删除标签
router.delete('/delete/:id', tagsHandler.deleteTag)

// 获取标签下的媒体列表
router.get('/:id/media', tagsHandler.getTagMedia)

module.exports = router

