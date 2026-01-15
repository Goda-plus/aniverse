const express = require('express')
const router = express.Router()
const voiceActorsHandler = require('../router_handler/voiceActors')

// 获取声优列表
router.get('/list', voiceActorsHandler.getVoiceActorsList)

// 获取声优详情
router.get('/detail/:id', voiceActorsHandler.getVoiceActorDetail)

// 创建声优
router.post('/create', voiceActorsHandler.createVoiceActor)

// 更新声优
router.put('/update/:id', voiceActorsHandler.updateVoiceActor)

// 删除声优
router.delete('/delete/:id', voiceActorsHandler.deleteVoiceActor)

// 获取声优配音的角色列表
router.get('/:id/characters', voiceActorsHandler.getVoiceActorCharacters)

module.exports = router

