const { conMysql } = require('../db/index')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config')

exports.regUser = async (req, res, next) => {
  try {
    const { username, email, password, avatar_url, bio } = req.body
    console.log(req.body)
    // 1. 校验
    if (!username || !email || !password) {
      return res.cc(false, '用户名、邮箱和密码不能为空', 400)
    }

    // 2. 检查用户名或邮箱是否已存在
    const checkSql = 'SELECT * FROM users WHERE username = ? OR email = ?'
    const users = await conMysql(checkSql, [username, email])

    if (users.length > 0) {
      return res.cc(false, '用户名或邮箱已被占用', 409)
    }

    // 3. 加密密码
    const hashedPassword = bcrypt.hashSync(password, 10)

    // 4. 插入用户
    const insertSql = `
      INSERT INTO users 
      (username, email, password_hash, avatar_url, bio)
      VALUES (?, ?, ?, ?, ?)
    `
    const result = await conMysql(insertSql, [
      username,
      email,
      hashedPassword,
      avatar_url || null,
      bio || null,
    ])

    if (result.affectedRows !== 1) {
      throw new Error('用户注册失败')
    }

    res.cc(true, '注册成功', 201)
  } catch (err) {
    next(err)
  }
}

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body
    console.log('参数',username,password)
    // 查找用户
    const sql = 'SELECT * FROM users WHERE username = ?'
    const result = await conMysql(sql, [username])

    if (result.length === 0) {
      return res.cc(false, '用户名不存在', 404)
    }

    const user = result[0]

    // 封禁校验（若迁移未执行，user_bans 表不存在会被忽略）
    try {
      const banRows = await conMysql(
        'SELECT status, banned_until FROM user_bans WHERE user_id = ? LIMIT 1',
        [user.id]
      )
      if (banRows && banRows.length > 0 && banRows[0].status === 'banned') {
        const until = banRows[0].banned_until ? new Date(banRows[0].banned_until) : null
        if (!until || (until && !Number.isNaN(until.getTime()) && until.getTime() > Date.now())) {
          return res.cc(false, '账号已被封禁', 403, { banned_until: banRows[0].banned_until || null })
        }
        // 到期自动解封
        await conMysql('UPDATE user_bans SET status = ?, updated_at = NOW() WHERE user_id = ?', ['active', user.id])
      }
    } catch (e) {
      if (!(e && e.code === 'ER_NO_SUCH_TABLE')) throw e
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash)
    if (!isMatch) {
      return res.cc(false, '密码错误', 401)
    }

    // 剔除敏感字段生成 token
    const { password_hash, ...userInfo } = user
    const tokenStr = 'Bearer ' + jwt.sign(userInfo, config.jwtSecretKey, {
      expiresIn: config.expiresIn,
    })

    res.cc(true, '登录成功', 200, userInfo, tokenStr)
  } catch (err) {
    next(err)
  }
}

// 按用户名关键字搜索用户（用于添加好友）
exports.searchUsers = async (req, res, next) => {
  try {
    const { username } = req.query
    if (!username || !username.trim()) {
      return res.cc(false, '请输入要搜索的用户名', 400)
    }

    // 模糊匹配用户名，最多返回 20 条
    const keyword = `%${username.trim()}%`
    const sql = `
      SELECT id, username, avatar_url
      FROM users
      WHERE username LIKE ?
      ORDER BY id DESC
      LIMIT 20
    `
    const rows = await conMysql(sql, [keyword])
    res.cc(true, '搜索用户成功', 200, rows)
  } catch (err) {
    next(err)
  }
}
