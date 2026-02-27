const db = require('../db/index')

async function recordAdminLog (req, action_type, description, target_type = null, target_id = null) {
  try {
    const adminId = req.user && req.user.id ? req.user.id : null
    const clientIp = req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      'unknown'
    if (!adminId) return
    const sql = `
      INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    await db.conMysql(sql, [adminId, action_type, target_type, target_id, description, clientIp])
  } catch (e) {}
}

// 用户列表（含封禁状态）
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, username, status } = req.query
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params = []
    if (username) {
      where += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.nickname LIKE ?)'
      const kw = `%${username}%`
      params.push(kw, kw, kw)
    }
    if (status) {
      where += ' AND u.status = ?'
      params.push(status)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM users u
      ${where}
    `
    const countRes = await db.conMysql(countSql, params)
    const total = countRes[0] ? countRes[0].total : 0

    const listSql = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.nickname,
        u.avatar_url,
        u.bio,
        u.gender,
        u.birthday,
        u.created_at,
        u.updated_at,
        u.status
      FROM users u
      ${where}
      ORDER BY u.id ASC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(listSql, [...params, parseInt(pageSize), parseInt(offset)])
    res.cc(true, '获取成功', 200, { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    console.error('获取用户列表错误:', err)
    res.cc(false, '获取失败', 500)
  }
}

// 用户详情（含统计 & 封禁状态）
exports.getUserDetail = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.cc(false, '缺少用户ID', 400)

    const userSql = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.nickname,
        u.avatar_url,
        u.bio,
        u.gender,
        u.birthday,
        u.created_at,
        u.updated_at,
        u.status
      FROM users u
      WHERE u.id = ?
      LIMIT 1
    `
    const users = await db.conMysql(userSql, [id])
    if (!users.length) return res.cc(false, '用户不存在', 404)

    const statsSql = `
      SELECT
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = ?) AS post_count,
        (SELECT COUNT(*) FROM comments c WHERE c.user_id = ?) AS comment_count,
        (SELECT COUNT(*) FROM scene_moments sm WHERE sm.submitter_id = ?) AS scene_moment_count
    `
    const statsRes = await db.conMysql(statsSql, [id, id, id])
    const stats = statsRes[0] || { post_count: 0, comment_count: 0, scene_moment_count: 0 }

    res.cc(true, '获取成功', 200, { user: users[0], stats })
  } catch (err) {
    console.error('获取用户详情错误:', err)
    res.cc(false, '获取失败', 500)
  }
}

// 封禁 / 解封
exports.banOrUnbanUser = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!id) return res.cc(false, '缺少用户ID', 400)
    if (!status || !['online', 'outline', 'banned'].includes(status)) {
      return res.cc(false, 'status 必须为 online、outline 或 banned', 400)
    }

    const exists = await db.conMysql('SELECT id, username FROM users WHERE id = ? LIMIT 1', [id])
    if (!exists.length) return res.cc(false, '用户不存在', 404)

    // 更新user表的status字段
    await db.conMysql(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    )

    const actionType = status === 'banned' ? 'ban_user' : status === 'online' ? 'unban_user' : 'update_user_status'
    const actionDesc = status === 'banned' ? `封禁用户 ${exists[0].username}` : 
      status === 'online' ? `解封用户 ${exists[0].username}` : 
                       `更新用户 ${exists[0].username} 状态为 ${status}`
    
    await recordAdminLog(req, actionType, actionDesc, 'user', id)
    res.cc(true, status === 'banned' ? '封禁成功' : status === 'online' ? '解封成功' : '更新成功', 200)
  } catch (err) {
    console.error('封禁/解封用户错误:', err)
    res.cc(false, '操作失败', 500)
  }
}


