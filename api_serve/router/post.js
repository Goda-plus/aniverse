const express = require('express')
const router = express.Router()
const expressJoi = require('@escook/express-joi')
const postHandler = require('../router_handler/post')
const { create_post_schema } = require('../schema/post')

// 创建帖子（支持独立/板块）
router.post('/create',  expressJoi(create_post_schema), postHandler.createPost)

// 获取帖子列表（可带 subreddit_id 参数）
router.get('/list', postHandler.getPostsBySubredditWithUserAndStats)

router.get('/listwu',postHandler.getAllPostsWithUserAndStats)

router.get('/GuestPostDetail',postHandler.getGuestPostDetail)

router.get('/getUserPostDetail',postHandler.getUserPostDetail)

router.get('/upvoted', postHandler.getUpvotedPosts)

router.get('/downvoted', postHandler.getDownvotedPosts)

router.get('/commented', postHandler.getCommentedPosts)

//帖子图片上传
const multer = require('multer')
const path = require('path')

// 设置存储方式
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/')) // 上传到api_server/uploads目录
  },
  filename: function (req, file, cb) {
    // 文件名唯一
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext)
  }
})
const upload = multer({ storage })

router.post('/upload-image', upload.single('image'), postHandler.uploadImage)

// 帖子视频上传
router.post('/upload-video', upload.single('video'), postHandler.uploadVideo)

// 获取当前用户的帖子（带分页）
router.get('/me', postHandler.getCurrentUserPosts)

// 删除帖子（只允许作者本人删除）
router.delete('/delete', postHandler.deletePost)

module.exports = router
