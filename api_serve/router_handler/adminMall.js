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

// 商品列表（管理端：可查看全部）
exports.listProducts = async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req)
    const { keyword, category_id, shop_id, is_approved, is_listed } = req.query

    let where = 'WHERE 1=1'
    const params = []

    if (keyword) {
      where += ' AND (p.name LIKE ? OR p.description LIKE ?)'
      const kw = `%${keyword}%`
      params.push(kw, kw)
    }
    if (category_id) {
      where += ' AND p.category_id = ?'
      params.push(category_id)
    }
    if (shop_id) {
      where += ' AND p.shop_id = ?'
      params.push(shop_id)
    }
    if (is_approved !== undefined && is_approved !== '') {
      where += ' AND p.is_approved = ?'
      params.push(parseInt(is_approved))
    }
    if (is_listed !== undefined && is_listed !== '') {
      where += ' AND p.is_listed = ?'
      params.push(parseInt(is_listed))
    }

    const countRes = await db.conMysql(`SELECT COUNT(*) AS total FROM products p ${where}`, params)
    const total = countRes[0] ? countRes[0].total : 0

    const sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.original_price,
        p.stock,
        p.media_id,
        p.category_id,
        p.shop_id,
        p.is_approved,
        p.is_listed,
        p.sort_order,
        p.cover_image,
        p.created_at,
        p.updated_at,
        AVG(CASE WHEN r.is_approved = 1 THEN r.rating ELSE NULL END) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
      FROM products p
      LEFT JOIN product_reviews r ON r.product_id = p.id
      ${where}
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(sql, [...params, pageSize, offset])
    res.cc(true, '获取成功', 200, { list: rows, total, page, pageSize })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}

// 更新商品（审核/上下架/库存/价格等）
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return res.cc(false, '缺少商品ID', 400)

    const allowed = ['is_approved', 'is_listed', 'stock', 'price', 'original_price', 'sort_order', 'name', 'description', 'cover_image']
    const fields = []
    const params = []
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`)
        params.push(req.body[key])
      }
    }
    if (!fields.length) return res.cc(false, '没有需要更新的字段', 400)

    fields.push('updated_at = NOW()')
    params.push(id)
    const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`
    const result = await db.conMysql(sql, params)
    if (result.affectedRows === 0) return res.cc(false, '商品不存在', 404)

    await recordAdminLog(req, 'update_product', `更新商品 ${id}`, 'product', id)
    res.cc(true, '更新成功', 200)
  } catch (err) {
    res.cc(false, '更新失败', 500)
  }
}

// 订单列表（管理端）
exports.listOrders = async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req)
    const { status, order_number, user_id } = req.query

    let where = 'WHERE 1=1'
    const params = []
    if (status) {
      where += ' AND o.status = ?'
      params.push(status)
    }
    if (order_number) {
      where += ' AND o.order_number LIKE ?'
      params.push(`%${order_number}%`)
    }
    if (user_id) {
      where += ' AND o.user_id = ?'
      params.push(user_id)
    }

    const countRes = await db.conMysql(`SELECT COUNT(*) AS total FROM orders o ${where}`, params)
    const total = countRes[0] ? countRes[0].total : 0

    const sql = `
      SELECT
        o.id,
        o.order_number,
        o.user_id,
        u.username,
        o.total_amount,
        o.status,
        o.payment_method,
        o.payment_time,
        o.shipped_time,
        o.delivered_time,
        o.cancelled_time,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(sql, [...params, pageSize, offset])
    res.cc(true, '获取成功', 200, { list: rows, total, page, pageSize })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}

// 更新订单状态（发货/完成/取消/退款等：这里提供通用入口）
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!id) return res.cc(false, '缺少订单ID', 400)
    if (!status) return res.cc(false, '缺少 status', 400)

    const allowed = ['pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded']
    if (!allowed.includes(status)) return res.cc(false, '无效的订单状态', 400)

    const timeFields = []
    if (status === 'shipped') timeFields.push('shipped_time = NOW()')
    if (status === 'completed') timeFields.push('delivered_time = NOW()')
    if (status === 'cancelled') timeFields.push('cancelled_time = NOW()')

    const sql = `
      UPDATE orders
      SET status = ?, ${timeFields.join(', ')} ${timeFields.length ? ',' : ''} updated_at = NOW()
      WHERE id = ?
    `
    const result = await db.conMysql(sql, [status, id])
    if (result.affectedRows === 0) return res.cc(false, '订单不存在', 404)

    await recordAdminLog(req, 'update_order_status', `更新订单 ${id} 状态为 ${status}`, 'order', id)
    res.cc(true, '更新成功', 200)
  } catch (err) {
    res.cc(false, '更新失败', 500)
  }
}

// 评价列表（管理端：可查看全部）
exports.listReviews = async (req, res) => {
  try {
    const { page, pageSize, offset } = parsePagination(req)
    const { is_approved, product_id } = req.query

    let where = 'WHERE 1=1'
    const params = []
    if (is_approved !== undefined && is_approved !== '') {
      where += ' AND r.is_approved = ?'
      params.push(parseInt(is_approved))
    }
    if (product_id) {
      where += ' AND r.product_id = ?'
      params.push(product_id)
    }

    const countRes = await db.conMysql(`SELECT COUNT(*) AS total FROM product_reviews r ${where}`, params)
    const total = countRes[0] ? countRes[0].total : 0

    const sql = `
      SELECT
        r.id,
        r.user_id,
        u.username,
        r.product_id,
        p.name AS product_name,
        r.rating,
        r.content,
        r.images,
        r.is_approved,
        r.created_at
      FROM product_reviews r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN products p ON p.id = r.product_id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await db.conMysql(sql, [...params, pageSize, offset])
    res.cc(true, '获取成功', 200, { list: rows, total, page, pageSize })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}

// 审核评价
exports.approveReview = async (req, res) => {
  try {
    const { id } = req.params
    const { is_approved } = req.body
    if (!id) return res.cc(false, '缺少评价ID', 400)
    if (is_approved === undefined) return res.cc(false, '缺少 is_approved', 400)

    const sql = 'UPDATE product_reviews SET is_approved = ? WHERE id = ?'
    const result = await db.conMysql(sql, [parseInt(is_approved) ? 1 : 0, id])
    if (result.affectedRows === 0) return res.cc(false, '评价不存在', 404)

    await recordAdminLog(req, 'approve_review', `审核评价 ${id} -> ${parseInt(is_approved) ? 'approved' : 'rejected'}`, 'review', id)
    res.cc(true, '操作成功', 200)
  } catch (err) {
    res.cc(false, '操作失败', 500)
  }
}


