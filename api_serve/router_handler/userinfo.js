const { conMysql } = require('../db/index')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config')

// 获取用户信息
exports.getUserInfo = async (req, res, next) => {
  try {
    const userId = req.user.id

    const sql = 'SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id = ?'
    const result = await conMysql(sql, [userId])

    if (result.length === 0) {
      return res.cc(false, '用户不存在', 404)
    }

    res.cc(true, '获取用户信息成功', 200, result[0])
  } catch (err) {
    next(err)
  }
}

// 更新用户信息
exports.updateUserInfo = async (req, res, next) => {
  try {
    const { email, avatar_url, bio } = req.query
    const userId = req.user.id

    const sql = 'UPDATE users SET email = ?, avatar_url = ?, bio = ? WHERE id = ?'
    const result = await conMysql(sql, [email, avatar_url, bio, userId])

    if (result.affectedRows !== 1) {
      return res.cc(false, '更新用户信息失败', 400)
    }

    // 更新成功后重新签发 token
    const [newUser] = await conMysql('SELECT * FROM users WHERE id = ?', [userId])
    const { password_hash, ...userInfo } = newUser

    const tokenStr = 'Bearer ' + jwt.sign(userInfo, config.jwtSecretKey, {
      expiresIn: config.expiresIn,
    })

    res.cc(true, '更新用户信息成功', 200, userInfo, tokenStr)
  } catch (error) {
    next(error)
  }
}

// 更新密码
exports.updatePassword = async (req, res, next) => {
  try {
    const { oldPwd, newPwd } = req.query
    const userId = req.user.id

    // 查询用户信息
    const sql = 'SELECT * FROM users WHERE id = ?'
    const result = await conMysql(sql, [userId])

    if (result.length === 0) {
      return res.cc(false, '用户不存在', 404)
    }

    const user = result[0]
    const isPasswordValid = bcrypt.compareSync(oldPwd, user.password_hash)

    if (!isPasswordValid) {
      return res.cc(false, '旧密码错误', 401)
    }

    // 加密新密码并更新
    const newHash = bcrypt.hashSync(newPwd, 10)
    const updateSql = 'UPDATE users SET password_hash = ? WHERE id = ?'
    const updateResult = await conMysql(updateSql, [newHash, userId])

    if (updateResult.affectedRows !== 1) {
      return res.cc(false, '更新密码失败', 400)
    }

    res.cc(true, '更新密码成功', 200)
  } catch (error) {
    next(error)
  }
}

// 更新用户头像（支持文件上传和URL）
exports.updateAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id
    let avatar_url = null

    // 如果上传了文件，使用文件路径
    if (req.file) {
      // 文件已通过multer中间件处理，保存在uploads目录
      avatar_url = `/uploads/${req.file.filename}`
    } else if (req.body && req.body.avatar_url) {
      // 如果没有文件，使用body中的avatar_url（兼容旧接口）
      avatar_url = req.body.avatar_url
    } else {
      return res.cc(false, '请上传头像文件或提供头像链接', 400)
    }

    const sql = 'UPDATE users SET avatar_url = ? WHERE id = ?'
    const result = await conMysql(sql, [avatar_url, userId])
    
    if (result.affectedRows !== 1) {
      return res.cc(false, '更新头像失败', 400)
    }

    // 更新成功后重新签发 token
    const [newUser] = await conMysql('SELECT * FROM users WHERE id = ?', [userId])
    const { password_hash, ...userInfo } = newUser

    const tokenStr = 'Bearer ' + jwt.sign(userInfo, config.jwtSecretKey, {
      expiresIn: config.expiresIn,
    })

    res.cc(true, '头像更新成功', 200, { avatar_url: userInfo.avatar_url }, tokenStr)
  } catch (error) {
    next(error)
  }
}
