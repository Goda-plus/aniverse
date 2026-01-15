const express = require('express')
const router = express.Router()
const mediaGenresHandler = require('../router_handler/mediaGenres')

// 获取所有类型列表
router.get('/list', mediaGenresHandler.getGenresList)

// 获取类型详情
router.get('/detail/:id', mediaGenresHandler.getGenreDetail)

// 创建类型
router.post('/create', mediaGenresHandler.createGenre)

// 更新类型
router.put('/update/:id', mediaGenresHandler.updateGenre)

// 删除类型
router.delete('/delete/:id', mediaGenresHandler.deleteGenre)

// 获取类型下的媒体列表
router.get('/:id/media', mediaGenresHandler.getGenreMedia)

module.exports = router

