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
  } catch (e) {
    // 日志失败不影响主流程
  }
}

// 系统设置列表
exports.listSettings = async (req, res) => {
  try {
    const rows = await db.conMysql(
      'SELECT `key`, `value`, description, updated_at FROM system_settings ORDER BY `key` ASC'
    )
    res.cc(true, '获取成功', 200, rows)
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, '系统设置表不存在，请先执行迁移脚本 migrate_admin_backoffice.js', 500)
    }
    res.cc(false, '获取失败', 500)
  }
}

// 新增/更新系统设置
exports.upsertSetting = async (req, res) => {
  try {
    const { key, value, description } = req.body
    if (!key) return res.cc(false, '缺少 key', 400)

    const sql = `
      INSERT INTO system_settings (\`key\`, \`value\`, description, updated_by)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`value\` = VALUES(\`value\`),
        description = VALUES(description),
        updated_by = VALUES(updated_by),
        updated_at = NOW()
    `
    await db.conMysql(sql, [String(key), value === undefined ? '' : String(value), description || '', req.user.id])
    await recordAdminLog(req, 'update_setting', `更新系统设置 ${key}`, 'setting', key)
    res.cc(true, '保存成功', 200)
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, '系统设置表不存在，请先执行迁移脚本 migrate_admin_backoffice.js', 500)
    }
    res.cc(false, '保存失败', 500)
  }
}

// 操作日志列表（admin_logs）
exports.listAdminLogs = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action_type, admin_id } = req.query
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params = []
    if (action_type) {
      where += ' AND l.action_type = ?'
      params.push(action_type)
    }
    if (admin_id) {
      where += ' AND l.admin_id = ?'
      params.push(admin_id)
    }

    const countSql = `SELECT COUNT(*) AS total FROM admin_logs l ${where}`
    const countRes = await db.conMysql(countSql, params)
    const total = countRes[0] ? countRes[0].total : 0

    const listSql = `
      SELECT
        l.id,
        l.admin_id,
        a.username AS admin_username,
        l.action_type,
        l.target_type,
        l.target_id,
        l.description,
        l.ip_address,
        l.created_at
      FROM admin_logs l
      LEFT JOIN admins a ON a.id = l.admin_id
      ${where}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(listSql, [...params, parseInt(pageSize), parseInt(offset)])
    res.cc(true, '获取成功', 200, { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, 'admin_logs 表不存在，请先初始化管理员表结构', 500)
    }
    res.cc(false, '获取失败', 500)
  }
}


