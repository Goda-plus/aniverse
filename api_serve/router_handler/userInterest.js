const { conMysql } = require('../db/index')

/**
 * 获取用户的兴趣标签列表
 */
exports.getUserInterests = async (req, res, next) => {
  try {
    const user_id = req.user.id
    
    const sql = `
      SELECT 
        ui.id,
        ui.tag_id,
        ui.weight,
        ui.source,
        ui.created_at,
        t.name AS tag_name,
        t.category AS tag_category,
        t.description AS tag_description
      FROM user_interests ui
      INNER JOIN tags t ON ui.tag_id = t.id
      WHERE ui.user_id = ?
      ORDER BY ui.weight DESC, ui.created_at DESC
    `
    
    const interests = await conMysql(sql, [user_id])
    
    res.cc(true, '获取兴趣标签成功', 200, { interests })
  } catch (err) {
    next(err)
  }
}

/**
 * 添加兴趣标签
 */
exports.addUserInterest = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { tag_id, weight = 1.0 } = req.body
    
    if (!tag_id) {
      return res.cc(false, '缺少标签ID', 400)
    }
    
    // 检查标签是否存在
    const [tag] = await conMysql('SELECT id FROM tags WHERE id = ?', [tag_id])
    if (!tag) {
      return res.cc(false, '标签不存在', 404)
    }
    
    // 检查是否已添加
    const [exist] = await conMysql(
      'SELECT id FROM user_interests WHERE user_id = ? AND tag_id = ?',
      [user_id, tag_id]
    )
    
    if (exist) {
      return res.cc(false, '该标签已添加', 400)
    }
    
    // 添加兴趣标签
    const sql = `
      INSERT INTO user_interests (user_id, tag_id, weight, source)
      VALUES (?, ?, ?, 'manual')
    `
    await conMysql(sql, [user_id, tag_id, weight])
    
    res.cc(true, '添加兴趣标签成功', 201)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.cc(false, '该标签已添加', 400)
    }
    next(err)
  }
}

/**
 * 删除兴趣标签
 */
exports.removeUserInterest = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { tag_id } = req.params
    
    const sql = 'DELETE FROM user_interests WHERE user_id = ? AND tag_id = ?'
    const result = await conMysql(sql, [user_id, tag_id])
    
    if (result.affectedRows === 0) {
      return res.cc(false, '未找到对应的兴趣标签', 404)
    }
    
    res.cc(true, '删除兴趣标签成功', 200)
  } catch (err) {
    next(err)
  }
}

/**
 * 更新兴趣标签权重
 */
exports.updateInterestWeight = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { tag_id } = req.params
    const { weight } = req.body
    
    if (weight === undefined || weight < 0 || weight > 2) {
      return res.cc(false, '权重值必须在0-2之间', 400)
    }
    
    const sql = `
      UPDATE user_interests
      SET weight = ?, updated_at = NOW()
      WHERE user_id = ? AND tag_id = ?
    `
    const result = await conMysql(sql, [weight, user_id, tag_id])
    
    if (result.affectedRows === 0) {
      return res.cc(false, '未找到对应的兴趣标签', 404)
    }
    
    res.cc(true, '更新权重成功', 200)
  } catch (err) {
    next(err)
  }
}

/**
 * 批量添加兴趣标签
 */
exports.batchAddInterests = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { tag_ids } = req.body
    
    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.cc(false, '标签ID列表不能为空', 400)
    }
    
    // 检查标签是否存在
    const placeholders = tag_ids.map(() => '?').join(',')
    const existingTags = await conMysql(
      `SELECT id FROM tags WHERE id IN (${placeholders})`,
      tag_ids
    )
    const existingTagIds = new Set(existingTags.map(t => t.id))
    
    const invalidTags = tag_ids.filter(id => !existingTagIds.has(id))
    if (invalidTags.length > 0) {
      return res.cc(false, `以下标签不存在: ${invalidTags.join(', ')}`, 400)
    }
    
    // 获取已存在的标签
    const existingInterests = await conMysql(
      `SELECT tag_id FROM user_interests WHERE user_id = ? AND tag_id IN (${placeholders})`,
      [user_id, ...tag_ids]
    )
    const existingInterestIds = new Set(existingInterests.map(e => e.tag_id))
    
    // 只添加不存在的标签
    const newTagIds = tag_ids.filter(id => !existingInterestIds.has(id))
    
    if (newTagIds.length === 0) {
      return res.cc(false, '所有标签已添加', 400)
    }
    
    // 批量插入
    const values = newTagIds.map(tag_id => [user_id, tag_id, 1.0, 'manual'])
    const insertSql = `
      INSERT INTO user_interests (user_id, tag_id, weight, source)
      VALUES ?
    `
    await conMysql(insertSql, [values])
    
    res.cc(true, '批量添加兴趣标签成功', 201, {
      added: newTagIds.length,
      skipped: existingInterestIds.size
    })
  } catch (err) {
    next(err)
  }
}

/**
 * 获取推荐标签（基于用户行为自动推荐）
 */
exports.getRecommendedTags = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { limit = 10 } = req.query
    
    // 基于用户收藏的作品的标签进行推荐
    const sql = `
      SELECT 
        t.id,
        t.name,
        t.category,
        t.description,
        COUNT(DISTINCT mt.media_id) AS media_count,
        COUNT(DISTINCT f.id) AS user_favorite_count
      FROM tags t
      INNER JOIN media_tags mt ON t.id = mt.tag_id
      INNER JOIN favorites f ON mt.media_id = f.target_id 
        AND f.target_type = 'media' 
        AND f.user_id = ?
      LEFT JOIN user_interests ui ON t.id = ui.tag_id AND ui.user_id = ?
      WHERE ui.id IS NULL
      GROUP BY t.id, t.name, t.category, t.description
      HAVING media_count > 0
      ORDER BY user_favorite_count DESC, media_count DESC
      LIMIT ?
    `
    
    const recommendedTags = await conMysql(sql, [user_id, user_id, parseInt(limit)])
    
    res.cc(true, '获取推荐标签成功', 200, { tags: recommendedTags })
  } catch (err) {
    next(err)
  }
}

