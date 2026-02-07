const express = require('express')
const router = express.Router()
const expressJoi = require('@escook/express-joi')
const multer = require('multer')
const path = require('path')

const optionalAuth = require('../middleware/optionalAuth')
const sceneMomentHandler = require('../router_handler/sceneMoments')
const {
  create_scene_moment_schema,
  toggle_like_schema,
  create_scene_comment_schema
} = require('../schema/sceneMoments')

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

// 列出某作品下的名场面（公开接口，支持可选登录态）
router.get('/media/:mediaId', optionalAuth, sceneMomentHandler.listByMedia)

// 名场面详情（公开接口，支持可选登录态）
router.get('/:id', optionalAuth, sceneMomentHandler.getDetail)

// 创建名场面（需要登录）
router.post('/create', expressJoi(create_scene_moment_schema), sceneMomentHandler.create)

// 点赞/取消点赞（需要登录）
router.post('/:id/like-toggle', expressJoi(toggle_like_schema), sceneMomentHandler.toggleLike)

// 评论列表（公开接口）
router.get('/:id/comments', sceneMomentHandler.listComments)

// 发表评论（需要登录）
router.post('/:id/comments', expressJoi(create_scene_comment_schema), sceneMomentHandler.createComment)

// 上传媒体文件（需要登录）
router.post('/upload', upload.single('media'), sceneMomentHandler.uploadMedia)

// 搜索名场面（公开接口，支持可选登录态）
router.get('/search', sceneMomentHandler.search)

module.exports = router


