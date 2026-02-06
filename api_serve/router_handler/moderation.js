const { conMysql } = require('../db/index')
const moderationService = require('../utils/moderationService')

// 获取审核队列列表
exports.getModerationQueue = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, status = 'pending', priority, content_type } = req.query
    const offset = (page - 1) * pageSize

    let whereConditions = ['status = ?']
    const params = [status]

    if (priority) {
      whereConditions.push('priority = ?')
      params.push(priority)
    }

    if (content_type) {
      whereConditions.push('content_type = ?')
      params.push(content_type)
    }

    const whereClause = whereConditions.join(' AND ')

    const sql = `
      SELECT
        mq.*,
        u.username,
        u.avatar_url,
        CASE
          WHEN mq.content_type = 'post' THEN p.title
          WHEN mq.content_type = 'comment' THEN CONCAT('Comment on post ', c.post_id)
          ELSE 'Unknown content'
        END as content_title,
        CASE
          WHEN mq.assigned_moderator_id IS NOT NULL THEN um.username
          ELSE NULL
        END as assigned_moderator_name
      FROM moderation_queue mq
      LEFT JOIN users u ON mq.user_id = u.id
      LEFT JOIN users um ON mq.assigned_moderator_id = um.id
      LEFT JOIN posts p ON mq.content_type = 'post' AND mq.content_id = p.id
      LEFT JOIN comments c ON mq.content_type = 'comment' AND mq.content_id = c.id
      WHERE ${whereClause}
      ORDER BY
        CASE mq.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'low' THEN 4
        END,
        mq.created_at ASC
      LIMIT ? OFFSET ?
    `

    const countSql = `SELECT COUNT(*) as total FROM moderation_queue WHERE ${whereClause}`

    const [queue, totalResult] = await Promise.all([
      conMysql(sql, [...params, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, params)
    ])

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取审核队列成功', 200, {
      queue,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        currentPage: parseInt(page),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (err) {
    next(err)
  }
}

// 获取审核队列详情
exports.getModerationQueueDetail = async (req, res, next) => {
  try {
    const { queue_id } = req.query
    if (!queue_id) return res.cc(false, '缺少 queue_id 参数', 400)

    const sql = `
      SELECT
        mq.*,
        u.username,
        u.avatar_url,
        u.bio,
        CASE
          WHEN mq.content_type = 'post' THEN p.title
          WHEN mq.content_type = 'comment' THEN CONCAT('Comment on post ', c.post_id)
          ELSE 'Unknown content'
        END as content_title,
        CASE
          WHEN mq.content_type = 'post' THEN p.content_html
          WHEN mq.content_type = 'comment' THEN c.content_html
          ELSE NULL
        END as full_content_html,
        CASE
          WHEN mq.content_type = 'post' THEN p.content_text
          WHEN mq.content_type = 'comment' THEN c.content_text
          ELSE NULL
        END as full_content_text
      FROM moderation_queue mq
      LEFT JOIN users u ON mq.user_id = u.id
      LEFT JOIN posts p ON mq.content_type = 'post' AND mq.content_id = p.id
      LEFT JOIN comments c ON mq.content_type = 'comment' AND mq.content_id = c.id
      WHERE mq.id = ?
    `

    const [queueItem] = await conMysql(sql, [queue_id])
    if (!queueItem) return res.cc(false, '审核队列项目不存在', 404)

    res.cc(true, '获取审核队列详情成功', 200, { queueItem })
  } catch (err) {
    next(err)
  }
}

// 审核内容（批准或拒绝）
exports.reviewContent = async (req, res, next) => {
  try {
    const { queue_id, action, reason } = req.body
    const moderator_id = req.user.id

    if (!queue_id || !action) {
      return res.cc(false, '缺少必要参数', 400)
    }

    if (!['approve', 'reject', 'escalate'].includes(action)) {
      return res.cc(false, '无效的审核动作', 400)
    }

    // 获取审核队列项目
    const [queueItem] = await conMysql('SELECT * FROM moderation_queue WHERE id = ?', [queue_id])
    if (!queueItem) {
      return res.cc(false, '审核队列项目不存在', 404)
    }

    if (queueItem.status !== 'pending') {
      return res.cc(false, '该内容已被审核过了', 400)
    }

    // 开始事务
    const connection = await conMysql.getConnection()
    await connection.beginTransaction()

    try {
      let moderationAction = 'manual_approve'
      let newStatus = 'approved'
      let updateFields = ['moderation_status = ?, moderated_at = NOW(), moderated_by = ?']
      let updateValues = [newStatus, moderator_id]

      if (action === 'reject') {
        moderationAction = 'manual_reject'
        newStatus = 'rejected'
        updateFields.push('violation_reason = ?')
        updateValues.push(reason || '人工审核拒绝')
      } else if (action === 'escalate') {
        // 升级处理，暂时保持pending状态
        await connection.rollback()
        return res.cc(false, '升级功能暂未实现', 400)
      }

      // 更新内容状态
      if (queueItem.content_type === 'post') {
        const updateSql = `UPDATE posts SET ${updateFields.join(', ')} WHERE id = ?`
        await connection.execute(updateSql, [...updateValues, queueItem.content_id])
      } else if (queueItem.content_type === 'comment') {
        const updateSql = `UPDATE comments SET ${updateFields.join(', ')} WHERE id = ?`
        await connection.execute(updateSql, [...updateValues, queueItem.content_id])
      }

      // 更新审核队列状态
      await connection.execute(
        'UPDATE moderation_queue SET status = ?, assigned_moderator_id = ?, updated_at = NOW() WHERE id = ?',
        [action === 'approve' ? 'approved' : 'rejected', moderator_id, queue_id]
      )

      // 记录审核日志
      await connection.execute(`
        INSERT INTO moderation_logs
        (content_type, content_id, user_id, moderator_id, action, reason, severity_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        queueItem.content_type,
        queueItem.content_id,
        queueItem.user_id,
        moderator_id,
        moderationAction,
        reason || (action === 'approve' ? '人工审核通过' : '人工审核拒绝'),
        queueItem.severity_score
      ])

      // 更新用户审核统计
      const userAction = action === 'approve' ? 'approved' : 'rejected'
      await moderationService.updateUserModerationStats(queueItem.user_id, userAction, queueItem.severity_score)

      await connection.commit()
      res.cc(true, `内容已${action === 'approve' ? '批准' : '拒绝'}`, 200)

    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

  } catch (err) {
    next(err)
  }
}

// 分配审核任务给审核员
exports.assignModerationTask = async (req, res, next) => {
  try {
    const { queue_id, moderator_id } = req.body

    if (!queue_id || !moderator_id) {
      return res.cc(false, '缺少必要参数', 400)
    }

    // 检查审核员是否存在且有审核权限（这里简化为检查用户存在）
    const [moderator] = await conMysql('SELECT id FROM users WHERE id = ?', [moderator_id])
    if (!moderator) {
      return res.cc(false, '指定的审核员不存在', 400)
    }

    const result = await conMysql(
      'UPDATE moderation_queue SET assigned_moderator_id = ?, updated_at = NOW() WHERE id = ? AND status = "pending"',
      [moderator_id, queue_id]
    )

    if (result.affectedRows === 0) {
      return res.cc(false, '审核任务分配失败，可能任务不存在或已被审核', 400)
    }

    res.cc(true, '审核任务分配成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取审核统计信息
exports.getModerationStats = async (req, res, next) => {
  try {
    const stats = {}

    // 审核队列统计
    const queueStats = await conMysql(`
      SELECT
        status,
        COUNT(*) as count
      FROM moderation_queue
      GROUP BY status
    `)
    stats.queue = queueStats.reduce((acc, row) => {
      acc[row.status] = row.count
      return acc
    }, {})

    // 审核员工作量统计（最近7天）
    const moderatorStats = await conMysql(`
      SELECT
        moderator_id,
        u.username,
        COUNT(*) as reviewed_count
      FROM moderation_logs ml
      JOIN users u ON ml.moderator_id = u.id
      WHERE ml.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND ml.moderator_id IS NOT NULL
      GROUP BY ml.moderator_id, u.username
      ORDER BY reviewed_count DESC
    `)
    stats.moderators = moderatorStats

    // 内容类型审核统计（最近30天）
    const contentStats = await conMysql(`
      SELECT
        content_type,
        action,
        COUNT(*) as count
      FROM moderation_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY content_type, action
    `)
    stats.content = contentStats

    res.cc(true, '获取审核统计成功', 200, stats)
  } catch (err) {
    next(err)
  }
}

// 获取所有帖子（包括审核状态）- 审核员专用
exports.getAllPostsForModeration = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, moderation_status, sort = 'new' } = req.query
    const offset = (page - 1) * pageSize

    let whereConditions = ['(p.is_draft IS NULL OR p.is_draft = 0)']
    const params = []

    if (moderation_status) {
      whereConditions.push('p.moderation_status = ?')
      params.push(moderation_status)
    }

    const whereClause = whereConditions.join(' AND ')

    let orderBy = 'p.created_at DESC'
    switch (sort) {
      case 'old':
        orderBy = 'p.created_at ASC'
        break
      case 'score':
        orderBy = 'p.moderation_score DESC, p.created_at DESC'
        break
      case 'new':
      default:
        orderBy = 'p.created_at DESC'
        break
    }

    const sql = `
      SELECT
        p.id AS post_id,
        p.title,
        p.content_html,
        p.content_text,
        p.moderation_status,
        p.moderation_score,
        p.moderated_at,
        p.violation_reason,
        p.created_at,
        p.updated_at,
        u.id AS user_id,
        u.username,
        u.avatar_url,
        s.name AS subreddit_name,
        COUNT(DISTINCT c.id) AS comment_count,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'up' THEN v.id END) AS upvotes,
        COUNT(DISTINCT CASE WHEN v.vote_type = 'down' THEN v.id END) AS downvotes,
        um.username AS moderated_by_name
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN votes v ON v.post_id = p.id
      LEFT JOIN users um ON p.moderated_by = um.id
      WHERE ${whereClause}
      GROUP BY p.id, u.id, s.id, um.id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `

    const countSql = `SELECT COUNT(*) as total FROM posts p WHERE ${whereClause}`

    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [...params, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, params)
    ])

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取帖子列表成功', 200, {
      posts,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        currentPage: parseInt(page),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (err) {
    next(err)
  }
}

// 管理敏感词库

// 获取敏感词列表
exports.getSensitiveWords = async (req, res, next) => {
  try {
    const { category, page = 1, pageSize = 50 } = req.query
    const offset = (page - 1) * pageSize

    let whereClause = ''
    const params = []

    if (category) {
      whereClause = 'WHERE category = ?'
      params.push(category)
    }

    const sql = `
      SELECT * FROM sensitive_words
      ${whereClause}
      ORDER BY category, severity DESC, word
      LIMIT ? OFFSET ?
    `

    const countSql = `SELECT COUNT(*) as total FROM sensitive_words ${whereClause}`

    const [words, totalResult] = await Promise.all([
      conMysql(sql, [...params, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, params)
    ])

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取敏感词列表成功', 200, {
      words,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        currentPage: parseInt(page),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (err) {
    next(err)
  }
}

// 添加敏感词
exports.addSensitiveWord = async (req, res, next) => {
  try {
    const { word, category, severity } = req.body

    if (!word || !category || !severity) {
      return res.cc(false, '缺少必要参数', 400)
    }

    const sql = `
      INSERT INTO sensitive_words (word, category, severity, is_active)
      VALUES (?, ?, ?, TRUE)
    `

    await conMysql(sql, [word.trim(), category, severity])
    await moderationService.refreshCache() // 刷新缓存

    res.cc(true, '敏感词添加成功', 200)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.cc(false, '敏感词已存在', 400)
    }
    next(err)
  }
}

// 更新敏感词
exports.updateSensitiveWord = async (req, res, next) => {
  try {
    const { id, word, category, severity, is_active } = req.body

    if (!id) return res.cc(false, '缺少敏感词ID', 400)

    const updateFields = []
    const updateValues = []

    if (word !== undefined) {
      updateFields.push('word = ?')
      updateValues.push(word.trim())
    }
    if (category !== undefined) {
      updateFields.push('category = ?')
      updateValues.push(category)
    }
    if (severity !== undefined) {
      updateFields.push('severity = ?')
      updateValues.push(severity)
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?')
      updateValues.push(is_active)
    }

    if (updateFields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    updateFields.push('updated_at = NOW()')
    updateValues.push(id)

    const sql = `UPDATE sensitive_words SET ${updateFields.join(', ')} WHERE id = ?`
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows === 0) {
      return res.cc(false, '敏感词不存在', 404)
    }

    await moderationService.refreshCache() // 刷新缓存
    res.cc(true, '敏感词更新成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除敏感词
exports.deleteSensitiveWord = async (req, res, next) => {
  try {
    const { id } = req.body
    if (!id) return res.cc(false, '缺少敏感词ID', 400)

    const result = await conMysql('DELETE FROM sensitive_words WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.cc(false, '敏感词不存在', 404)
    }

    await moderationService.refreshCache() // 刷新缓存
    res.cc(true, '敏感词删除成功', 200)
  } catch (err) {
    next(err)
  }
}

// 管理审核规则

// 获取审核规则列表
exports.getModerationRules = async (req, res, next) => {
  try {
    const sql = 'SELECT * FROM moderation_rules ORDER BY priority DESC, created_at DESC'
    const rules = await conMysql(sql)

    // 解析JSON配置
    const rulesWithConfig = rules.map(rule => ({
      ...rule,
      rule_config: JSON.parse(rule.rule_config)
    }))

    res.cc(true, '获取审核规则成功', 200, { rules: rulesWithConfig })
  } catch (err) {
    next(err)
  }
}

// 添加审核规则
exports.addModerationRule = async (req, res, next) => {
  try {
    const { rule_name, rule_type, rule_config, severity_score, action, priority } = req.body

    if (!rule_name || !rule_type || !rule_config) {
      return res.cc(false, '缺少必要参数', 400)
    }

    const sql = `
      INSERT INTO moderation_rules
      (rule_name, rule_type, rule_config, severity_score, action, priority, is_active)
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
    `

    await conMysql(sql, [
      rule_name,
      rule_type,
      JSON.stringify(rule_config),
      severity_score || 0,
      action || 'queue',
      priority || 0
    ])

    await moderationService.refreshCache() // 刷新缓存
    res.cc(true, '审核规则添加成功', 200)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.cc(false, '规则名称已存在', 400)
    }
    next(err)
  }
}

// 更新审核规则
exports.updateModerationRule = async (req, res, next) => {
  try {
    const { id, rule_name, rule_type, rule_config, severity_score, action, priority, is_active } = req.body

    if (!id) return res.cc(false, '缺少规则ID', 400)

    const updateFields = []
    const updateValues = []

    if (rule_name !== undefined) {
      updateFields.push('rule_name = ?')
      updateValues.push(rule_name)
    }
    if (rule_type !== undefined) {
      updateFields.push('rule_type = ?')
      updateValues.push(rule_type)
    }
    if (rule_config !== undefined) {
      updateFields.push('rule_config = ?')
      updateValues.push(JSON.stringify(rule_config))
    }
    if (severity_score !== undefined) {
      updateFields.push('severity_score = ?')
      updateValues.push(severity_score)
    }
    if (action !== undefined) {
      updateFields.push('action = ?')
      updateValues.push(action)
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?')
      updateValues.push(priority)
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?')
      updateValues.push(is_active)
    }

    if (updateFields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    updateFields.push('updated_at = NOW()')
    updateValues.push(id)

    const sql = `UPDATE moderation_rules SET ${updateFields.join(', ')} WHERE id = ?`
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows === 0) {
      return res.cc(false, '审核规则不存在', 404)
    }

    await moderationService.refreshCache() // 刷新缓存
    res.cc(true, '审核规则更新成功', 200)
  } catch (err) {
    next(err)
  }
}

// 删除审核规则
exports.deleteModerationRule = async (req, res, next) => {
  try {
    const { id } = req.body
    if (!id) return res.cc(false, '缺少规则ID', 400)

    const result = await conMysql('DELETE FROM moderation_rules WHERE id = ?', [id])

    if (result.affectedRows === 0) {
      return res.cc(false, '审核规则不存在', 404)
    }

    await moderationService.refreshCache() // 刷新缓存
    res.cc(true, '审核规则删除成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取用户审核统计
exports.getUserModerationStats = async (req, res, next) => {
  try {
    const { user_id } = req.query
    if (!user_id) return res.cc(false, '缺少用户ID', 400)

    const stats = await moderationService.getUserModerationStats(user_id)

    if (!stats) {
      return res.cc(false, '用户审核统计不存在', 404)
    }

    res.cc(true, '获取用户审核统计成功', 200, { stats })
  } catch (err) {
    next(err)
  }
}

// 批量审核内容
exports.bulkReviewContent = async (req, res, next) => {
  try {
    const { queue_ids, action, reason } = req.body
    const moderator_id = req.user.id

    if (!queue_ids || !Array.isArray(queue_ids) || queue_ids.length === 0 || !action) {
      return res.cc(false, '缺少必要参数', 400)
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.cc(false, '无效的审核动作', 400)
    }

    const connection = await conMysql.getConnection()
    await connection.beginTransaction()

    try {
      let successCount = 0
      const errors = []

      for (const queue_id of queue_ids) {
        try {
          // 获取审核队列项目
          const [queueItem] = await connection.execute(
            'SELECT * FROM moderation_queue WHERE id = ? AND status = "pending"',
            [queue_id]
          )

          if (!queueItem.length) {
            errors.push(`队列项目 ${queue_id} 不存在或已审核`)
            continue
          }

          const item = queueItem[0]
          let moderationAction = 'manual_approve'
          let newStatus = 'approved'

          if (action === 'reject') {
            moderationAction = 'manual_reject'
            newStatus = 'rejected'
          }

          // 更新内容状态
          if (item.content_type === 'post') {
            await connection.execute(
              'UPDATE posts SET moderation_status = ?, moderated_at = NOW(), moderated_by = ?, violation_reason = ? WHERE id = ?',
              [newStatus, moderator_id, action === 'reject' ? (reason || '批量审核拒绝') : null, item.content_id]
            )
          } else if (item.content_type === 'comment') {
            await connection.execute(
              'UPDATE comments SET moderation_status = ?, moderated_at = NOW(), moderated_by = ?, violation_reason = ? WHERE id = ?',
              [newStatus, moderator_id, action === 'reject' ? (reason || '批量审核拒绝') : null, item.content_id]
            )
          }

          // 更新审核队列状态
          await connection.execute(
            'UPDATE moderation_queue SET status = ?, assigned_moderator_id = ?, updated_at = NOW() WHERE id = ?',
            [newStatus, moderator_id, queue_id]
          )

          // 记录审核日志
          await connection.execute(`
            INSERT INTO moderation_logs
            (content_type, content_id, user_id, moderator_id, action, reason, severity_score)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            item.content_type,
            item.content_id,
            item.user_id,
            moderator_id,
            moderationAction,
            reason || (action === 'approve' ? '批量审核通过' : '批量审核拒绝'),
            item.severity_score
          ])

          successCount++
        } catch (itemError) {
          errors.push(`队列项目 ${queue_id} 处理失败: ${itemError.message}`)
        }
      }

      await connection.commit()

      res.cc(true, `批量审核完成，成功处理 ${successCount} 项${errors.length > 0 ? `，失败 ${errors.length} 项` : ''}`, 200, {
        success_count: successCount,
        error_count: errors.length,
        errors: errors.length > 0 ? errors : undefined
      })

    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }

  } catch (err) {
    next(err)
  }
}
