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
    const { page = 1, pageSize = 20, keyword, ban_status } = req.query
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params = []
    if (keyword) {
      where += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.nickname LIKE ?)'
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }
    if (ban_status === 'banned') {
      where += ' AND ub.status = "banned" AND (ub.banned_until IS NULL OR ub.banned_until > NOW())'
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM users u
      LEFT JOIN user_bans ub ON ub.user_id = u.id
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
        COALESCE(ub.status, 'active') AS ban_status,
        ub.reason AS ban_reason,
        ub.banned_until
      FROM users u
      LEFT JOIN user_bans ub ON ub.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(listSql, [...params, parseInt(pageSize), parseInt(offset)])
    res.cc(true, '获取成功', 200, { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, 'user_bans 表不存在，请先执行迁移脚本 migrate_admin_backoffice.js', 500)
    }
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
        COALESCE(ub.status, 'active') AS ban_status,
        ub.reason AS ban_reason,
        ub.banned_until
      FROM users u
      LEFT JOIN user_bans ub ON ub.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `
    const users = await db.conMysql(userSql, [id])
    if (!users.length) return res.cc(false, '用户不存在', 404)

    const statsSql = `
      SELECT
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = ?) AS post_count,
        (SELECT COUNT(*) FROM comments c WHERE c.user_id = ?) AS comment_count,
        (SELECT COUNT(*) FROM scene_moments sm WHERE sm.user_id = ?) AS scene_moment_count
    `
    const statsRes = await db.conMysql(statsSql, [id, id, id])
    const stats = statsRes[0] || { post_count: 0, comment_count: 0, scene_moment_count: 0 }

    res.cc(true, '获取成功', 200, { user: users[0], stats })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}

// 封禁 / 解封
exports.banOrUnbanUser = async (req, res) => {
  try {
    const { id } = req.params
    const { action, reason, banned_until } = req.body

    if (!id) return res.cc(false, '缺少用户ID', 400)
    if (!['ban', 'unban'].includes(action)) return res.cc(false, 'action 必须为 ban 或 unban', 400)

    const exists = await db.conMysql('SELECT id, username FROM users WHERE id = ? LIMIT 1', [id])
    if (!exists.length) return res.cc(false, '用户不存在', 404)

    if (action === 'unban') {
      await db.conMysql(
        'INSERT INTO user_bans (user_id, status, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason), banned_until = NULL, updated_at = NOW()',
        [id, 'active', '']
      )
      await recordAdminLog(req, 'unban_user', `解封用户 ${exists[0].username}`, 'user', id)
      return res.cc(true, '解封成功', 200)
    }

    // ban
    const untilValue = banned_until ? new Date(banned_until) : null
    const untilSql = untilValue && !Number.isNaN(untilValue.getTime())
      ? untilValue.toISOString().slice(0, 19).replace('T', ' ')
      : null

    await db.conMysql(
      'INSERT INTO user_bans (user_id, status, reason, banned_until) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), reason = VALUES(reason), banned_until = VALUES(banned_until), updated_at = NOW()',
      [id, 'banned', reason || '违反社区规范', untilSql]
    )
    await recordAdminLog(req, 'ban_user', `封禁用户 ${exists[0].username}`, 'user', id)
    res.cc(true, '封禁成功', 200)
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, 'user_bans 表不存在，请先执行迁移脚本 migrate_admin_backoffice.js', 500)
    }
    res.cc(false, '操作失败', 500)
  }
}


