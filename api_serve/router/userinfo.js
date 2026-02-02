const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')

// 导入用户信息处理函数模块
const userinfo_handler = require('../router_handler/userinfo')
const userTheme_handler = require('../router_handler/userTheme')

// 验证规则和中间件
const expressJoi = require('@escook/express-joi')
const {
  update_userinfo_schema,
  update_password_schema,
} = require('../schema/user')
const {
  update_theme_schema,
  apply_preset_schema,
} = require('../schema/userTheme')

// 配置multer用于头像上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'))
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext)
  }
})

const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只能上传图片文件'), false)
    }
  }
})

// 获取用户信息
router.get('/userinfo', userinfo_handler.getUserInfo)

// 更新用户信息
router.post('/userinfo', expressJoi( update_userinfo_schema ), userinfo_handler.updateUserInfo)

// 更新密码
router.post('/updatepwd', expressJoi( update_password_schema ), userinfo_handler.updatePassword)

// 更新用户头像（支持文件上传）
router.post('/update-avatar', upload.single('avatar'), userinfo_handler.updateAvatar)

// 获取用户主题设置
router.get('/theme', userTheme_handler.getUserTheme)

// 更新用户主题设置
router.post('/theme', expressJoi(update_theme_schema), userTheme_handler.updateUserTheme)

// 重置为默认主题设置
router.post('/theme/reset', userTheme_handler.resetUserTheme)

// 应用预置主题
router.post('/theme/preset', expressJoi(apply_preset_schema), userTheme_handler.applyPresetTheme)

module.exports = router
