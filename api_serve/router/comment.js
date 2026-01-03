const express = require('express')
const router = express.Router()
const commentHandler = require('../router_handler/comment')
const expressJoi = require('@escook/express-joi')
const { create_comment_schema } = require('../schema/comment')

// 创建评论
router.post('/create', expressJoi(create_comment_schema), commentHandler.createComment)

// 获取指定帖子的评论列表
router.get('/list', commentHandler.getCommentsByPostId)

//获取分页的“顶级评论”列表（父评论）
router.get('/top',commentHandler.getTopLevelComments)

//获取指定父评论的子评论列表
router.get('/child',commentHandler.getRepliesByParentId)

// 删除评论（只允许作者本人删除）
router.delete('/delete', commentHandler.deleteComment)


module.exports = router
