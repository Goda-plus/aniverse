const db = require('../db/index')

// 获取角色列表
exports.getRoleList = async (req, res) => {
  try {
    const sql = `
      SELECT 
        id, 
        name, 
        description, 
        permissions,
        created_at,
        updated_at
      FROM admin_roles
      ORDER BY created_at DESC
    `
    const results = await db.conMysql(sql, [])

    // 解析权限JSON
    const roles = results.map(role => {
      let permissions = []
      try {
        permissions = JSON.parse(role.permissions || '[]')
      } catch (e) {
        permissions = []
      }
      return {
        ...role,
        permissions: permissions
      }
    })

    res.cc(true, '获取成功', 200, roles)
  } catch (err) {
    console.error('获取角色列表错误:', err)
    res.cc(false, '获取失败', 500)
  }
}

// 获取角色详情
exports.getRoleDetail = async (req, res) => {
  try {
    const { id } = req.params

    const sql = `
      SELECT 
        id, 
        name, 
        description, 
        permissions,
        created_at,
        updated_at
      FROM admin_roles
      WHERE id = ?
    `
    const results = await db.conMysql(sql, [id])

    if (results.length === 0) {
      return res.cc(false, '角色不存在', 404)
    }

    const role = results[0]

    // 解析权限JSON
    let permissions = []
    try {
      permissions = JSON.parse(role.permissions || '[]')
    } catch (e) {
      permissions = []
    }

    res.cc(true, '获取成功', 200, {
      ...role,
      permissions: permissions
    })
  } catch (err) {
    console.error('获取角色详情错误:', err)
    res.cc(false, '获取失败', 500)
  }
}

// 创建角色
exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body

    if (!name || !permissions || !Array.isArray(permissions)) {
      return res.cc(false, '角色名称和权限列表不能为空', 400)
    }

    // 检查角色名称是否已存在
    const checkSql = 'SELECT id FROM admin_roles WHERE name = ?'
    const checkResult = await db.conMysql(checkSql, [name])

    if (checkResult.length > 0) {
      return res.cc(false, '角色名称已存在', 400)
    }

    // 将权限数组转换为JSON
    const permissionsJson = JSON.stringify(permissions)

    // 插入角色
    const insertSql = `
      INSERT INTO admin_roles (name, description, permissions)
      VALUES (?, ?, ?)
    `
    const insertResult = await db.conMysql(insertSql, [name, description || '', permissionsJson])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'

    // 记录操作日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address)
      VALUES (?, 'create_role', 'role', ?, ?, ?)
    `
    await db.conMysql(logSql, [
      req.user.id,
      insertResult.insertId,
      `创建角色 ${name}`,
      clientIp
    ])

    res.cc(true, '创建成功', 200, { id: insertResult.insertId })
  } catch (err) {
    console.error('创建角色错误:', err)
    res.cc(false, '创建失败', 500)
  }
}

// 更新角色
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, permissions } = req.body

    if (!name || !permissions || !Array.isArray(permissions)) {
      return res.cc(false, '角色名称和权限列表不能为空', 400)
    }

    // 检查角色是否存在
    const checkSql = 'SELECT id, name FROM admin_roles WHERE id = ?'
    const checkResult = await db.conMysql(checkSql, [id])

    if (checkResult.length === 0) {
      return res.cc(false, '角色不存在', 404)
    }

    // 检查角色名称是否与其他角色冲突
    const nameCheckSql = 'SELECT id FROM admin_roles WHERE name = ? AND id != ?'
    const nameCheckResult = await db.conMysql(nameCheckSql, [name, id])

    if (nameCheckResult.length > 0) {
      return res.cc(false, '角色名称已存在', 400)
    }

    // 将权限数组转换为JSON
    const permissionsJson = JSON.stringify(permissions)

    // 更新角色
    const updateSql = `
      UPDATE admin_roles 
      SET name = ?, description = ?, permissions = ?, updated_at = NOW()
      WHERE id = ?
    `
    await db.conMysql(updateSql, [name, description || '', permissionsJson, id])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'

    // 记录操作日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address)
      VALUES (?, 'update_role', 'role', ?, ?, ?)
    `
    await db.conMysql(logSql, [
      req.user.id,
      id,
      `更新角色 ${name}`,
      clientIp
    ])

    res.cc(true, '更新成功', 200)
  } catch (err) {
    console.error('更新角色错误:', err)
    res.cc(false, '更新失败', 500)
  }
}

// 删除角色
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params

    // 检查角色是否存在
    const checkSql = 'SELECT id, name FROM admin_roles WHERE id = ?'
    const checkResult = await db.conMysql(checkSql, [id])

    if (checkResult.length === 0) {
      return res.cc(false, '角色不存在', 404)
    }

    // 检查是否有管理员使用此角色
    const adminCheckSql = 'SELECT COUNT(*) as count FROM admins WHERE role_id = ?'
    const adminCheckResult = await db.conMysql(adminCheckSql, [id])

    if (adminCheckResult[0].count > 0) {
      return res.cc(false, '该角色下还有管理员，无法删除', 400)
    }

    // 删除角色
    const deleteSql = 'DELETE FROM admin_roles WHERE id = ?'
    await db.conMysql(deleteSql, [id])

    // 获取客户端IP
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown'

    // 记录操作日志
    const logSql = `
      INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address)
      VALUES (?, 'delete_role', 'role', ?, ?, ?)
    `
    await db.conMysql(logSql, [
      req.user.id,
      id,
      `删除角色 ${checkResult[0].name}`,
      clientIp
    ])

    res.cc(true, '删除成功', 200)
  } catch (err) {
    console.error('删除角色错误:', err)
    res.cc(false, '删除失败', 500)
  }
}

