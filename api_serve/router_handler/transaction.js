const db = require('../db/index')

function parsePagination(req) {
  const page = parseInt(req.query.page, 10) || 1
  const pageSize = parseInt(req.query.pageSize, 10) || 20
  const safePage = page < 1 ? 1 : page
  const safePageSize = pageSize < 1 ? 20 : pageSize
  const offset = (safePage - 1) * safePageSize
  return { page: safePage, pageSize: safePageSize, offset }
}

function mapOrderStatusToTransactionStatus(orderStatus) {
  // 前端期望：success / pending
  // 订单状态里通常：paid/shipped/completed 视为成功，其余视为 pending
  if (!orderStatus) return 'pending'
  if (['paid', 'shipped', 'completed'].includes(orderStatus)) return 'success'
  if (orderStatus === 'pending') return 'pending'
  return 'pending'
}

exports.listTransactions = async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req)

    const countSql = 'SELECT COUNT(*) AS total FROM orders o'
    const countRes = await db.conMysql(countSql, [])
    const total = countRes[0]?.total || 0

    const sql = `
      SELECT
        o.order_number AS order_no,
        o.created_at AS timestamp,
        u.username,
        o.total_amount AS price,
        o.status
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `

    const rows = await db.conMysql(sql, [pageSize, offset])
    const items = rows.map(r => ({
      order_no: r.order_no,
      timestamp: r.timestamp,
      username: r.username,
      price: r.price !== null && r.price !== undefined ? Number(r.price) : 0,
      status: mapOrderStatusToTransactionStatus(r.status)
    }))

    res.cc(true, '获取成功', 200, {
      total,
      items,
      page,
      pageSize
    })
  } catch (err) {
    console.error('listTransactions error:', err)
    res.cc(false, '获取失败', 500)
  }
}

