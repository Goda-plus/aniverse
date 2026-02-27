const { conMysql } = require('../db/index')

// 工具函数：解析分页参数
function parsePagination (req) {
  const page = parseInt(req.query.page, 10) || 1
  const pageSize = parseInt(req.query.pageSize, 10) || 10
  const safePage = page < 1 ? 1 : page
  const safePageSize = pageSize < 1 ? 10 : pageSize
  const offset = (safePage - 1) * safePageSize
  return { page: safePage, pageSize: safePageSize, offset }
}

// 分类列表
exports.listCategories = async (req, res, next) => {
  try {
    const { parent_id } = req.query
    const { page, pageSize, offset } = parsePagination(req)

    let where = 'WHERE is_active = 1'
    const params = []
    if (parent_id !== undefined && parent_id !== '') {
      where += ' AND parent_id = ?'
      params.push(parent_id)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM product_categories
      ${where}
    `
    const [{ total }] = await conMysql(countSql, params)

    const listSql = `
      SELECT id, name, parent_id, description, sort_order, is_active, created_at, updated_at
      FROM product_categories
      ${where}
      ORDER BY sort_order ASC, id ASC
      LIMIT ? OFFSET ?
    `
    const rows = await conMysql(listSql, [...params, pageSize, offset])

    res.cc(true, '获取分类列表成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 商品列表（支持关键词搜索）
exports.listProducts = async (req, res, next) => {
  try {
    const { category_id, media_id, keyword } = req.query
    const { page, pageSize, offset } = parsePagination(req)

    let where = 'WHERE p.is_listed = 1 AND p.is_approved = 1'
    const params = []

    if (category_id) {
      where += ' AND p.category_id = ?'
      params.push(category_id)
    }
    if (media_id) {
      where += ' AND p.media_id = ?'
      params.push(media_id)
    }
    if (keyword) {
      where += ' AND (p.name LIKE ? OR p.description LIKE ?)'
      const keywordPattern = `%${keyword}%`
      params.push(keywordPattern, keywordPattern)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      ${where}
    `
    const [{ total }] = await conMysql(countSql, params)

    const listSql = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.original_price,
        p.stock,
        p.media_id,
        p.category_id,
        p.is_approved,
        p.is_listed,
        p.sort_order,
        p.cover_image,
        p.created_at,
        p.updated_at,
        AVG(CASE WHEN r.is_approved = 1 THEN r.rating ELSE NULL END) AS avg_rating,
        COUNT(DISTINCT CASE WHEN r.is_approved = 1 THEN r.id END) AS review_count
      FROM products p
      LEFT JOIN product_reviews r ON r.product_id = p.id
      ${where}
      GROUP BY p.id
      ORDER BY p.sort_order ASC, p.id DESC
      LIMIT ? OFFSET ?
    `

    const rows = await conMysql(listSql, [...params, pageSize, offset])

    res.cc(true, '获取商品列表成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 商品详情（包含图片和评价统计）
exports.getProductDetail = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.cc(false, '缺少商品ID', 400)
    }

    const productSql = `
      SELECT 
        p.*,
        AVG(CASE WHEN r.is_approved = 1 THEN r.rating ELSE NULL END) AS avg_rating,
        COUNT(DISTINCT CASE WHEN r.is_approved = 1 THEN r.id END) AS review_count
      FROM products p
      LEFT JOIN product_reviews r ON r.product_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `
    const rows = await conMysql(productSql, [id])
    if (!rows.length) {
      return res.cc(false, '商品不存在', 404)
    }
    const product = rows[0]

    const imagesSql = `
      SELECT id, product_id, image_url, sort_order, created_at
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
    `
    const images = await conMysql(imagesSql, [id])

    res.cc(true, '获取商品详情成功', 200, {
      product,
      images
    })
  } catch (err) {
    next(err)
  }
}

// 购物车：获取当前用户购物车
exports.getCart = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const sql = `
      SELECT
        sc.id,
        sc.product_id,
        sc.quantity,
        sc.selected,
        sc.created_at,
        p.name,
        p.price,
        p.cover_image,
        p.stock,
        s.shop_name,
        s.shop_id
      FROM carts sc
      JOIN products p ON sc.product_id = p.id
      LEFT JOIN shops s ON p.shop_id = s.shop_id
      WHERE sc.user_id = ?
      ORDER BY sc.created_at DESC
    `
    const rows = await conMysql(sql, [user_id])
    res.cc(true, '获取购物车成功', 200, rows)
  } catch (err) {
    next(err)
  }
}

// 加入购物车（存在则数量累加）
exports.addToCart = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { product_id, quantity = 1 } = req.body

    if (!product_id) {
      return res.cc(false, '缺少商品ID', 400)
    }

    const sql = `
      INSERT INTO carts (user_id, product_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `
    await conMysql(sql, [user_id, product_id, quantity])

    res.cc(true, '加入购物车成功', 200)
  } catch (err) {
    next(err)
  }
}

// 更新购物车数量
exports.updateCartItem = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { product_id, quantity, selected } = req.body

    if (!product_id) {
      return res.cc(false, '缺少商品ID', 400)
    }

    const fields = []
    const params = []

    if (quantity !== undefined) {
      fields.push('quantity = ?')
      params.push(quantity)
    }
    if (selected !== undefined) {
      fields.push('selected = ?')
      params.push(selected)
    }

    if (fields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    const sql = `
      UPDATE carts
      SET ${fields.join(', ')}
      WHERE user_id = ? AND product_id = ?
    `
    params.push(user_id, product_id)
    const result = await conMysql(sql, params)

    if (result.affectedRows === 0) {
      return res.cc(false, '购物车项不存在', 404)
    }

    res.cc(true, '更新购物车成功', 200)
  } catch (err) {
    next(err)
  }
}

// 移除购物车项
exports.removeCartItem = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { product_id } = req.body

    if (!product_id) {
      return res.cc(false, '缺少商品ID', 400)
    }

    const sql = `
      DELETE FROM carts
      WHERE user_id = ? AND product_id = ?
    `
    const result = await conMysql(sql, [user_id, product_id])

    if (result.affectedRows === 0) {
      return res.cc(false, '购物车项不存在', 404)
    }

    res.cc(true, '移除购物车成功', 200)
  } catch (err) {
    next(err)
  }
}

// 订单列表（当前用户，带分页）
exports.listOrders = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page, pageSize, offset } = parsePagination(req)

    const countSql = `
      SELECT COUNT(*) AS total
      FROM orders
      WHERE user_id = ?
    `
    const [{ total }] = await conMysql(countSql, [user_id])

    const listSql = `
      SELECT 
        id,
        order_number,
        user_id,
        address_id,
        total_amount,
        status,
        payment_method,
        payment_time,
        shipped_time,
        delivered_time,
        cancelled_time,
        created_at,
        updated_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await conMysql(listSql, [user_id, pageSize, offset])

    res.cc(true, '获取订单列表成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 订单详情（包含订单项）
exports.getOrderDetail = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少订单ID', 400)
    }

    const orderSql = `
      SELECT
        o.*,
        a.recipient_name,
        a.phone,
        a.province,
        a.city,
        a.district,
        a.detail_address,
        a.postal_code
      FROM orders o
      JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ? AND o.user_id = ?
    `
    const orders = await conMysql(orderSql, [id, user_id])
    if (!orders.length) {
      return res.cc(false, '订单不存在', 404)
    }
    const order = orders[0]

    const itemsSql = `
      SELECT 
        oi.*,
        p.name,
        p.cover_image
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `
    const items = await conMysql(itemsSql, [id])

    res.cc(true, '获取订单详情成功', 200, {
      order,
      items
    })
  } catch (err) {
    next(err)
  }
}

// ==================== 地址管理 ====================

// 获取用户地址列表
exports.listAddresses = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const sql = `
      SELECT
        id AS address_id,
        user_id,
        recipient_name,
        phone,
        province,
        city,
        district,
        detail_address,
        postal_code,
        is_default,
        created_at,
        updated_at
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `
    const rows = await conMysql(sql, [user_id])
    res.cc(true, '获取地址列表成功', 200, rows)
  } catch (err) {
    next(err)
  }
}

// 添加地址
exports.addAddress = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { recipient_name, phone, province, city, district, detail_address, postal_code, is_default } = req.body

    if (!recipient_name || !phone || !province || !city || !district || !detail_address) {
      return res.cc(false, '请填写完整的地址信息', 400)
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (is_default) {
      await conMysql(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
        [user_id]
      )
    }

    const sql = `
      INSERT INTO addresses
        (user_id, recipient_name, phone, province, city, district, detail_address, postal_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(sql, [
      user_id,
      recipient_name,
      phone,
      province,
      city,
      district,
      detail_address,
      postal_code || '',
      is_default ? 1 : 0
    ])

    res.cc(true, '添加地址成功', 200, { address_id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 更新地址
exports.updateAddress = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params
    const { recipient_name, phone, province, city, district, detail_address, postal_code, is_default } = req.body

    if (!id) {
      return res.cc(false, '缺少地址ID', 400)
    }

    // 验证地址是否属于当前用户
    const checkSql = 'SELECT id FROM addresses WHERE id = ? AND user_id = ?'
    const checkResult = await conMysql(checkSql, [id, user_id])
    if (!checkResult.length) {
      return res.cc(false, '地址不存在或无权限', 404)
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (is_default) {
      await conMysql(
        'UPDATE addresses SET is_default = 0 WHERE user_id = ? AND address_id != ?',
        [user_id, id]
      )
    }

    const fields = []
    const params = []

    if (recipient_name !== undefined) {
      fields.push('recipient_name = ?')
      params.push(recipient_name)
    }
    if (phone !== undefined) {
      fields.push('phone = ?')
      params.push(phone)
    }
    if (province !== undefined) {
      fields.push('province = ?')
      params.push(province)
    }
    if (city !== undefined) {
      fields.push('city = ?')
      params.push(city)
    }
    if (district !== undefined) {
      fields.push('district = ?')
      params.push(district)
    }
    if (detail_address !== undefined) {
      fields.push('detail_address = ?')
      params.push(detail_address)
    }
    if (postal_code !== undefined) {
      fields.push('postal_code = ?')
      params.push(postal_code)
    }
    if (is_default !== undefined) {
      fields.push('is_default = ?')
      params.push(is_default ? 1 : 0)
    }

    if (fields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id, user_id)

    const sql = `
      UPDATE addresses
      SET ${fields.join(', ')}
      WHERE id = ? AND user_id = ?
    `
    await conMysql(sql, params)

    res.cc(true, '更新地址成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除地址
exports.deleteAddress = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少地址ID', 400)
    }

    const sql = 'DELETE FROM addresses WHERE id = ? AND user_id = ?'
    const result = await conMysql(sql, [id, user_id])

    if (result.affectedRows === 0) {
      return res.cc(false, '地址不存在或无权限', 404)
    }

    res.cc(true, '删除地址成功', 200)
  } catch (err) {
    next(err)
  }
}

// ==================== 订单管理 ====================

// 创建订单
exports.createOrder = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { address_id, payment_method = '模拟支付', cart_items } = req.body

    if (!address_id) {
      return res.cc(false, '请选择收货地址', 400)
    }

    // 验证地址是否属于当前用户
    const addressSql = 'SELECT * FROM addresses WHERE id = ? AND user_id = ?'
    const addresses = await conMysql(addressSql, [address_id, user_id])
    if (!addresses.length) {
      return res.cc(false, '地址不存在或无权限', 404)
    }

    // 获取购物车商品（如果未提供 cart_items，则从购物车获取）
    let items = []
    if (cart_items && cart_items.length > 0) {
      // 使用提供的商品列表
      items = cart_items
    } else {
      // 从购物车获取选中的商品
      const cartSql = `
        SELECT 
          c.product_id,
          c.quantity,
          p.name,
          p.price,
          p.stock
        FROM carts c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ? AND c.selected = 1
      `
      items = await conMysql(cartSql, [user_id])
    }

    if (items.length === 0) {
      return res.cc(false, '购物车为空，请先添加商品', 400)
    }

    // 验证库存并计算总金额
    let total_amount = 0
    for (const item of items) {
      if (item.stock < item.quantity) {
        return res.cc(false, `商品"${item.name}"库存不足`, 400)
      }
      total_amount += item.price * item.quantity
    }

    // 生成订单号
    const order_number = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // 开始事务：创建订单
    const orderSql = `
      INSERT INTO orders 
        (order_number, user_id, address_id, total_amount, payment_method, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `
    const orderResult = await conMysql(orderSql, [
      order_number,
      user_id,
      address_id,
      total_amount,
      payment_method
    ])
    const order_id = orderResult.insertId

    // 创建订单项并更新库存
    for (const item of items) {
      // 插入订单项
      const itemSql = `
        INSERT INTO order_items 
          (order_id, product_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `
      await conMysql(itemSql, [order_id, item.product_id, item.quantity, item.price, item.price * item.quantity])

      // 更新商品库存
      await conMysql(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      )

      // 从购物车删除（如果是从购物车创建的订单）
      if (!cart_items) {
        await conMysql(
          'DELETE FROM carts WHERE user_id = ? AND product_id = ?',
          [user_id, item.product_id]
        )
      }
    }

    res.cc(true, '创建订单成功', 200, {
      order_id,
      order_number,
      total_amount
    })
  } catch (err) {
    next(err)
  }
}

// 支付订单
exports.payOrder = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少订单ID', 400)
    }

    // 验证订单是否属于当前用户且状态为待支付
    const orderSql = 'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    const orders = await conMysql(orderSql, [id, user_id])
    if (!orders.length) {
      return res.cc(false, '订单不存在或无权限', 404)
    }

    const order = orders[0]
    if (order.status !== 'pending') {
      return res.cc(false, `订单状态为"${order.status}"，无法支付`, 400)
    }

    // 更新订单状态为已支付
    const updateSql = `
      UPDATE orders 
      SET status = 'paid', payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    await conMysql(updateSql, [id, user_id])

    res.cc(true, '支付成功', 200)
  } catch (err) {
    next(err)
  }
}

// 确认收货
exports.confirmOrder = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少订单ID', 400)
    }

    // 验证订单是否属于当前用户且状态为已发货
    const orderSql = 'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    const orders = await conMysql(orderSql, [id, user_id])
    if (!orders.length) {
      return res.cc(false, '订单不存在或无权限', 404)
    }

    const order = orders[0]
    if (order.status !== 'shipped') {
      return res.cc(false, `订单状态为"${order.status}"，无法确认收货`, 400)
    }

    // 更新订单状态为已完成
    const updateSql = `
      UPDATE orders 
      SET status = 'completed', delivered_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    await conMysql(updateSql, [id, user_id])

    res.cc(true, '确认收货成功', 200)
  } catch (err) {
    next(err)
  }
}

// 取消订单
exports.cancelOrder = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少订单ID', 400)
    }

    // 验证订单是否属于当前用户
    const orderSql = 'SELECT * FROM orders WHERE id = ? AND user_id = ?'
    const orders = await conMysql(orderSql, [id, user_id])
    if (!orders.length) {
      return res.cc(false, '订单不存在或无权限', 404)
    }

    const order = orders[0]
    if (!['pending', 'paid'].includes(order.status)) {
      return res.cc(false, `订单状态为"${order.status}"，无法取消`, 400)
    }

    // 恢复库存
    const itemsSql = 'SELECT product_id, quantity FROM order_items WHERE order_id = ?'
    const items = await conMysql(itemsSql, [id])
    for (const item of items) {
      await conMysql(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [item.quantity, item.product_id]
      )
    }

    // 更新订单状态为已取消
    const updateSql = `
      UPDATE orders 
      SET status = 'cancelled', cancelled_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `
    await conMysql(updateSql, [id, user_id])

    res.cc(true, '取消订单成功', 200)
  } catch (err) {
    next(err)
  }
}

// ==================== 商品评价 ====================

// 获取商品评价列表
exports.listProductReviews = async (req, res, next) => {
  try {
    const { product_id } = req.query
    const { page, pageSize, offset } = parsePagination(req)

    if (!product_id) {
      return res.cc(false, '缺少商品ID', 400)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM product_reviews
      WHERE product_id = ? AND is_approved = 1
    `
    const [{ total }] = await conMysql(countSql, [product_id])

    const listSql = `
      SELECT 
        r.id,
        r.user_id,
        r.product_id,
        r.rating,
        r.content,
        r.images,
        r.is_approved,
        r.created_at,
        u.username,
        u.avatar
      FROM product_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? AND r.is_approved = 1
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await conMysql(listSql, [product_id, pageSize, offset])

    res.cc(true, '获取评价列表成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 添加商品评价
exports.addProductReview = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { product_id, order_id, rating, content, images } = req.body

    if (!product_id || !rating) {
      return res.cc(false, '请填写商品ID和评分', 400)
    }

    if (rating < 1 || rating > 5) {
      return res.cc(false, '评分必须在1-5之间', 400)
    }

    // 验证用户是否购买过该商品（如果提供了订单ID）
    if (order_id) {
      const orderSql = `
        SELECT oi.id
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.id = ? AND o.user_id = ? AND oi.product_id = ? AND o.status = 'completed'
      `
      const orderItems = await conMysql(orderSql, [order_id, user_id, product_id])
      if (!orderItems.length) {
        return res.cc(false, '您尚未购买该商品或订单未完成', 400)
      }
    }

    // 检查是否已评价
    const checkSql = 'SELECT id FROM product_reviews WHERE user_id = ? AND product_id = ?'
    const existing = await conMysql(checkSql, [user_id, product_id])
    if (existing.length > 0) {
      return res.cc(false, '您已评价过该商品', 400)
    }

    const sql = `
      INSERT INTO product_reviews 
        (user_id, product_id, order_id, rating, content, images, is_approved)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `
    const result = await conMysql(sql, [
      user_id,
      product_id,
      order_id || null,
      rating,
      content || '',
      images ? JSON.stringify(images) : null
    ])

    res.cc(true, '评价成功', 200, { id: result.insertId })
  } catch (err) {
    next(err)
  }
}

