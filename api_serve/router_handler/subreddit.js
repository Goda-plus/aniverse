const { conMysql } = require('../db/index')

exports.createSubreddit = async (req, res, next) => {
  try {
    const { name, description, category_id, visibility, is_adult, tag_ids, image_url, media } = req.body
    const created_by = req.user.id

    // 1. 校验分类是否存在（使用 genres 表）
    const genreCheckSql = 'SELECT * FROM genres WHERE id = ?'
    const genres = await conMysql(genreCheckSql, [category_id])
    if (genres.length === 0) {
      return res.cc(false, '分类不存在', 400)
    }

    // 2. 检查板块名是否重复
    const checkSql = 'SELECT * FROM subreddits WHERE name = ?'
    const exists = await conMysql(checkSql, [name])
    if (exists.length > 0) {
      return res.cc(false, '板块名称已存在', 409)
    }

    // 3. 校验板块类型
    const validTypes = ['public', 'restricted', 'private']
    if (!validTypes.includes(visibility)) {
      return res.cc(false, '无效的板块类型（public/restricted/private）', 400)
    }

    // 4. 处理成人标记（转换为布尔类型）
    const adultFlag = is_adult === true || is_adult === 'true' || is_adult === 1

    // 5. 验证标签是否存在并获取标签信息（如果提供了 tag_ids）
    let tagsJson = null
    if (tag_ids && Array.isArray(tag_ids) && tag_ids.length > 0) {
      // 去重
      const uniqueTagIds = [...new Set(tag_ids)]
      
      // 验证标签是否存在并获取标签的 id 和 name
      const placeholders = uniqueTagIds.map(() => '?').join(',')
      const tagCheckSql = `SELECT id, name FROM tags WHERE id IN (${placeholders})`
      const existingTags = await conMysql(tagCheckSql, uniqueTagIds)
      
      if (existingTags.length !== uniqueTagIds.length) {
        return res.cc(false, '部分标签不存在', 400)
      }
      
      // 构建包含 id 和 name 的对象数组
      const tagsData = existingTags.map(tag => ({
        id: tag.id,
        name: tag.name
      }))
      
      // 将标签对象数组转换为JSON字符串
      tagsJson = JSON.stringify(tagsData)
    }

    // 6. 处理media数据（如果提供了media JSON字符串）
    let mediaJson = null
    if (media) {
      // 验证media是否为有效的JSON字符串
      try {
        const mediaData = typeof media === 'string' ? JSON.parse(media) : media
        if (Array.isArray(mediaData) && mediaData.length > 0) {
          // 验证media数据格式：只需要有id即可，因为现在存储完整的动漫数据
          const validMedia = mediaData.filter(item => item && item.id)
          if (validMedia.length > 0) {
            // 存储完整的动漫数据到数据库
            mediaJson = JSON.stringify(validMedia)
          }
        }
      } catch (error) {
        console.error('解析media数据失败:', error)
        // 如果解析失败，mediaJson保持为null
      }
    }

    // 7. 插入板块，使用 genres_id 关联到 genres 表，tags 和 media 存储为 JSON
    const insertSql = `
      INSERT INTO subreddits (name, description, created_by, genres_id, visibility, is_adult, tags, image_url, media)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = await conMysql(insertSql, [
      name,
      description || null,
      created_by,
      category_id,
      visibility,
      adultFlag,
      tagsJson,
      image_url || null,
      mediaJson,
    ])

    if (result.affectedRows !== 1) {
      throw new Error('创建板块失败')
    }

    const subredditId = result.insertId

    // 8. 将创建者添加为板块成员（admin）
    const memberInsertSql = `
      INSERT INTO subreddit_members (user_id, subreddit_id, role)
      VALUES (?, ?, 'admin')
    `
    const memberResult = await conMysql(memberInsertSql, [created_by, subredditId])

    if (memberResult.affectedRows !== 1) {
      throw new Error('创建者添加为板块成员失败')
    }

    // 返回创建的社区信息
    res.cc(true, '板块创建成功', 201, { 
      id: subredditId,
      name: name
    })
  } catch (error) {
    next(error)
  }
}

exports.getMySubreddits = async (req, res, next) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.cc(false, '用户未登录或身份失效', 401)
    }

    const sql = `
      SELECT s.id, s.name, s.description, s.created_at, s.image_url,
             c.ch_name AS category_name,
             s.visibility,
             s.is_adult
      FROM subreddits s
      LEFT JOIN genres c ON s.genres_id = c.id
      WHERE s.created_by = ?
      ORDER BY s.created_at DESC
    `

    const result = await conMysql(sql, [userId])

    res.cc(true, '获取我创建的板块成功', 200, result)
  } catch (error) {
    console.error('获取我创建的板块失败:', error)
    next(error)
  }
}


// 获取全部板块，返回关联分类名称
exports.getAllSubreddits = async (req, res, next) => {
  try {
    // 获取分页参数，设置默认值
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 6
    const offset = (page - 1) * pageSize

    // 查询列表数据的SQL（添加分页限制）
    const listSql = `
      SELECT s.id, s.name, s.description, s.created_at, s.image_url,
        u.username AS created_by,
        c.name AS genres_name
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres c ON s.genres_id = c.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `

    // 查询总数的SQL
    const countSql = `
      SELECT COUNT(*) AS total
      FROM subreddits
    `

    // 执行查询
    const list = await conMysql(listSql, [pageSize, offset])
    const countRes = await conMysql(countSql)
    const total = countRes[0]?.total || 0
    const hasMore = offset + list.length < total

    // 返回结果
    res.cc(true, '获取版块列表成功', 200, {
      list,
      total,
      hasMore,
      page,
      pageSize
    })
  } catch (error) {
    next(error)
  }
}

exports.getSubredditsByCategory = async (req, res, next) => {
  const { category_id } = req.query
  const page = parseInt(req.query.page || 1)
  const pageSize = parseInt(req.query.pageSize || 6)
  const offset = (page - 1) * pageSize

  try {
    const listSql = `
      SELECT s.id, s.name, s.description, s.created_at,
             u.username AS created_by,
             c.ch_name AS category_name,
             u.avatar_url AS category_ava
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres c ON s.genres_id = c.id
      WHERE s.genres_id = ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countSql = `
      SELECT COUNT(*) AS total
      FROM subreddits
      WHERE genres_id = ?
    `

    const list = await conMysql(listSql, [category_id, pageSize, offset])
    const countRes = await conMysql(countSql, [category_id])
    const total = countRes[0]?.total || 0
    const hasMore = offset + list.length < total

    res.cc(true, '获取该分类下板块成功', 200, {
      list,
      total,
      hasMore,
      page,
      pageSize
    })
  } catch (error) {
    next(error)
  }
}

exports.searchSubredditsByName = async (req, res, next) => {
  const { keyword } = req.query
  const page = parseInt(req.query.page) || 1
  const pageSize = parseInt(req.query.pageSize) || 10
  const offset = (page - 1) * pageSize

  try {
    if (!keyword || keyword.trim() === '') {
      return res.cc(false, '搜索关键词不能为空', 400)
    }

    const searchKeyword = `%${keyword.trim()}%`

    // 查询匹配的板块
    const listSql = `
      SELECT s.id, s.name, s.description, s.created_at,
             u.username AS created_by,
             c.ch_name AS category_name
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres c ON s.genres_id = c.id
      WHERE s.name LIKE ? OR s.description LIKE ?
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `

    // 查询总数量
    const countSql = `
      SELECT COUNT(*) AS total
      FROM subreddits
      WHERE name LIKE ? OR description LIKE ?
    `

    const list = await conMysql(listSql, [
      searchKeyword, searchKeyword,
      pageSize, offset
    ])

    const countRes = await conMysql(countSql, [searchKeyword, searchKeyword])
    const total = countRes[0]?.total || 0
    const hasMore = offset + list.length < total

    res.cc(true, '搜索板块成功', 200, {
      list,
      total,
      hasMore,
      page,
      pageSize,
      keyword: keyword.trim()
    })
  } catch (error) {
    console.error('搜索板块失败:', error)
    next(error)
  }
}

exports.getSubredditDetail = async (req, res, next) => {
  const { id } = req.query
  const user_id = req.user?.id
  try {
    if (!id) {
      return res.cc(false, '缺少社区ID参数', 400)
    }

    // 获取社区基本信息
    const subredditSql = `
      SELECT s.id, s.name, s.description, s.created_at,s.image_url,
             u.username AS created_by,
             c.ch_name AS genres_name,
             s.tags AS tags,
             s.media AS media
      FROM subreddits s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN genres c ON s.genres_id = c.id
      WHERE s.id = ?
    `
    const result = await conMysql(subredditSql, [id])

    if (!result || result.length === 0) {
      return res.cc(false, '社区不存在', 404)
    }

    const subreddit = result[0]

    // 获取帖子数量
    const postCountSql = 'SELECT COUNT(*) AS post_count FROM posts WHERE subreddit_id = ?'
    const postCountResult = await conMysql(postCountSql, [id])
    const post_count = postCountResult[0].post_count

    // 获取成员数量
    const memberCountSql = 'SELECT COUNT(*) AS member_count FROM subreddit_members WHERE subreddit_id = ?'
    const memberCountResult = await conMysql(memberCountSql, [id])
    const member_count = memberCountResult[0].member_count

    // 判断当前用户是否已加入该社区，并获取用户角色（仅当已登录）
    let is_joined = false
    let user_role = null
    if (user_id) {
      const checkJoinSql = `
        SELECT role FROM subreddit_members
        WHERE user_id = ? AND subreddit_id = ?
        LIMIT 1
      `
      const joinResult = await conMysql(checkJoinSql, [user_id, id])
      if (joinResult.length > 0) {
        is_joined = true
        user_role = joinResult[0].role
      }
    }

    const detailResult = {
      ...subreddit,
      member_count,
      post_count,
      is_joined,
      user_role,
    }

    res.cc(true, '获取社区详情成功', 200, detailResult)
  } catch (error) {
    console.error('获取社区详情失败:', error)
    res.cc(false, '获取社区详情失败: ' + error.message, 500)
  }
}

// 更新社区信息
exports.updateSubreddit = async (req, res, next) => {
  try {
    const subredditId = parseInt(req.params.id)
    const userId = req.user?.id
    const { name, description, visibility, is_adult, image_url } = req.body

    // 1. 验证用户是否登录
    if (!userId) {
      return res.cc(false, '用户未登录或身份失效', 401)
    }

    // 2. 验证社区ID
    if (!subredditId || isNaN(subredditId)) {
      return res.cc(false, '无效的社区ID', 400)
    }

    // 3. 查询社区是否存在，并验证用户是否是创建者或管理员
    const checkSql = 'SELECT id, name, created_by FROM subreddits WHERE id = ?'
    const subreddit = await conMysql(checkSql, [subredditId])

    if (!subreddit || subreddit.length === 0) {
      return res.cc(false, '社区不存在', 404)
    }

    const subredditData = subreddit[0]

    // 4. 验证用户是否是社区创建者或管理员
    const isCreator = subredditData.created_by === userId
    
    // 检查是否是管理员
    let isAdmin = false
    if (!isCreator) {
      const adminCheckSql = `
        SELECT * FROM subreddit_members 
        WHERE user_id = ? AND subreddit_id = ? AND role = 'admin'
      `
      const adminResult = await conMysql(adminCheckSql, [userId, subredditId])
      isAdmin = adminResult.length > 0
    }

    if (!isCreator && !isAdmin) {
      return res.cc(false, '只有社区创建者或管理员才能更新社区信息', 403)
    }

    // 5. 如果更新了名称，检查名称是否重复
    if (name && name !== subredditData.name) {
      const nameCheckSql = 'SELECT * FROM subreddits WHERE name = ? AND id != ?'
      const nameExists = await conMysql(nameCheckSql, [name, subredditId])
      if (nameExists.length > 0) {
        return res.cc(false, '社区名称已存在', 409)
      }
    }

    // 6. 验证板块类型（如果提供了）
    if (visibility) {
      const validTypes = ['public', 'restricted', 'private']
      if (!validTypes.includes(visibility)) {
        return res.cc(false, '无效的板块类型（public/restricted/private）', 400)
      }
    }

    // 7. 处理成人标记（转换为布尔类型）
    let adultFlag = undefined
    if (is_adult !== undefined) {
      adultFlag = is_adult === true || is_adult === 'true' || is_adult === 1
    }

    // 8. 构建更新SQL，只更新提供的字段
    const updateFields = []
    const updateValues = []

    if (name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(name)
    }
    if (description !== undefined) {
      updateFields.push('description = ?')
      updateValues.push(description || null)
    }
    if (visibility !== undefined) {
      updateFields.push('visibility = ?')
      updateValues.push(visibility)
    }
    if (adultFlag !== undefined) {
      updateFields.push('is_adult = ?')
      updateValues.push(adultFlag)
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?')
      updateValues.push(image_url || null)
    }

    // 如果没有要更新的字段，返回错误
    if (updateFields.length === 0) {
      return res.cc(false, '没有提供要更新的字段', 400)
    }

    // 添加ID到更新值数组
    updateValues.push(subredditId)

    // 9. 执行更新
    const updateSql = `UPDATE subreddits SET ${updateFields.join(', ')} WHERE id = ?`
    const updateResult = await conMysql(updateSql, updateValues)

    if (updateResult.affectedRows !== 1) {
      throw new Error('更新社区失败')
    }

    // 10. 返回更新后的社区信息
    const getUpdatedSql = `
      SELECT s.id, s.name, s.description, s.created_at, s.image_url,
             s.visibility, s.is_adult
      FROM subreddits s
      WHERE s.id = ?
    `
    const updatedResult = await conMysql(getUpdatedSql, [subredditId])
    const updatedSubreddit = updatedResult[0]

    res.cc(true, '更新社区成功', 200, updatedSubreddit)
  } catch (error) {
    console.error('更新社区失败:', error)
    next(error)
  }
}

// 解散/删除社区
exports.deleteSubreddit = async (req, res, next) => {
  try {
    const subredditId = parseInt(req.params.id)
    const userId = req.user?.id

    // 1. 验证用户是否登录
    if (!userId) {
      return res.cc(false, '用户未登录或身份失效', 401)
    }

    // 2. 验证社区ID
    if (!subredditId || isNaN(subredditId)) {
      return res.cc(false, '无效的社区ID', 400)
    }

    // 3. 查询社区是否存在，并验证用户是否是创建者
    const checkSql = 'SELECT id, name, created_by FROM subreddits WHERE id = ?'
    const subreddit = await conMysql(checkSql, [subredditId])

    if (!subreddit || subreddit.length === 0) {
      return res.cc(false, '社区不存在', 404)
    }

    const subredditData = subreddit[0]

    // 4. 验证用户是否是社区创建者
    if (subredditData.created_by !== userId) {
      return res.cc(false, '只有社区创建者才能解散社区', 403)
    }

    // 5. 开始事务处理删除操作
    // 注意：这里使用顺序删除，如果数据库支持事务，可以使用事务来保证原子性
    
    // 5.1 删除社区成员关系
    const deleteMembersSql = 'DELETE FROM subreddit_members WHERE subreddit_id = ?'
    await conMysql(deleteMembersSql, [subredditId])

    // 5.2 删除社区相关的帖子（可选：如果不想删除帖子，可以注释掉这部分）
    // 如果选择保留帖子，可以添加一个标记字段来标记社区已删除
    const deletePostsSql = 'DELETE FROM posts WHERE subreddit_id = ?'
    await conMysql(deletePostsSql, [subredditId])

    // 5.3 删除社区本身
    const deleteSubredditSql = 'DELETE FROM subreddits WHERE id = ?'
    const deleteResult = await conMysql(deleteSubredditSql, [subredditId])

    if (deleteResult.affectedRows !== 1) {
      throw new Error('删除社区失败')
    }

    // 6. 返回成功响应
    res.cc(true, '社区解散成功', 200, {
      id: subredditId,
      name: subredditData.name
    })
  } catch (error) {
    console.error('解散社区失败:', error)
    next(error)
  }
}

