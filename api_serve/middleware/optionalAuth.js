const jwt = require('jsonwebtoken')
const config = require('../config')

// 可选认证中间件：如果有 token 就解析，没有也不报错
module.exports = (req, res, next) => {
  // 从请求头中获取 token
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.headers.authorization?.replace('bearer ', '')
  
  if (!token) {
    // 没有 token，直接继续，不设置 req.user
    return next()
  }

  try {
    // 有 token，尝试解析
    const decoded = jwt.verify(token, config.jwtSecretKey)
    // 将解析后的用户信息挂载到 req.user 上
    req.user = decoded
    next()
  } catch (err) {
    // token 无效，但不报错，继续执行（当作未登录用户）
    // 可以选择记录日志，但不阻止请求
    console.log('Optional auth failed:', err.message)
    next()
  }
}

