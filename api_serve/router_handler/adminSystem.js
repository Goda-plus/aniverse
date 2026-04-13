const db = require('../db/index')

async function getPermissionsFromRequest (req) {
  if (req.user && Array.isArray(req.user.permissions)) {
    return req.user.permissions
  }
  const sql = `
    SELECT ar.permissions
    FROM admins a
    LEFT JOIN admin_roles ar ON a.role_id = ar.id
    WHERE a.id = ? AND a.status = 'active'
  `
  const rows = await db.conMysql(sql, [req.user.id])
  if (!rows.length) return []
  try {
    return JSON.parse(rows[0].permissions || '[]')
  } catch (e) {
    return []
  }
}

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

const MAINTENANCE_TYPES = ['interest_matching', 'heat_calc', 'moderation_test']

// 手动触发与 api_serve 下测试脚本等价的维护任务（需 admin.manage）
exports.runMaintenanceJob = async (req, res) => {
  const type = req.body && req.body.type
  if (!MAINTENANCE_TYPES.includes(type)) {
    return res.cc(false, `type 须为: ${MAINTENANCE_TYPES.join(', ')}`, 400)
  }
  try {
    if (type === 'interest_matching') {
      const { testScheduler } = require('../test_scheduler')
      await testScheduler()
      await recordAdminLog(req, 'maintenance', '手动执行同好匹配（test_scheduler）', 'job', type)
    } else if (type === 'heat_calc') {
      let batchSize = parseInt(req.body.batchSize, 10)
      if (Number.isNaN(batchSize) || batchSize < 1) batchSize = 500
      batchSize = Math.min(batchSize, 3000)
      const { updateAllHeatScores } = require('../scheduler')
      await updateAllHeatScores(batchSize)
      await recordAdminLog(req, 'maintenance', `手动执行热度全量更新 batchSize=${batchSize}`, 'job', type)
    } else if (type === 'moderation_test') {
      const { testModerationSystem } = require('../test_moderation')
      await testModerationSystem()
      await recordAdminLog(req, 'maintenance', '手动执行内容审核自测（test_moderation）', 'job', type)
    }
    res.cc(true, '任务已执行完成', 200)
  } catch (err) {
    console.error('runMaintenanceJob', type, err)
    res.cc(false, err.message || '任务执行失败', 500)
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
// 拥有 statistics.read 或 admin.manage 可查看全部并按 admin_id 筛选；其余管理员仅能查看本人记录（可溯性）
exports.listAdminLogs = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, action_type, admin_id } = req.query
    const offset = (page - 1) * pageSize

    const permissions = await getPermissionsFromRequest(req)
    const canViewAll = permissions.includes('statistics.read') || permissions.includes('admin.manage')

    let where = 'WHERE 1=1'
    const params = []
    if (action_type) {
      where += ' AND l.action_type = ?'
      params.push(action_type)
    }
    if (!canViewAll) {
      where += ' AND l.admin_id = ?'
      params.push(req.user.id)
    } else if (admin_id) {
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
    res.cc(true, '获取成功', 200, {
      list: rows,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      canViewAll
    })
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, 'admin_logs 表不存在，请先初始化管理员表结构', 500)
    }
    res.cc(false, '获取失败', 500)
  }
}


