const { conMysql } = require('../db/index')

// 添加或更新浏览记录
exports.addOrUpdateHistory = async (req, res, next) => {
  try {
    const { target_type, target_id } = req.body
    const user_id = req.user.id

    // 检查是否存在 visit_count 字段
    const checkColumnSql = `
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'browse_history' 
        AND COLUMN_NAME = 'visit_count'
    `
    const [columnCheck] = await conMysql(checkColumnSql)
    const hasVisitCount = columnCheck && columnCheck.count > 0

    // 根据字段是否存在，使用不同的SQL
    let sql
    if (hasVisitCount) {
      // 如果存在 visit_count 字段，更新时增加访问次数
      sql = `
        INSERT INTO browse_history (user_id, target_type, target_id, visit_count)
        VALUES (?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
          last_visited_at = CURRENT_TIMESTAMP,
          visit_count = visit_count + 1
      `
    } else {
      // 如果不存在 visit_count 字段，使用原来的SQL
      sql = `
        INSERT INTO browse_history (user_id, target_type, target_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE last_visited_at = CURRENT_TIMESTAMP
      `
    }
    
    await conMysql(sql, [user_id, target_type, target_id])

    res.cc(true, '记录浏览历史成功', 201)
  } catch (err) {
    next(err)
  }
}

// 获取当前用户的浏览历史记录
exports.getBrowseHistory = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10 } = req.query
    const offset = (page - 1) * pageSize

    // 获取浏览历史中的帖子（假设 target_type = 'post'）
    const sql = `
      SELECT 
        p.id AS post_id,
        p.title,
        p.content_html,
        p.content_text,
        p.image_url,
        p.created_at,
        p.updated_at,
        u.id AS user_id,
        u.username,
        u.avatar_url,
        u.bio,
        s.name as subreddit_name,
        bh.last_visited_at,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM votes v_up WHERE v_up.post_id = p.id AND v_up.vote_type = 'up') AS upvotes,
        (SELECT COUNT(*) FROM votes v_down WHERE v_down.post_id = p.id AND v_down.vote_type = 'down') AS downvotes,
        (SELECT vote_type FROM votes v_user WHERE v_user.post_id = p.id AND v_user.user_id = ? LIMIT 1) AS user_vote
      FROM browse_history bh
      INNER JOIN posts p ON bh.target_id = p.id AND bh.target_type = 'post'
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE bh.user_id = ?
      GROUP BY p.id, u.id, s.id, bh.last_visited_at
      ORDER BY bh.last_visited_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) as total 
      FROM browse_history
      WHERE user_id = ? AND target_type = 'post'
    `
    
    const [posts, totalResult] = await Promise.all([
      conMysql(sql, [user_id, user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])

    // 计算净点赞数和用户投票状态
    const postsWithNetVotes = posts.map(post => ({
      ...post,
      net_votes: Number(post.upvotes - post.downvotes),
      user_vote: post.user_vote === 'up' ? 1 : post.user_vote === 'down' ? -1 : 0
    }))

    const total = totalResult[0].total
    const totalPages = Math.ceil(total / pageSize)

    res.cc(true, '获取历史记录成功', 200, {
      posts: postsWithNetVotes,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (err) {
    next(err)
  }
}

// 删除指定浏览记录
exports.deleteHistoryItem = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { target_type, target_id } = req.body

    const sql = `
      DELETE FROM browse_history
      WHERE user_id = ? AND target_type = ? AND target_id = ?
    `
    const result = await conMysql(sql, [user_id, target_type, target_id])

    if (result.affectedRows === 0) {
      return res.cc(false, '未找到对应的浏览记录', 404)
    }

    res.cc(true, '删除浏览记录成功', 200)
  } catch (err) {
    next(err)
  }
}

// 获取用户活动历史
exports.getUserActivities = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10, activity_type } = req.query
    const offset = (page - 1) * pageSize

    // 获取用户发布的帖子
    const postsSql = `
      SELECT
        'post_created' as activity_type,
        p.id as activity_id,
        p.title as title,
        p.content_text as content,
        p.image_url,
        p.created_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        s.name as subreddit_name,
        NULL as vote_type
      FROM posts p
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `

    // 获取用户的评论
    const commentsSql = `
      SELECT
        'comment_created' as activity_type,
        c.id as activity_id,
        p.title as title,
        c.content as content,
        NULL as image_url,
        c.created_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        s.name as subreddit_name,
        NULL as vote_type
      FROM comments c
      INNER JOIN posts p ON c.post_id = p.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `

    // 获取用户的投票
    const votesSql = `
      SELECT
        'vote' as activity_type,
        v.id as activity_id,
        p.title as title,
        NULL as content,
        p.image_url,
        v.created_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        s.name as subreddit_name,
        v.vote_type
      FROM votes v
      INNER JOIN posts p ON v.post_id = p.id
      LEFT JOIN subreddits s ON p.subreddit_id = s.id
      WHERE v.user_id = ?
      ORDER BY v.created_at DESC
    `

    // 获取用户加入的subreddit
    const subredditsSql = `
      SELECT
        'subreddit_joined' as activity_type,
        sm.id as activity_id,
        s.name as title,
        s.description as content,
        s.image_url as image_url,
        sm.joined_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        NULL as subreddit_name,
        NULL as vote_type
      FROM subreddit_members sm
      INNER JOIN subreddits s ON sm.subreddit_id = s.id
      WHERE sm.user_id = ?
      ORDER BY sm.joined_at DESC
    `

    // 获取用户收藏的角色
    const characterFavoritesSql = `
      SELECT
        'favorite_character' as activity_type,
        f.id as activity_id,
        c.name_native as title,
        c.description as content,
        c.image_medium as image_url,
        f.created_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        '角色' as subreddit_name,
        NULL as vote_type
      FROM favorites f
      INNER JOIN characters c ON f.target_id = c.id
      WHERE f.user_id = ? AND f.target_type = 'character'
      ORDER BY f.created_at DESC
    `

    // 获取用户收藏的名场面
    const sceneFavoritesSql = `
      SELECT
        'favorite_scene_moment' as activity_type,
        f.id as activity_id,
        sm.title,
        sm.description as content,
        sm.image_url,
        f.created_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        '名场面' as subreddit_name,
        NULL as vote_type
      FROM favorites f
      INNER JOIN scene_moments sm ON f.target_id = sm.id
      WHERE f.user_id = ? AND f.target_type = 'scene_moment'
      ORDER BY f.created_at DESC
    `

    // 获取用户点赞的名场面
    const sceneLikesSql = `
      SELECT
        'like_scene_moment' as activity_type,
        sml.id as activity_id,
        sm.title,
        sm.description as content,
        sm.image_url,
        sml.created_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        '名场面' as subreddit_name,
        NULL as vote_type
      FROM scene_moment_likes sml
      INNER JOIN scene_moments sm ON sml.scene_id = sm.id
      WHERE sml.user_id = ?
      ORDER BY sml.created_at DESC
    `

    // 获取用户创建的名场面
    const sceneCreatedSql = `
      SELECT
        'scene_moment_created' as activity_type,
        sm.id as activity_id,
        sm.title,
        sm.description as content,
        sm.image_url,
        sm.created_at as activity_time,
        NULL as target_title,
        NULL as target_content,
        '名场面' as subreddit_name,
        NULL as vote_type
      FROM scene_moments sm
      WHERE sm.submitter_id = ?
      ORDER BY sm.created_at DESC
    `

    // 分别执行所有查询
    const [
      posts, comments, votes, subreddits,
      characterFavorites, sceneFavorites, sceneLikes, sceneCreated
    ] = await Promise.all([
      conMysql(postsSql, [user_id]),
      conMysql(commentsSql, [user_id]),
      conMysql(votesSql, [user_id]),
      conMysql(subredditsSql, [user_id]),
      conMysql(characterFavoritesSql, [user_id]),
      conMysql(sceneFavoritesSql, [user_id]),
      conMysql(sceneLikesSql, [user_id]),
      conMysql(sceneCreatedSql, [user_id])
    ])

    // 合并所有活动并按时间排序
    let allActivities = [
      ...posts.map(p => ({ ...p, activity_time: new Date(p.activity_time) })),
      ...comments.map(c => ({ ...c, activity_time: new Date(c.activity_time) })),
      ...votes.map(v => ({ ...v, activity_time: new Date(v.activity_time) })),
      ...subreddits.map(s => ({ ...s, activity_time: new Date(s.activity_time) })),
      ...characterFavorites.map(cf => ({ ...cf, activity_time: new Date(cf.activity_time) })),
      ...sceneFavorites.map(sf => ({ ...sf, activity_time: new Date(sf.activity_time) })),
      ...sceneLikes.map(sl => ({ ...sl, activity_time: new Date(sl.activity_time) })),
      ...sceneCreated.map(sc => ({ ...sc, activity_time: new Date(sc.activity_time) }))
    ]

    // 根据 activity_type 过滤活动
    if (activity_type && activity_type !== 'all') {
      const activityTypeMap = {
        posts: ['post_created'],
        community: ['subreddit_joined'],
        anime: ['vote'], // 动漫相关的投票
        characters: ['favorite_character'], // 角色收藏
        scenes: ['favorite_scene_moment', 'like_scene_moment', 'scene_moment_created'] // 名场面相关活动
      }

      const allowedTypes = activityTypeMap[activity_type] || []
      if (allowedTypes.length > 0) {
        allActivities = allActivities.filter(activity => allowedTypes.includes(activity.activity_type))
      }
    }

    // 按时间倒序排序
    allActivities.sort((a, b) => b.activity_time - a.activity_time)

    // 分页处理
    const activities = allActivities.slice(parseInt(offset), parseInt(offset) + parseInt(pageSize))

    // 计算总数 - 根据过滤条件调整
    let total = 0
    if (!activity_type || activity_type === 'all') {
      // 获取所有活动的总数
      const countQueries = await Promise.all([
        conMysql('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [user_id]),
        conMysql('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', [user_id]),
        conMysql('SELECT COUNT(*) as count FROM votes WHERE user_id = ?', [user_id]),
        conMysql('SELECT COUNT(*) as count FROM subreddit_members WHERE user_id = ?', [user_id]),
        conMysql('SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND target_type = "character"', [user_id]),
        conMysql('SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND target_type = "scene_moment"', [user_id]),
        conMysql('SELECT COUNT(*) as count FROM scene_moment_likes WHERE user_id = ?', [user_id]),
        conMysql('SELECT COUNT(*) as count FROM scene_moments WHERE submitter_id = ?', [user_id])
      ])
      total = countQueries.reduce((sum, result) => sum + result[0].count, 0)
    } else {
      // 根据过滤条件计算总数
      const activityTypeMap = {
        posts: 'SELECT COUNT(*) as count FROM posts WHERE user_id = ?',
        community: 'SELECT COUNT(*) as count FROM subreddit_members WHERE user_id = ?',
        anime: 'SELECT COUNT(*) as count FROM votes WHERE user_id = ?',
        characters: 'SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND target_type = "character"',
        scenes: `
          SELECT COUNT(*) as count FROM (
            SELECT f.id FROM favorites f WHERE f.user_id = ? AND f.target_type = 'scene_moment'
            UNION ALL
            SELECT sml.id FROM scene_moment_likes sml WHERE sml.user_id = ?
            UNION ALL
            SELECT sm.id FROM scene_moments sm WHERE sm.submitter_id = ?
          ) as combined
        `
      }

      const countSql = activityTypeMap[activity_type]
      if (countSql) {
        const params = activity_type === 'scenes' ? [user_id, user_id, user_id] : [user_id]
        const [result] = await conMysql(countSql, params)
        total = result.count
      }
    }
    const totalPages = Math.ceil(total / pageSize)

    // 为每种活动类型添加用户友好的描述
    const activitiesWithDescriptions = activities.map(activity => {
      let description = ''
      let icon = ''
      let action = ''

      switch (activity.activity_type) {
        case 'post_created': {
          description = `在 ${'r/' + activity.subreddit_name || '动态'} 发布了帖子`
          icon = 'post'
          action = '发布了'
          break
        }
        case 'comment_created': {
          description = `在帖子"${activity.title}"下发表了评论`
          icon = 'comment'
          action = '评论了'
          break
        }
        case 'vote': {
          const voteText = activity.vote_type === 'up' ? '点赞了' : '点踩了'
          description = `${voteText}帖子"${activity.title}"`
          icon = activity.vote_type === 'up' ? 'thumbs-up' : 'thumbs-down'
          action = voteText
          break
        }
        case 'subreddit_joined': {
          description = `加入了社区 r/${activity.title}`
          icon = 'user-plus'
          action = '加入了'
          break
        }
        case 'favorite_character': {
          description = `收藏了角色"${activity.title}"`
          icon = 'star'
          action = '收藏了'
          break
        }
        case 'favorite_scene_moment': {
          description = `收藏了名场面"${activity.title}"`
          icon = 'star'
          action = '收藏了'
          break
        }
        case 'like_scene_moment': {
          description = `点赞了名场面"${activity.title}"`
          icon = 'thumbs-up'
          action = '点赞了'
          break
        }
        case 'scene_moment_created': {
          description = `创建了名场面"${activity.title}"`
          icon = 'plus'
          action = '创建了'
          break
        }
      }

      return {
        ...activity,
        description,
        icon,
        action,
        activity_time: activity.activity_time
      }
    })

    res.cc(true, '获取用户活动历史成功', 200, {
      activities: activitiesWithDescriptions,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (err) {
    next(err)
  }
}


// 获取用户统计数据
exports.getUserStatistics = async (req, res, next) => {
  try {
    const user_id = req.user.id

    // 获取今日日期
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD 格式

    // 获取总发帖数
    const totalPostsSql = 'SELECT COUNT(*) as count FROM posts WHERE user_id = ?'
    const [totalPostsResult] = await conMysql(totalPostsSql, [user_id])
    const totalPosts = totalPostsResult.count

    // 获取今日发帖数
    const todayPostsSql = 'SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND DATE(created_at) = ?'
    const [todayPostsResult] = await conMysql(todayPostsSql, [user_id, todayStr])
    const todayPosts = todayPostsResult.count

    // 获取今日名场面贡献数（创建名场面 + 点赞名场面 + 收藏名场面）
    const todayScenesSql = `
      SELECT COUNT(*) as count FROM (
        SELECT id FROM scene_moments WHERE submitter_id = ? AND DATE(created_at) = ?
        UNION ALL
        SELECT sml.id FROM scene_moment_likes sml WHERE sml.user_id = ? AND DATE(sml.created_at) = ?
        UNION ALL
        SELECT f.id FROM favorites f WHERE f.user_id = ? AND f.target_type = 'scene_moment' AND DATE(f.created_at) = ?
      ) as combined
    `
    const [todayScenesResult] = await conMysql(todayScenesSql, [user_id, todayStr, user_id, todayStr, user_id, todayStr])
    const todayScenes = todayScenesResult.count

    res.cc(true, '获取用户统计数据成功', 200, {
      totalPosts,
      todayPosts,
      todayScenes
    })
  } catch (err) {
    next(err)
  }
}

// 删除当前用户所有历史记录
exports.clearAllHistory = async (req, res, next) => {
  try {
    const user_id = req.user.id

    const sql = 'DELETE FROM browse_history WHERE user_id = ?'
    await conMysql(sql, [user_id])

    res.cc(true, '已清空所有浏览历史', 200)
  } catch (err) {
    next(err)
  }
}
