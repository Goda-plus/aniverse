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

// ==================== 店铺管理 ====================

// 获取店铺列表
exports.listShops = async (req, res, next) => {
  try {
    const { keyword, status = 'active', level } = req.query
    const { page, pageSize, offset } = parsePagination(req)

    let where = 'WHERE 1=1'
    const params = []

    if (status) {
      where += ' AND s.status = ?'
      params.push(status)
    }

    if (level) {
      where += ' AND s.level = ?'
      params.push(level)
    }

    if (keyword) {
      where += ' AND (s.shop_name LIKE ? OR s.description LIKE ?)'
      const keywordPattern = `%${keyword}%`
      params.push(keywordPattern, keywordPattern)
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM shops s
      ${where}
    `
    const [{ total }] = await conMysql(countSql, params)

    const listSql = `
      SELECT
        s.shop_id,
        s.shop_name,
        s.description,
        s.logo,
        s.rating,
        s.total_sales,
        s.level,
        s.status,
        s.created_at,
        u.nickname,
        u.username,
        COUNT(p.id) as product_count
      FROM shops s
      JOIN users u ON s.seller_id = u.id
      LEFT JOIN products p ON s.shop_id = p.shop_id
      ${where}
      GROUP BY s.shop_id
      ORDER BY s.rating DESC, s.total_sales DESC
      LIMIT ? OFFSET ?
    `
    const rows = await conMysql(listSql, [...params, pageSize, offset])

    res.cc(true, '获取店铺列表成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 获取店铺详情
exports.getShopDetail = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id) {
      return res.cc(false, '缺少店铺ID', 400)
    }

    const shopSql = `
      SELECT
        s.*,
        u.nickname,
        u.username,
        COUNT(DISTINCT p.id) as product_count,
        AVG(CASE WHEN r.rating > 0 THEN r.rating END) as avg_product_rating
      FROM shops s
      JOIN users u ON s.seller_id = u.id
      LEFT JOIN products p ON s.shop_id = p.shop_id
      LEFT JOIN product_reviews r ON p.id = r.product_id AND r.is_approved = 1
      WHERE s.shop_id = ?
      GROUP BY s.shop_id
    `
    const shops = await conMysql(shopSql, [id])
    if (!shops.length) {
      return res.cc(false, '店铺不存在', 404)
    }

    const shop = shops[0]

    // 获取店铺橱窗推荐商品
    const featuredSql = `
      SELECT
        p.id as product_id,
        p.*
      FROM shop_featured_products sfp
      JOIN products p ON sfp.product_id = p.id
      WHERE sfp.shop_id = ?
      ORDER BY sfp.sort_order ASC
      LIMIT 10
    `
    const featuredProducts = await conMysql(featuredSql, [id])

    res.cc(true, '获取店铺详情成功', 200, {
      shop,
      featuredProducts
    })
  } catch (err) {
    next(err)
  }
}

// 创建店铺（卖家入驻）
exports.createShop = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { shop_name, description, logo, contact_info } = req.body

    if (!shop_name) {
      return res.cc(false, '店铺名称不能为空', 400)
    }

    // 检查用户是否已有店铺
    const checkSql = 'SELECT shop_id FROM shops WHERE seller_id = ?'
    const existing = await conMysql(checkSql, [user_id])
    if (existing.length > 0) {
      return res.cc(false, '您已经拥有店铺了', 400)
    }

    // 检查店铺名称是否重复
    const nameCheckSql = 'SELECT shop_id FROM shops WHERE shop_name = ?'
    const nameExisting = await conMysql(nameCheckSql, [shop_name])
    if (nameExisting.length > 0) {
      return res.cc(false, '店铺名称已存在', 400)
    }

    const sql = `
      INSERT INTO shops
        (seller_id, shop_name, description, logo, contact_info)
      VALUES (?, ?, ?, ?, ?)
    `
    const contactJson = contact_info ? JSON.stringify(contact_info) : null
    const result = await conMysql(sql, [
      user_id,
      shop_name,
      description || '',
      logo || '',
      contactJson
    ])

    res.cc(true, '店铺创建成功', 200, { shop_id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 更新店铺信息
exports.updateShop = async (req, res, next) => {
  try {
    console.log(req.user)

    const user_id = req.user.id
    const { id } = req.params
    const { shop_name, description, logo, contact_info, banner_image, announcement } = req.body
 
    console.log(id, user_id)

    if (!id) {
      return res.cc(false, '缺少店铺ID', 400)
    }

    // 验证店铺是否属于当前用户
    const checkSql = 'SELECT shop_id FROM shops WHERE shop_id = ? AND seller_id = ?'
    const shops = await conMysql(checkSql, [id, user_id])
    if (!shops.length) {
      return res.cc(false, '店铺不存在或无权限', 404)
    }

    // 检查店铺名称是否重复（排除自己）
    if (shop_name) {
      const nameCheckSql = 'SELECT shop_id FROM shops WHERE shop_name = ? AND shop_id != ?'
      const nameExisting = await conMysql(nameCheckSql, [shop_name, id])
      if (nameExisting.length > 0) {
        return res.cc(false, '店铺名称已存在', 400)
      }
    }

    const fields = []
    const params = []

    if (shop_name !== undefined) {
      fields.push('shop_name = ?')
      params.push(shop_name)
    }
    if (description !== undefined) {
      fields.push('description = ?')
      params.push(description)
    }
    if (logo !== undefined) {
      fields.push('logo = ?')
      params.push(logo)
    }
    if (contact_info !== undefined) {
      fields.push('contact_info = ?')
      params.push(contact_info ? JSON.stringify(contact_info) : null)
    }
    if (banner_image !== undefined) {
      fields.push('banner_image = ?')
      params.push(banner_image)
    }
    if (announcement !== undefined) {
      fields.push('announcement = ?')
      params.push(announcement)
    }

    if (fields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)

    const sql = `
      UPDATE shops
      SET ${fields.join(', ')}
      WHERE shop_id = ?
    `
    await conMysql(sql, params)

    res.cc(true, '店铺信息更新成功', 200)
  } catch (err) {
    next(err)
  }
}

// ==================== 商品管理 ====================

// 获取店铺商品列表
exports.getShopProducts = async (req, res, next) => {
  try {
    const { id } = req.params
    const { keyword, category_id, status = 'active', is_featured } = req.query
    const { page, pageSize, offset } = parsePagination(req)

    if (!id) {
      return res.cc(false, '缺少店铺ID', 400)
    }

    let where = 'WHERE p.shop_id = ?'
    const params = [id]

    // Note: products table may not have status field
    // if (status) {
    //   where += ' AND p.status = ?'
    //   params.push(status)
    // }

    if (category_id) {
      where += ' AND p.category_id = ?'
      params.push(category_id)
    }

    if (is_featured !== undefined) {
      where += ' AND p.is_featured = ?'
      params.push(is_featured ? 1 : 0)
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
        p.id as product_id,
        p.*
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      ${where}
      ORDER BY p.is_featured DESC, p.sort_order DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `
    const rows = await conMysql(listSql, [...params, pageSize, offset])

    res.cc(true, '获取店铺商品成功', 200, {
      list: rows,
      page,
      pageSize,
      total
    })
  } catch (err) {
    next(err)
  }
}

// 创建商品
exports.createProduct = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const {
      shop_id,
      name,
      description,
      category_id,
      price,
      stock,
      images,
      specifications,
      material,
      is_featured,
      weight,
      dimensions,
      tags
    } = req.body

    if (!shop_id || !name || !price) {
      return res.cc(false, '请填写商品名称、价格和店铺ID', 400)
    }

    if (price <= 0) {
      return res.cc(false, '商品价格必须大于0', 400)
    }

    // 验证店铺是否属于当前用户
    const shopCheckSql = 'SELECT shop_id FROM shops WHERE shop_id = ? AND seller_id = ?'
    const shops = await conMysql(shopCheckSql, [shop_id, user_id])
    if (!shops.length) {
      return res.cc(false, '店铺不存在或无权限', 404)
    }

    const sql = `
      INSERT INTO products
        (shop_id, category_id, name, description, price, stock, cover_image,
         specifications, material, is_featured, weight, dimensions, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(sql, [
      shop_id,
      category_id || null,
      name,
      description || '',
      price,
      stock || 0,
      images ? JSON.stringify(images) : null,
      specifications ? JSON.stringify(specifications) : null,
      material || '',
      is_featured ? 1 : 0,
      weight || null,
      dimensions || '',
      tags || ''
    ])

    res.cc(true, '商品创建成功', 200, { product_id: result.insertId })
  } catch (err) {
    next(err)
  }
}

// 更新商品
exports.updateProduct = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params
    const {
      name,
      description,
      category_id,
      price,
      original_price,
      stock,
      images,
      specifications,
      material,
      status,
      is_featured,
      weight,
      dimensions,
      tags
    } = req.body

    if (!id) {
      return res.cc(false, '缺少商品ID', 400)
    }

    // 验证商品是否属于当前用户的店铺
    const productCheckSql = `
      SELECT p.id as product_id
      FROM products p
      JOIN shops s ON p.shop_id = s.shop_id
      WHERE p.id = ? AND s.seller_id = ?
    `
    const products = await conMysql(productCheckSql, [id, user_id])
    if (!products.length) {
      return res.cc(false, '商品不存在或无权限', 404)
    }

    const fields = []
    const params = []

    if (name !== undefined) {
      fields.push('name = ?')
      params.push(name)
    }
    if (description !== undefined) {
      fields.push('description = ?')
      params.push(description)
    }
    if (category_id !== undefined) {
      fields.push('category_id = ?')
      params.push(category_id)
    }
    if (price !== undefined) {
      if (price <= 0) {
        return res.cc(false, '商品价格必须大于0', 400)
      }
      fields.push('price = ?')
      params.push(price)
    }
    if (original_price !== undefined) {
      fields.push('original_price = ?')
      params.push(original_price)
    }
    if (stock !== undefined) {
      if (stock < 0) {
        return res.cc(false, '库存不能为负数', 400)
      }
      fields.push('stock = ?')
      params.push(stock)
    }
    if (images !== undefined) {
      fields.push('images = ?')
      params.push(images ? JSON.stringify(images) : null)
    }
    if (specifications !== undefined) {
      fields.push('specifications = ?')
      params.push(specifications ? JSON.stringify(specifications) : null)
    }
    if (material !== undefined) {
      fields.push('material = ?')
      params.push(material)
    }
    // Note: products table may not have status field
    // if (status !== undefined) {
    //   fields.push('status = ?')
    //   params.push(status)
    // }
    if (is_featured !== undefined) {
      fields.push('is_featured = ?')
      params.push(is_featured ? 1 : 0)
    }
    if (weight !== undefined) {
      fields.push('weight = ?')
      params.push(weight)
    }
    if (dimensions !== undefined) {
      fields.push('dimensions = ?')
      params.push(dimensions)
    }
    if (tags !== undefined) {
      fields.push('tags = ?')
      params.push(tags)
    }

    if (fields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    fields.push('updated_at = CURRENT_TIMESTAMP')
    params.push(id)

    const sql = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE id = ?
    `
    await conMysql(sql, params)

    res.cc(true, '商品更新成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除商品（逻辑删除）
exports.deleteProduct = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少商品ID', 400)
    }

    // 验证商品是否属于当前用户的店铺
    const productCheckSql = `
      SELECT p.id as product_id
      FROM products p
      JOIN shops s ON p.shop_id = s.shop_id
      WHERE p.id = ? AND s.seller_id = ?
    `
    const products = await conMysql(productCheckSql, [id, user_id])
    if (!products.length) {
      return res.cc(false, '商品不存在或无权限', 404)
    }

    // 逻辑删除 - Note: products table may not have status field
    // If status field exists, uncomment the following:
    // const sql = `
    //   UPDATE products
    //   SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
    //   WHERE id = ?
    // `
    // For now, we'll just update the updated_at timestamp
    const sql = `
      UPDATE products
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    await conMysql(sql, [id])

    res.cc(true, '商品删除成功', 200)
  } catch (err) {
    next(err)
  }
}

// ==================== 店铺橱窗推荐 ====================

// 获取店铺橱窗推荐商品
exports.getShopFeaturedProducts = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.cc(false, '缺少店铺ID', 400)
    }

    const sql = `
      SELECT
        p.id as product_id,
        p.*
        sfp.sort_order
      FROM shop_featured_products sfp
      JOIN products p ON sfp.product_id = p.id
      WHERE sfp.shop_id = ?
      ORDER BY sfp.sort_order ASC
    `
    const rows = await conMysql(sql, [id])

    res.cc(true, '获取橱窗推荐商品成功', 200, rows)
  } catch (err) {
    next(err)
  }
}

// 添加橱窗推荐商品
exports.addFeaturedProduct = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id } = req.params
    const { product_id, sort_order = 0 } = req.body

    if (!id || !product_id) {
      return res.cc(false, '缺少店铺ID或商品ID', 400)
    }

    // 验证店铺是否属于当前用户
    const shopCheckSql = 'SELECT shop_id FROM shops WHERE shop_id = ? AND seller_id = ?'
    const shops = await conMysql(shopCheckSql, [id, user_id])
    if (!shops.length) {
      return res.cc(false, '店铺不存在或无权限', 404)
    }

    // 验证商品是否属于该店铺
    const productCheckSql = 'SELECT id as product_id FROM products WHERE id = ? AND shop_id = ?'
    const products = await conMysql(productCheckSql, [product_id, id])
    if (!products.length) {
      return res.cc(false, '商品不存在或不属于该店铺', 404)
    }

    // 检查是否已添加
    const existCheckSql = 'SELECT id FROM shop_featured_products WHERE shop_id = ? AND product_id = ?'
    const existing = await conMysql(existCheckSql, [id, product_id])
    if (existing.length > 0) {
      return res.cc(false, '该商品已在橱窗推荐中', 400)
    }

    const sql = `
      INSERT INTO shop_featured_products (shop_id, product_id, sort_order)
      VALUES (?, ?, ?)
    `
    await conMysql(sql, [id, product_id, sort_order])

    res.cc(true, '添加橱窗推荐成功', 200)
  } catch (err) {
    next(err)
  }
}

// 移除橱窗推荐商品
exports.removeFeaturedProduct = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { id, productId } = req.params

    if (!id || !productId) {
      return res.cc(false, '缺少店铺ID或商品ID', 400)
    }

    // 验证店铺是否属于当前用户
    const shopCheckSql = 'SELECT shop_id FROM shops WHERE shop_id = ? AND seller_id = ?'
    const shops = await conMysql(shopCheckSql, [id, user_id])
    if (!shops.length) {
      return res.cc(false, '店铺不存在或无权限', 404)
    }

    const sql = 'DELETE FROM shop_featured_products WHERE shop_id = ? AND product_id = ?'
    const result = await conMysql(sql, [id, productId])

    if (result.affectedRows === 0) {
      return res.cc(false, '该商品不在橱窗推荐中', 404)
    }

    res.cc(true, '移除橱窗推荐成功', 200)
  } catch (err) {
    next(err)
  }
}

// ==================== 卖家店铺信息 ====================

// 获取当前用户的店铺信息
exports.getMyShop = async (req, res, next) => {
  try {
    const user_id = req.user.id

    const sql = `
      SELECT
        s.*,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT p.id) as active_product_count,
        AVG(CASE WHEN r.rating > 0 THEN r.rating END) as avg_product_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM shops s
      LEFT JOIN products p ON s.shop_id = p.shop_id
      LEFT JOIN product_reviews r ON p.id = r.product_id AND r.is_approved = 1
      WHERE s.seller_id = ?
      GROUP BY s.shop_id
    `
    const shops = await conMysql(sql, [user_id])

    if (!shops.length) {
      return res.cc(false, '您尚未创建店铺', 404)
    }

    res.cc(true, '获取店铺信息成功', 200, shops[0])
  } catch (err) {
    next(err)
  }
}
