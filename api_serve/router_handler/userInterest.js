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
        ui.tags,
        ui.genre,
        ui.weight,
        ui.source,
        ui.created_at,
        ui.updated_at
      FROM user_interests ui
      WHERE ui.user_id = ?
      ORDER BY ui.weight DESC, ui.created_at DESC
    `

    const [userInterest] = await conMysql(sql, [user_id])

    if (!userInterest) {
      return res.cc(true, '获取兴趣标签成功', 200, { interests: [] })
    }

    // 解析JSON数组并获取标签详情
    const tagIds = JSON.parse(userInterest.tags || '[]')
    const genres = JSON.parse(userInterest.genre || '[]')

    if (tagIds.length === 0) {
      return res.cc(true, '获取兴趣标签成功', 200, {
        interests: [],
        genres: genres
      })
    }

    // 获取标签详情
    const placeholders = tagIds.map(() => '?').join(',')
    const tagSql = `
      SELECT
        id,
        name,
        category,
        description
      FROM tags
      WHERE id IN (${placeholders})
      ORDER BY FIELD(id, ${placeholders})
    `
    const tags = await conMysql(tagSql, [...tagIds, ...tagIds])

    // 构建返回结果
    const interests = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      category: tag.category,
      description: tag.description,
      weight: userInterest.weight,
      source: userInterest.source,
      created_at: userInterest.created_at,
      updated_at: userInterest.updated_at
    }))

    res.cc(true, '获取兴趣标签成功', 200, {
      interests,
      genres,
      total_tags: tagIds.length
    })
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
    const { tag_id, genre } = req.body

    if (!tag_id) {
      return res.cc(false, '缺少标签ID', 400)
    }

    // 检查标签是否存在
    const [tag] = await conMysql('SELECT id, category FROM tags WHERE id = ?', [tag_id])
    if (!tag) {
      return res.cc(false, '标签不存在', 404)
    }

    // 获取用户的兴趣记录
    const [userInterest] = await conMysql(
      'SELECT id, tags, genre FROM user_interests WHERE user_id = ?',
      [user_id]
    )

    const currentTags = userInterest ? JSON.parse(userInterest.tags || '[]') : []
    const currentGenres = userInterest ? JSON.parse(userInterest.genre || '[]') : []

    // 检查标签是否已存在
    if (currentTags.includes(tag_id)) {
      return res.cc(false, '该标签已添加', 400)
    }

    // 添加新标签
    currentTags.push(tag_id)

    // 处理分类（如果提供了genre参数或自动从tag的category获取）
    let newGenres = [...currentGenres]
    if (genre) {
      if (Array.isArray(genre)) {
        newGenres = [...new Set([...newGenres, ...genre])]
      } else {
        if (!newGenres.includes(genre)) {
          newGenres.push(genre)
        }
      }
    } else if (tag.category && !newGenres.includes(tag.category)) {
      newGenres.push(tag.category)
    }

    if (userInterest) {
      // 更新现有记录
      const updateSql = `
        UPDATE user_interests
        SET tags = ?, genre = ?, updated_at = NOW()
        WHERE user_id = ?
      `
      await conMysql(updateSql, [
        JSON.stringify(currentTags),
        JSON.stringify(newGenres),
        user_id
      ])
    } else {
      // 创建新记录
      const insertSql = `
        INSERT INTO user_interests (user_id, tags, genre, weight, source)
        VALUES (?, ?, ?, 1.0, 'manual')
      `
      await conMysql(insertSql, [
        user_id,
        JSON.stringify(currentTags),
        JSON.stringify(newGenres)
      ])
    }

    res.cc(true, '添加兴趣标签成功', 201)
  } catch (err) {
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

    // 获取用户的兴趣记录
    const [userInterest] = await conMysql(
      'SELECT id, tags, genre FROM user_interests WHERE user_id = ?',
      [user_id]
    )

    if (!userInterest) {
      return res.cc(false, '未找到用户的兴趣记录', 404)
    }

    const currentTags = JSON.parse(userInterest.tags || '[]')
    const currentGenres = JSON.parse(userInterest.genre || '[]')

    // 检查标签是否存在
    const tagIndex = currentTags.indexOf(parseInt(tag_id))
    if (tagIndex === -1) {
      return res.cc(false, '该标签不在用户的兴趣列表中', 404)
    }

    // 移除标签
    currentTags.splice(tagIndex, 1)

    // 如果没有标签了，删除整条记录；否则更新
    if (currentTags.length === 0) {
      await conMysql('DELETE FROM user_interests WHERE user_id = ?', [user_id])
    } else {
      // 检查是否需要移除相关的分类
      // 获取剩余标签的分类
      if (currentTags.length > 0) {
        const placeholders = currentTags.map(() => '?').join(',')
        const remainingGenres = await conMysql(
          `SELECT DISTINCT category FROM tags WHERE id IN (${placeholders})`,
          currentTags
        )
        const newGenres = remainingGenres.map(g => g.category).filter(g => g)

        const updateSql = `
          UPDATE user_interests
          SET tags = ?, genre = ?, updated_at = NOW()
          WHERE user_id = ?
        `
        await conMysql(updateSql, [
          JSON.stringify(currentTags),
          JSON.stringify(newGenres),
          user_id
        ])
      }
    }

    res.cc(true, '删除兴趣标签成功', 200)
  } catch (err) {
    next(err)
  }
}

/**
 * 更新兴趣标签权重（更新整个兴趣记录的权重）
 */
exports.updateInterestWeight = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { weight } = req.body

    if (weight === undefined || weight < 0 || weight > 2) {
      return res.cc(false, '权重值必须在0-2之间', 400)
    }

    // 检查用户是否有兴趣记录
    const [userInterest] = await conMysql(
      'SELECT id FROM user_interests WHERE user_id = ?',
      [user_id]
    )

    if (!userInterest) {
      return res.cc(false, '用户没有兴趣记录', 404)
    }

    const sql = `
      UPDATE user_interests
      SET weight = ?, updated_at = NOW()
      WHERE user_id = ?
    `
    const result = await conMysql(sql, [weight, user_id])

    if (result.affectedRows === 0) {
      return res.cc(false, '更新权重失败', 404)
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
    const { tag_ids, genres } = req.body

    if (!Array.isArray(tag_ids) || tag_ids.length === 0) {
      return res.cc(false, '标签ID列表不能为空', 400)
    }

    // 检查标签是否存在
    const placeholders = tag_ids.map(() => '?').join(',')
    const existingTags = await conMysql(
      `SELECT id, category FROM tags WHERE id IN (${placeholders})`,
      tag_ids
    )
    const existingTagIds = new Set(existingTags.map(t => t.id))

    const invalidTags = tag_ids.filter(id => !existingTagIds.has(id))
    if (invalidTags.length > 0) {
      return res.cc(false, `以下标签不存在: ${invalidTags.join(', ')}`, 400)
    }

    // 获取用户的兴趣记录
    const [userInterest] = await conMysql(
      'SELECT id, tags, genre FROM user_interests WHERE user_id = ?',
      [user_id]
    )

    const currentTags = userInterest ? JSON.parse(userInterest.tags || '[]') : []
    const currentGenres = userInterest ? JSON.parse(userInterest.genre || '[]') : []

    // 过滤出新标签
    const newTagIds = tag_ids.filter(id => !currentTags.includes(id))

    if (newTagIds.length === 0) {
      return res.cc(false, '所有标签已添加', 400)
    }

    // 合并标签
    const updatedTags = [...currentTags, ...newTagIds]

    // 处理分类
    let updatedGenres = [...currentGenres]
    if (genres && Array.isArray(genres)) {
      updatedGenres = [...new Set([...updatedGenres, ...genres])]
    } else {
      // 从新标签的分类中获取
      const tagCategories = existingTags
        .filter(tag => newTagIds.includes(tag.id))
        .map(tag => tag.category)
        .filter(category => category)
      updatedGenres = [...new Set([...updatedGenres, ...tagCategories])]
    }

    if (userInterest) {
      // 更新现有记录
      const updateSql = `
        UPDATE user_interests
        SET tags = ?, genre = ?, updated_at = NOW()
        WHERE user_id = ?
      `
      await conMysql(updateSql, [
        JSON.stringify(updatedTags),
        JSON.stringify(updatedGenres),
        user_id
      ])
    } else {
      // 创建新记录
      const insertSql = `
        INSERT INTO user_interests (user_id, tags, genre, weight, source)
        VALUES (?, ?, ?, 1.0, 'manual')
      `
      await conMysql(insertSql, [
        user_id,
        JSON.stringify(updatedTags),
        JSON.stringify(updatedGenres)
      ])
    }

    res.cc(true, '批量添加兴趣标签成功', 201, {
      added: newTagIds.length,
      total_tags: updatedTags.length,
      genres: updatedGenres
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

    // 获取用户已有的标签
    const [userInterest] = await conMysql(
      'SELECT tags FROM user_interests WHERE user_id = ?',
      [user_id]
    )

    const existingTagIds = userInterest ? JSON.parse(userInterest.tags || '[]') : []

    // 基于用户收藏的作品的标签进行推荐
    let sql = `
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
      GROUP BY t.id, t.name, t.category, t.description
      HAVING media_count > 0
      ORDER BY user_favorite_count DESC, media_count DESC
      LIMIT ?
    `

    const params = [user_id, parseInt(limit) * 2] // 多取一些用于过滤

    const allRecommendedTags = await conMysql(sql, params)

    // 过滤掉用户已有的标签
    const recommendedTags = allRecommendedTags
      .filter(tag => !existingTagIds.includes(tag.id))
      .slice(0, parseInt(limit))

    res.cc(true, '获取推荐标签成功', 200, { tags: recommendedTags })
  } catch (err) {
    next(err)
  }
}

