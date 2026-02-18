const db = require('../db/index')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config')

// 管理员注册（公开接口）
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.cc(false, '用户名和密码不能为空', 400)
    }

    if (password.length < 6) {
      return res.cc(false, '密码长度不能少于6位', 400)
    }

    // 检查用户名是否已存在
    const checkSql = 'SELECT id FROM admins WHERE username = ?'
    const checkResult = await db.conMysql(checkSql, [username])

    if (checkResult.length > 0) {
      return res.cc(false, '用户名已存在', 400)
    }

    // 查找默认角色（普通管理员角色，如果没有则使用第一个角色）
    let roleSql = `
      SELECT id FROM admin_roles 
      WHERE name = '普通管理员' 
      LIMIT 1
    `
    let roleResult = await db.conMysql(roleSql, [])

    // 如果没有普通管理员角色，则查找第一个角色
    if (roleResult.length === 0) {
      roleSql = 'SELECT id FROM admin_roles ORDER BY id ASC LIMIT 1'
      roleResult = await db.conMysql(roleSql, [])
    }

    // 如果仍然没有角色，返回错误
    if (roleResult.length === 0) {
      return res.cc(false, '系统中没有可用的角色，请联系管理员', 400)
    }

    const roleId = roleResult[0].id

    // 加密密码
    const hashedPassword = bcrypt.hashSync(password, 10)

    // 插入管理员（默认状态为active）
    const insertSql = `
      INSERT INTO admins (username, password, role_id, status)
      VALUES (?, ?, ?, 'active')
    `
    const insertResult = await db.conMysql(insertSql, [username, hashedPassword, roleId])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                     'unknown'

  

    res.cc(true, '注册成功', 200, { id: insertResult.insertId, username })
  } catch (err) {
    console.error('管理员注册错误:', err)
    res.cc(false, '注册失败', 500)
  }
}

// 管理员登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.cc(false, '用户名和密码不能为空', 400)
    }

    // 查询管理员信息（包含角色信息）
    const sql = `
      SELECT 
        a.id, 
        a.username, 
        a.password, 
        a.role_id, 
        a.status,
        a.last_login_time,
        a.last_login_ip,
        ar.name as role_name,
        ar.permissions
      FROM admins a
      LEFT JOIN admin_roles ar ON a.role_id = ar.id
      WHERE a.username = ?
    `
    const results = await db.conMysql(sql, [username])

    if (results.length === 0) {
      return res.cc(false, '用户名或密码错误', 401)
    }

    const admin = results[0]

    // 检查账号状态
    if (admin.status === 'disabled') {
      return res.cc(false, '账号已被禁用', 403)
    }

    // 验证密码
    const isPasswordValid = bcrypt.compareSync(password, admin.password)
    if (!isPasswordValid) {
      return res.cc(false, '用户名或密码错误', 401)
    }

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                     'unknown'

    // 更新登录时间和IP
    const updateSql = `
      UPDATE admins 
      SET last_login_time = NOW(), 
          last_login_ip = ?,
          updated_at = NOW()
      WHERE id = ?
    `
    await db.conMysql(updateSql, [clientIp, admin.id])

    // 记录登录日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, description, ip_address)
      VALUES (?, 'login', ?, ?)
    `
    await db.conMysql(logSql, [admin.id, `管理员 ${username} 登录系统`, clientIp])

    // 解析权限JSON
    let permissions = []
    try {
      permissions = JSON.parse(admin.permissions || '[]')
    } catch (e) {
      permissions = []
    }

    // 生成token（包含管理员ID、角色ID和权限）
    const adminInfo = {
      id: admin.id,
      username: admin.username,
      role_id: admin.role_id,
      role_name: admin.role_name,
      permissions: permissions
    }

    const tokenStr = 'Bearer ' + jwt.sign(adminInfo, config.jwtSecretKey, {
      expiresIn: config.expiresIn
    })

    // 返回数据（不包含密码）
    delete admin.password
    admin.permissions = permissions

    res.cc(true, '登录成功', 200, adminInfo, tokenStr)
  } catch (err) {
    console.error('管理员登录错误:', err)
    res.cc(false, '登录失败', 500)
  }
}

// 管理员退出（记录日志）
exports.logout = async (req, res) => {
  try {
    const adminId = req.user?.id
    const username = req.user?.username || 'unknown'

    if (adminId) {
      // 获取客户端IP
      const clientIp = req.headers['x-forwarded-for'] || 
                       req.headers['x-real-ip'] || 
                       req.connection.remoteAddress || 
                       'unknown'

      // 记录退出日志
      const logSql = `
        INSERT INTO admin_logs (admin_id, action_type, description, ip_address)
        VALUES (?, 'logout', ?, ?)
      `
      await db.conMysql(logSql, [adminId, `管理员 ${username} 退出系统`, clientIp])
    }

    res.cc(true, '退出成功', 200)
  } catch (err) {
    console.error('管理员退出错误:', err)
    res.cc(false, '退出失败', 500)
  }
}

// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const adminId = req.user?.id
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.cc(false, '旧密码和新密码不能为空', 400)
    }

    if (newPassword.length < 6) {
      return res.cc(false, '新密码长度不能少于6位', 400)
    }

    // 查询当前管理员信息
    const sql = 'SELECT id, username, password FROM admins WHERE id = ?'
    const results = await db.conMysql(sql, [adminId])

    if (results.length === 0) {
      return res.cc(false, '管理员不存在', 404)
    }

    const admin = results[0]

    // 验证旧密码
    const isPasswordValid = bcrypt.compareSync(oldPassword, admin.password)
    if (!isPasswordValid) {
      return res.cc(false, '旧密码错误', 401)
    }

    // 加密新密码
    const hashedPassword = bcrypt.hashSync(newPassword, 10)

    // 更新密码
    const updateSql = 'UPDATE admins SET password = ?, updated_at = NOW() WHERE id = ?'
    await db.conMysql(updateSql, [hashedPassword, adminId])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'

    // 记录操作日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, description, ip_address)
      VALUES (?, 'change_password', ?, ?)
    `
    await db.conMysql(logSql, [adminId, `管理员 ${admin.username} 修改密码`, clientIp])

    res.cc(true, '密码修改成功', 200)
  } catch (err) {
    console.error('修改密码错误:', err)
    res.cc(false, '密码修改失败', 500)
  }
}

// 获取当前管理员信息（包含权限）
exports.getCurrentAdmin = async (req, res) => {
  try {
    const adminId = req.user?.id

    if (!adminId) {
      return res.cc(false, '未登录', 401)
    }

    // 查询管理员信息（包含角色信息）
    const sql = `
      SELECT 
        a.id, 
        a.username, 
        a.role_id, 
        a.status,
        a.last_login_time,
        a.last_login_ip,
        a.created_at,
        ar.name as role_name,
        ar.description as role_description,
        ar.permissions
      FROM admins a
      LEFT JOIN admin_roles ar ON a.role_id = ar.id
      WHERE a.id = ?
    `
    const results = await db.conMysql(sql, [adminId])

    if (results.length === 0) {
      return res.cc(false, '管理员不存在', 404)
    }

    const admin = results[0]

    // 解析权限JSON
    let permissions = []
    try {
      permissions = JSON.parse(admin.permissions || '[]')
    } catch (e) {
      permissions = []
    }

    // 返回数据（不包含密码）
    const adminInfo = {
      id: admin.id,
      username: admin.username,
      role_id: admin.role_id,
      role_name: admin.role_name,
      role_description: admin.role_description,
      status: admin.status,
      last_login_time: admin.last_login_time,
      last_login_ip: admin.last_login_ip,
      created_at: admin.created_at,
      permissions: permissions
    }

    res.cc(true, '获取成功', 200, adminInfo)
  } catch (err) {
    console.error('获取管理员信息错误:', err)
    res.cc(false, '获取失败', 500)
  }
}

// 获取管理员列表（需要权限）
exports.getAdminList = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, username, status, role_id } = req.query
    const offset = (page - 1) * pageSize

    let sql = `
      SELECT 
        a.id, 
        a.username, 
        a.role_id, 
        a.status,
        a.last_login_time,
        a.last_login_ip,
        a.created_at,
        ar.name as role_name
      FROM admins a
      LEFT JOIN admin_roles ar ON a.role_id = ar.id
      WHERE 1=1
    `
    const params = []

    if (username) {
      sql += ' AND a.username LIKE ?'
      params.push(`%${username}%`)
    }

    if (status) {
      sql += ' AND a.status = ?'
      params.push(status)
    }

    if (role_id) {
      sql += ' AND a.role_id = ?'
      params.push(role_id)
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?'
    params.push(parseInt(pageSize), parseInt(offset))

    const results = await db.conMysql(sql, params)

    // 获取总数
    let countSql = `
      SELECT COUNT(*) as total
      FROM admins a
      WHERE 1=1
    `
    const countParams = []

    if (username) {
      countSql += ' AND a.username LIKE ?'
      countParams.push(`%${username}%`)
    }

    if (status) {
      countSql += ' AND a.status = ?'
      countParams.push(status)
    }

    if (role_id) {
      countSql += ' AND a.role_id = ?'
      countParams.push(role_id)
    }

    const countResult = await db.conMysql(countSql, countParams)
    const total = countResult[0]?.total || 0

    res.cc(true, '获取成功', 200, {
      list: results,
      total: total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    })
  } catch (err) {
    console.error('获取管理员列表错误:', err)
    res.cc(false, '获取失败', 500)
  }
}

// 创建管理员（需要权限）
exports.createAdmin = async (req, res) => {
  try {
    const { username, password, role_id } = req.body

    if (!username || !password || !role_id) {
      return res.cc(false, '用户名、密码和角色ID不能为空', 400)
    }

    if (password.length < 6) {
      return res.cc(false, '密码长度不能少于6位', 400)
    }

    // 检查用户名是否已存在
    const checkSql = 'SELECT id FROM admins WHERE username = ?'
    const checkResult = await db.conMysql(checkSql, [username])

    if (checkResult.length > 0) {
      return res.cc(false, '用户名已存在', 400)
    }

    // 检查角色是否存在
    const roleSql = 'SELECT id FROM admin_roles WHERE id = ?'
    const roleResult = await db.conMysql(roleSql, [role_id])

    if (roleResult.length === 0) {
      return res.cc(false, '角色不存在', 400)
    }

    // 加密密码
    const hashedPassword = bcrypt.hashSync(password, 10)

    // 插入管理员
    const insertSql = `
      INSERT INTO admins (username, password, role_id, status)
      VALUES (?, ?, ?, 'active')
    `
    const insertResult = await db.conMysql(insertSql, [username, hashedPassword, role_id])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'

    // 记录操作日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address)
      VALUES (?, 'create_admin', 'admin', ?, ?, ?)
    `
    await db.conMysql(logSql, [
      req.user.id,
      insertResult.insertId,
      `创建管理员 ${username}`,
      clientIp
    ])

    res.cc(true, '创建成功', 200, { id: insertResult.insertId })
  } catch (err) {
    console.error('创建管理员错误:', err)
    res.cc(false, '创建失败', 500)
  }
}

// 更新管理员状态（启用/禁用）
exports.updateAdminStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!status || !['active', 'disabled'].includes(status)) {
      return res.cc(false, '状态参数无效', 400)
    }

    // 不能禁用自己
    if (parseInt(id) === req.user.id && status === 'disabled') {
      return res.cc(false, '不能禁用自己的账号', 400)
    }

    // 查询管理员信息
    const sql = 'SELECT username FROM admins WHERE id = ?'
    const results = await db.conMysql(sql, [id])

    if (results.length === 0) {
      return res.cc(false, '管理员不存在', 404)
    }

    // 更新状态
    const updateSql = 'UPDATE admins SET status = ?, updated_at = NOW() WHERE id = ?'
    await db.conMysql(updateSql, [status, id])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'

    // 记录操作日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address)
      VALUES (?, ?, 'admin', ?, ?, ?)
    `
    await db.conMysql(logSql, [
      req.user.id,
      status === 'active' ? 'enable_admin' : 'disable_admin',
      id,
      `${status === 'active' ? '启用' : '禁用'}管理员 ${results[0].username}`,
      clientIp
    ])

    res.cc(true, '操作成功', 200)
  } catch (err) {
    console.error('更新管理员状态错误:', err)
    res.cc(false, '操作失败', 500)
  }
}

// 重置管理员密码（需要权限）
exports.resetAdminPassword = async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.cc(false, '新密码长度不能少于6位', 400)
    }

    // 查询管理员信息
    const sql = 'SELECT username FROM admins WHERE id = ?'
    const results = await db.conMysql(sql, [id])

    if (results.length === 0) {
      return res.cc(false, '管理员不存在', 404)
    }

    // 加密新密码
    const hashedPassword = bcrypt.hashSync(newPassword, 10)

    // 更新密码
    const updateSql = 'UPDATE admins SET password = ?, updated_at = NOW() WHERE id = ?'
    await db.conMysql(updateSql, [hashedPassword, id])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'

    // 记录操作日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address)
      VALUES (?, 'reset_password', 'admin', ?, ?, ?)
    `
    await db.conMysql(logSql, [
      req.user.id,
      id,
      `重置管理员 ${results[0].username} 的密码`,
      clientIp
    ])

    res.cc(true, '密码重置成功', 200)
  } catch (err) {
    console.error('重置密码错误:', err)
    res.cc(false, '重置失败', 500)
  }
}

