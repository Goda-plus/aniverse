const express = require('express')
const router = express.Router()
const voteHandler = require('../router_handler/vote')

// 添加或更新投票（帖子或评论）
router.post('/vote', voteHandler.vote)

// 取消投票
router.delete('/unvote', voteHandler.unvote)

// 获取某个帖子/评论的投票数
router.get('/count', voteHandler.getVoteStats)

//当前用户的投票列表
router.get('/votelist',voteHandler.getUserVoteStatus)

module.exports = router
