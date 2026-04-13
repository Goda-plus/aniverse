const db = require('../db/index')

const ALLOWED_TARGET_TYPES = [
  'post',
  'comment',
  'scene_comment',
  'crowdfunding_comment',
  'scene_moment',
  'user',
  'product',
  'crowdfunding'
]

const TARGET_CHECK_SQL = {
  post: 'SELECT id FROM posts WHERE id = ? LIMIT 1',
  comment: 'SELECT id FROM comments WHERE id = ? LIMIT 1',
  scene_comment: 'SELECT id FROM scene_moment_comments WHERE id = ? AND IFNULL(is_deleted, 0) = 0 LIMIT 1',
  crowdfunding_comment: 'SELECT id FROM crowdfunding_comments WHERE id = ? AND IFNULL(is_deleted, 0) = 0 LIMIT 1',
  scene_moment: 'SELECT id FROM scene_moments WHERE id = ? LIMIT 1',
  user: 'SELECT id FROM users WHERE id = ? LIMIT 1',
  product: 'SELECT id FROM products WHERE id = ? LIMIT 1',
  crowdfunding: 'SELECT id FROM crowdfunding_projects WHERE id = ? LIMIT 1'
}

async function targetExists (targetType, targetId) {
  const sql = TARGET_CHECK_SQL[targetType]
  if (!sql) return false
  const rows = await db.conMysql(sql, [targetId])
  return rows && rows.length > 0
}

exports.submitReport = async (req, res) => {
  try {
    const reporterId = req.user && req.user.id
    if (!reporterId) {
      return res.cc(false, '请先登录', 401)
    }

    let { target_type, target_id, report_type, reason } = req.body || {}
    target_type = typeof target_type === 'string' ? target_type.trim() : ''
    target_id = parseInt(target_id, 10)
    report_type = typeof report_type === 'string' ? report_type.trim().slice(0, 100) : ''
    reason = typeof reason === 'string' ? reason.trim().slice(0, 2000) : ''

    if (!ALLOWED_TARGET_TYPES.includes(target_type)) {
      return res.cc(false, '不支持的举报类型', 400)
    }
    if (!Number.isFinite(target_id) || target_id < 1) {
      return res.cc(false, '无效的对象 ID', 400)
    }
    if (!report_type) {
      return res.cc(false, '请选择举报原因', 400)
    }

    if (target_type === 'user' && target_id === reporterId) {
      return res.cc(false, '不能举报自己', 400)
    }

    const exists = await targetExists(target_type, target_id)
    if (!exists) {
      return res.cc(false, '举报对象不存在', 404)
    }

    const dup = await db.conMysql(
      `SELECT id FROM user_reports
       WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'
       LIMIT 1`,
      [reporterId, target_type, target_id]
    )
    if (dup && dup.length > 0) {
      return res.cc(false, '您已提交过对该内容的待处理举报', 409)
    }

    await db.conMysql(
      `INSERT INTO user_reports (reporter_id, target_type, target_id, report_type, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [reporterId, target_type, target_id, report_type, reason || null]
    )

    res.cc(true, '举报已提交，我们会尽快处理', 200)
  } catch (err) {
    if (err && err.code === 'ER_NO_SUCH_TABLE') {
      return res.cc(false, '举报功能未初始化数据库表，请执行 migrate_admin_backoffice.js', 500)
    }
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_UNKNOWN_COLUMN')) {
      return res.cc(false, 'user_reports 表结构过旧，请重新执行迁移或对齐表结构', 500)
    }
    console.error('submitReport:', err)
    res.cc(false, (err && err.message) || '提交失败', 500)
  }
}
