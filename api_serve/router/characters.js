const express = require('express')
const router = express.Router()
const charactersHandler = require('../router_handler/characters')

// 获取角色列表
router.get('/list', charactersHandler.getCharactersList)

// 获取角色详情
router.get('/detail/:id', charactersHandler.getCharacterDetail)

// 创建角色
router.post('/create', charactersHandler.createCharacter)

// 更新角色
router.put('/update/:id', charactersHandler.updateCharacter)

// 删除角色
router.delete('/delete/:id', charactersHandler.deleteCharacter)

// 获取角色参与的媒体列表
router.get('/:id/media', charactersHandler.getCharacterMedia)

module.exports = router

