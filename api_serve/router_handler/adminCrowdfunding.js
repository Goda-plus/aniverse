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

function parsePagination (req) {
  const page = parseInt(req.query.page, 10) || 1
  const pageSize = parseInt(req.query.pageSize, 10) || 20
  const safePage = page < 1 ? 1 : page
  const safePageSize = pageSize < 1 ? 20 : pageSize
  const offset = (safePage - 1) * safePageSize
  return { page: safePage, pageSize: safePageSize, offset }
}

// 项目列表（管理端）
exports.listProjects = async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req)
    const { status, keyword, category } = req.query

    let where = 'WHERE 1=1'
    const params = []
    if (status) {
      where += ' AND p.status = ?'
      params.push(status)
    }
    if (category) {
      where += ' AND p.category = ?'
      params.push(category)
    }
    if (keyword) {
      where += ' AND (p.title LIKE ? OR p.description LIKE ?)'
      const kw = `%${keyword}%`
      params.push(kw, kw)
    }

    const countRes = await db.conMysql(`SELECT COUNT(*) AS total FROM crowdfunding_projects p ${where}`, params)
    const total = countRes[0] ? countRes[0].total : 0

    const sql = `
      SELECT
        p.id,
        p.title,
        p.cover_image,
        p.goal_amount,
        p.current_amount,
        p.backer_count,
        p.start_date,
        p.end_date,
        p.creator_id,
        u.username AS creator_name,
        p.category,
        p.status,
        p.views,
        p.created_at,
        p.updated_at
      FROM crowdfunding_projects p
      LEFT JOIN users u ON u.id = p.creator_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(sql, [...params, pageSize, offset])
    res.cc(true, '获取成功', 200, { list: rows, total, page, pageSize })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}

// 审核项目（approve/reject）
exports.reviewProject = async (req, res) => {
  try {
    const { id } = req.params
    const { action, reason } = req.body
    if (!id) return res.cc(false, '缺少项目ID', 400)
    if (!['approve', 'reject'].includes(action)) return res.cc(false, 'action 必须为 approve 或 reject', 400)

    const projects = await db.conMysql('SELECT id, title, status FROM crowdfunding_projects WHERE id = ? LIMIT 1', [id])
    if (!projects.length) return res.cc(false, '项目不存在', 404)

    const newStatus = action === 'approve' ? 'active' : 'rejected'
    await db.conMysql(
      'UPDATE crowdfunding_projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, id]
    )

    await recordAdminLog(req, 'review_crowdfunding', `众筹项目审核 ${id} -> ${newStatus}${reason ? `，原因：${reason}` : ''}`, 'crowdfunding_project', id)
    res.cc(true, '审核成功', 200)
  } catch (err) {
    res.cc(false, '审核失败', 500)
  }
}


