const { conMysql } = require('../db/index')

// 添加成员
exports.addMember = async (req, res, next) => {
  try {
    const { subreddit_id, role } = req.body
    const user_id = req.user.id
    // 检查是否已加入
    const checkSql = `
      SELECT * FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ?
    `
    const exists = await conMysql(checkSql, [user_id, subreddit_id])
    if (exists.length > 0) {
      return res.cc(false, '该用户已是该板块成员', 409)
    }

    // 插入成员记录
    const insertSql = `
      INSERT INTO subreddit_members (user_id, subreddit_id, role)
      VALUES (?, ?, ?)
    `
    const result = await conMysql(insertSql, [user_id, subreddit_id, role || 'member'])

    if (result.affectedRows !== 1) {
      throw new Error('添加成员失败')
    }

    res.cc(true, '添加成员成功', 201)
  } catch (err) {
    next(err)
  }
}

// 获取某个板块的成员列表
exports.getMembersBySubreddit = async (req, res, next) => {
  try {
    const { subreddit_id } = req.query
    
    // 获取社区创建者信息
    const subredditSql = 'SELECT created_by FROM subreddits WHERE id = ?'
    const subredditResult = await conMysql(subredditSql, [subreddit_id])
    const created_by = subredditResult.length > 0 ? subredditResult[0].created_by : null
    
    // 获取成员列表
    const sql = `
      SELECT sm.*, u.username, u.avatar_url
      FROM subreddit_members sm
      JOIN users u ON sm.user_id = u.id
      WHERE sm.subreddit_id = ?
      ORDER BY sm.role DESC, sm.joined_at ASC
    `
    const members = await conMysql(sql, [subreddit_id])
    
    // 为每个成员添加是否是创建者的标记
    const membersWithCreatorFlag = members.map(member => ({
      ...member,
      is_creator: member.user_id === created_by
    }))
    
    res.cc(true, '获取成员列表成功', 200, membersWithCreatorFlag)
  } catch (err) {
    next(err)
  }
}

exports.toggleMember = async (req, res, next) => {
  try {
    const { subreddit_id } = req.body
    const user_id = req.user.id

    if (!subreddit_id) {
      return res.cc(false, '缺少板块ID参数', 400)
    }

    // 检查是否已是成员
    const checkSql = `
      SELECT * FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ?
    `
    const exists = await conMysql(checkSql, [user_id, subreddit_id])

    if (exists.length > 0) {
      //  已是成员，执行退出
      const deleteSql = `
        DELETE FROM subreddit_members 
        WHERE user_id = ? AND subreddit_id = ?
      `
      const result = await conMysql(deleteSql, [user_id, subreddit_id])

      if (result.affectedRows !== 1) {
        throw new Error('退出板块失败')
      }

      // 查询成员人数
      const countSql = `
        SELECT COUNT(*) as member_count 
        FROM subreddit_members 
        WHERE subreddit_id = ?
      `
      const countResult = await conMysql(countSql, [subreddit_id])
      const memberCount = countResult[0]?.member_count || 0

      return res.cc(true, '已退出板块', 200, { member_count: memberCount })
    } else {
      //  不是成员，执行加入
      const insertSql = `
        INSERT INTO subreddit_members (user_id, subreddit_id, role)
        VALUES (?, ?, 'member')
      `
      const result = await conMysql(insertSql, [user_id, subreddit_id])

      if (result.affectedRows !== 1) {
        throw new Error('加入板块失败')
      }

      // 查询成员人数
      const countSql = `
        SELECT COUNT(*) as member_count 
        FROM subreddit_members 
        WHERE subreddit_id = ?
      `
      const countResult = await conMysql(countSql, [subreddit_id])
      const memberCount = countResult[0]?.member_count || 0

      return res.cc(true, '已加入板块', 201, { member_count: memberCount })
    }
  } catch (err) {
    next(err)
  }
}

// 更新成员角色（仅管理员和创建者可操作）
exports.updateMemberRole = async (req, res, next) => {
  try {
    const { subreddit_id, user_id, role } = req.body
    const current_user_id = req.user.id

    if (!subreddit_id || !user_id || !role) {
      return res.cc(false, '缺少必要参数', 400)
    }

    // 验证角色值
    const validRoles = ['admin', 'moderator', 'member']
    if (!validRoles.includes(role)) {
      return res.cc(false, '无效的角色值', 400)
    }

    // 检查当前用户是否有权限（必须是社区创建者或管理员）
    const checkSubredditSql = 'SELECT created_by FROM subreddits WHERE id = ?'
    const subredditResult = await conMysql(checkSubredditSql, [subreddit_id])
    
    if (subredditResult.length === 0) {
      return res.cc(false, '社区不存在', 404)
    }

    const isCreator = subredditResult[0].created_by === current_user_id

    // 检查当前用户是否是管理员
    const checkAdminSql = `
      SELECT role FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ? AND role = 'admin'
    `
    const adminResult = await conMysql(checkAdminSql, [current_user_id, subreddit_id])
    const isAdmin = adminResult.length > 0

    if (!isCreator && !isAdmin) {
      return res.cc(false, '只有创建者或管理员可以修改成员角色', 403)
    }

    // 检查要修改的用户是否是创建者（创建者角色不能修改）
    if (subredditResult[0].created_by === parseInt(user_id) && role !== 'admin') {
      return res.cc(false, '不能修改创建者的角色', 403)
    }

    // 检查成员是否存在
    const checkMemberSql = `
      SELECT * FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ?
    `
    const memberResult = await conMysql(checkMemberSql, [user_id, subreddit_id])
    
    if (memberResult.length === 0) {
      return res.cc(false, '该用户不是社区成员', 404)
    }

    // 更新角色
    const updateSql = `
      UPDATE subreddit_members 
      SET role = ? 
      WHERE user_id = ? AND subreddit_id = ?
    `
    const updateResult = await conMysql(updateSql, [role, user_id, subreddit_id])

    if (updateResult.affectedRows !== 1) {
      throw new Error('更新角色失败')
    }

    res.cc(true, '更新角色成功', 200)
  } catch (err) {
    next(err)
  }
}

// 移除成员（仅管理员和创建者可操作）
exports.removeMember = async (req, res, next) => {
  try {
    const { subreddit_id, user_id } = req.body
    const current_user_id = req.user.id

    if (!subreddit_id || !user_id) {
      return res.cc(false, '缺少必要参数', 400)
    }

    // 检查当前用户是否有权限（必须是社区创建者或管理员）
    const checkSubredditSql = 'SELECT created_by FROM subreddits WHERE id = ?'
    const subredditResult = await conMysql(checkSubredditSql, [subreddit_id])
    
    if (subredditResult.length === 0) {
      return res.cc(false, '社区不存在', 404)
    }

    const isCreator = subredditResult[0].created_by === current_user_id

    // 检查当前用户是否是管理员
    const checkAdminSql = `
      SELECT role FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ? AND role = 'admin'
    `
    const adminResult = await conMysql(checkAdminSql, [current_user_id, subreddit_id])
    const isAdmin = adminResult.length > 0

    if (!isCreator && !isAdmin) {
      return res.cc(false, '只有创建者或管理员可以移除成员', 403)
    }

    // 不能移除创建者
    if (subredditResult[0].created_by === parseInt(user_id)) {
      return res.cc(false, '不能移除社区创建者', 403)
    }

    // 检查成员是否存在
    const checkMemberSql = `
      SELECT * FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ?
    `
    const memberResult = await conMysql(checkMemberSql, [user_id, subreddit_id])
    
    if (memberResult.length === 0) {
      return res.cc(false, '该用户不是社区成员', 404)
    }

    // 删除成员
    const deleteSql = `
      DELETE FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ?
    `
    const deleteResult = await conMysql(deleteSql, [user_id, subreddit_id])

    if (deleteResult.affectedRows !== 1) {
      throw new Error('移除成员失败')
    }

    res.cc(true, '移除成员成功', 200)
  } catch (err) {
    next(err)
  }
}

