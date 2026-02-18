const db = require('../db/index')

async function recordAdminLog (req, action_type, description, target_type = null, target_id = null) {
  try {
    const adminId = req.user && req.user.id ? req.user.id : null
    const clientIp = req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      'unknown'
    if (!adminId) return
    await db.conMysql(
      'INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, description, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, action_type, target_type, target_id, description, clientIp]
    )
  } catch (e) {}
}

// 举报列表
exports.listReports = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, content_type } = req.query
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params = []
    if (status) {
      where += ' AND r.status = ?'
      params.push(status)
    }
    if (content_type) {
      where += ' AND r.content_type = ?'
      params.push(content_type)
    }

    const countRes = await db.conMysql(`SELECT COUNT(*) AS total FROM user_reports r ${where}`, params)
    const total = countRes[0] ? countRes[0].total : 0

    const sql = `
      SELECT
        r.id,
        r.user_id,
        u.username,
        r.content_type,
        r.content_id,
        r.reason,
        r.description,
        r.status,
        r.handler_admin_id,
        a.username AS handler_name,
        r.handle_comment,
        r.created_at,
        r.updated_at
      FROM user_reports r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN admins a ON a.id = r.handler_admin_id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(sql, [...params, parseInt(pageSize), parseInt(offset)])
    res.cc(true, '获取成功', 200, { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, 'user_reports 表不存在，请先执行迁移脚本 migrate_admin_backoffice.js', 500)
    }
    res.cc(false, '获取失败', 500)
  }
}

// 处理举报
exports.handleReport = async (req, res) => {
  try {
    const { id } = req.params
    const { status, handle_comment } = req.body
    if (!id) return res.cc(false, '缺少举报ID', 400)
    if (!['pending', 'resolved', 'rejected'].includes(status)) {
      return res.cc(false, 'status 必须为 pending/resolved/rejected', 400)
    }

    const sql = `
      UPDATE user_reports
      SET status = ?, handler_admin_id = ?, handle_comment = ?, updated_at = NOW()
      WHERE id = ?
    `
    const result = await db.conMysql(sql, [status, req.user.id, handle_comment || '', id])
    if (result.affectedRows === 0) return res.cc(false, '举报不存在', 404)

    await recordAdminLog(req, 'handle_report', `处理举报 ${id} -> ${status}`, 'report', id)
    res.cc(true, '处理成功', 200)
  } catch (err) {
    res.cc(false, '处理失败', 500)
  }
}

// 反馈列表
exports.listFeedback = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params = []
    if (status) {
      where += ' AND f.status = ?'
      params.push(status)
    }

    const countRes = await db.conMysql(`SELECT COUNT(*) AS total FROM user_feedback f ${where}`, params)
    const total = countRes[0] ? countRes[0].total : 0

    const sql = `
      SELECT
        f.id,
        f.user_id,
        u.username,
        f.type,
        f.title,
        f.content,
        f.status,
        f.handler_admin_id,
        a.username AS handler_name,
        f.handle_comment,
        f.created_at,
        f.updated_at
      FROM user_feedback f
      LEFT JOIN users u ON u.id = f.user_id
      LEFT JOIN admins a ON a.id = f.handler_admin_id
      ${where}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(sql, [...params, parseInt(pageSize), parseInt(offset)])
    res.cc(true, '获取成功', 200, { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, 'user_feedback 表不存在，请先执行迁移脚本 migrate_admin_backoffice.js', 500)
    }
    res.cc(false, '获取失败', 500)
  }
}

// 处理反馈
exports.handleFeedback = async (req, res) => {
  try {
    const { id } = req.params
    const { status, handle_comment } = req.body
    if (!id) return res.cc(false, '缺少反馈ID', 400)
    if (!['pending', 'resolved', 'rejected'].includes(status)) {
      return res.cc(false, 'status 必须为 pending/resolved/rejected', 400)
    }

    const sql = `
      UPDATE user_feedback
      SET status = ?, handler_admin_id = ?, handle_comment = ?, updated_at = NOW()
      WHERE id = ?
    `
    const result = await db.conMysql(sql, [status, req.user.id, handle_comment || '', id])
    if (result.affectedRows === 0) return res.cc(false, '反馈不存在', 404)

    await recordAdminLog(req, 'handle_feedback', `处理反馈 ${id} -> ${status}`, 'feedback', id)
    res.cc(true, '处理成功', 200)
  } catch (err) {
    res.cc(false, '处理失败', 500)
  }
}


