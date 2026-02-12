const {conMysql} = require('../db/index')

// 添加或更新投票
exports.vote = async (req, res, next) => {
  const { post_id = null, comment_id = null, scene_moment_comment_id = null, vote_type } = req.body
  const user_id = req.user.id

  if (!['up', 'down'].includes(vote_type)) {
    return res.cc(false, 'vote_type 必须是 up 或 down', 400)
  }

  const isPostVote = !!post_id
  const isCommentVote = !!comment_id
  const isSceneMomentCommentVote = !!scene_moment_comment_id

  const voteTypes = [isPostVote, isCommentVote, isSceneMomentCommentVote]
  const activeVoteTypes = voteTypes.filter(Boolean)

  if (activeVoteTypes.length !== 1) {
    return res.cc(false, '只能指定 post_id、comment_id 或 scene_moment_comment_id 中的一个', 400)
  }

  try {
    if (isPostVote) {
      // 处理帖子的投票逻辑
      const [existingVote] = await conMysql(
        'SELECT vote_type FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?',
        [user_id, post_id, 'post']
      )

      let result
      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          // 取消投票
          await conMysql('DELETE FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?', [user_id, post_id, 'post'])
          result = { vote_type: null }
        } else {
          // 更改投票
          await conMysql('UPDATE votes SET vote_type = ? WHERE user_id = ? AND target_id = ? AND target_type = ?', [vote_type, user_id, post_id, 'post'])
          result = { vote_type }
        }
      } else {
        // 新增投票
        await conMysql('INSERT INTO votes (user_id, target_id, target_type, vote_type) VALUES (?, ?, ?, ?)', [user_id, post_id, 'post', vote_type])
        result = { vote_type }
      }

      // 获取帖子最新票数
      const [voteStats] = await conMysql(`
        SELECT 
          COUNT(DISTINCT CASE WHEN vote_type = 'up' THEN user_id END) AS upvotes,
          COUNT(DISTINCT CASE WHEN vote_type = 'down' THEN user_id END) AS downvotes
        FROM votes 
        WHERE target_id = ? AND target_type = ?
      `, [post_id, 'post'])

      return res.cc(true, '投票操作成功', 200, {
        ...result,
        upvotes: Number(voteStats.upvotes) || 0,
        downvotes: Number(voteStats.downvotes) || 0
      })

    } else if (isCommentVote) {
      // 处理评论（或子评论）的投票逻辑
      const [comment] = await conMysql('SELECT parent_comment_id FROM comments WHERE id = ?', [comment_id])
      if (!comment) return res.cc(false, '评论不存在', 404)

      const is_reply = comment.parent_comment_id !== null

      const [existingVote] = await conMysql(
        'SELECT vote_type FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?',
        [user_id, comment_id, 'comment']
      )

      let result
      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          // 取消投票
          await conMysql('DELETE FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?', [user_id, comment_id, 'comment'])
          result = { vote_type: null, is_reply }
        } else {
          // 更改投票
          await conMysql('UPDATE votes SET vote_type = ? WHERE user_id = ? AND target_id = ? AND target_type = ?', [vote_type, user_id, comment_id, 'comment'])
          result = { vote_type, is_reply }
        }
      } else {
        // 新增投票
        await conMysql('INSERT INTO votes (user_id, target_id, target_type, vote_type) VALUES (?, ?, ?, ?)', [user_id, comment_id, 'comment', vote_type])
        result = { vote_type, is_reply }
      }

      // 获取评论最新票数
      const [voteStats] = await conMysql(`
        SELECT 
          COUNT(DISTINCT CASE WHEN vote_type = 'up' THEN user_id END) AS upvotes,
          COUNT(DISTINCT CASE WHEN vote_type = 'down' THEN user_id END) AS downvotes
        FROM votes 
        WHERE target_id = ? AND target_type = ?
      `, [comment_id, 'comment'])

      return res.cc(true, '投票操作成功', 200, {
        ...result,
        upvotes: Number(voteStats.upvotes) || 0,
        downvotes: Number(voteStats.downvotes) || 0
      })

    } else if (isSceneMomentCommentVote) {
      // 处理名场面评论的投票逻辑
      const commentId = parseInt(scene_moment_comment_id)
      if (!commentId || isNaN(commentId)) {
        return res.cc(false, '评论ID无效', 400)
      }
      const [comment] = await conMysql('SELECT parent_id FROM scene_moment_comments WHERE id = ? AND is_deleted = FALSE', [commentId])
      if (!comment) return res.cc(false, '评论不存在', 404)

      const is_reply = comment.parent_id !== null

      const [existingVote] = await conMysql(
        'SELECT vote_type FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?',
        [user_id, commentId, 'scene_moment_comment']
      )

      let result
      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          // 取消投票
          await conMysql('DELETE FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?', [user_id, commentId, 'scene_moment_comment'])
          result = { vote_type: null, is_reply }
        } else {
          // 更改投票
          await conMysql('UPDATE votes SET vote_type = ? WHERE user_id = ? AND target_id = ? AND target_type = ?', [vote_type, user_id, commentId, 'scene_moment_comment'])
          result = { vote_type, is_reply }
        }
      } else {
        // 新增投票
        await conMysql('INSERT INTO votes (user_id, target_id, target_type, vote_type) VALUES (?, ?, ?, ?)', [user_id, commentId, 'scene_moment_comment', vote_type])
        result = { vote_type, is_reply }
      }

      // 获取评论最新票数
      const [voteStats] = await conMysql(`
        SELECT
          COUNT(DISTINCT CASE WHEN vote_type = 'up' THEN user_id END) AS upvotes,
          COUNT(DISTINCT CASE WHEN vote_type = 'down' THEN user_id END) AS downvotes
        FROM votes
        WHERE target_id = ? AND target_type = ?
      `, [commentId, 'scene_moment_comment'])

      return res.cc(true, '投票操作成功', 200, {
        ...result,
        upvotes: Number(voteStats.upvotes) || 0,
        downvotes: Number(voteStats.downvotes) || 0
      })
    }

  } catch (err) {
    next(err)
  }
}




// 取消投票
exports.unvote = async (req, res, next) => {
  const { post_id = null, comment_id = null, scene_moment_comment_id = null } = req.body
  const user_id = req.user.id

  try {
    let sql, params
    if (post_id) {
      sql = 'DELETE FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?'
      params = [user_id, post_id, 'post']
    } else if (comment_id) {
      sql = 'DELETE FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?'
      params = [user_id, comment_id, 'comment']
    } else if (scene_moment_comment_id) {
      sql = 'DELETE FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ?'
      params = [user_id, scene_moment_comment_id, 'scene_moment_comment']
    } else {
      return res.cc(false, '必须提供 post_id、comment_id 或 scene_moment_comment_id 中的一个', 400)
    }
    await conMysql(sql, params)
    res.cc(true, '取消投票成功')
  } catch (err) {
    next(err)
  }
}

exports.getUserVoteStatus = async (req, res, next) => {
  const { post_id = null, comment_id = null, scene_moment_comment_id = null } = req.query
  const user_id = req.user.id

  if (!user_id || (!post_id && !comment_id && !scene_moment_comment_id)) {
    return res.cc(false, '参数缺失', 400)
  }

  try {
    let sql, params, is_reply = null

    if (post_id) {
      sql = 'SELECT vote_type FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ? LIMIT 1'
      params = [user_id, post_id, 'post']
    } else if (comment_id) {
      sql = 'SELECT vote_type FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ? LIMIT 1'
      params = [user_id, comment_id, 'comment']

      // 检查是否是子评论
      const [comment] = await conMysql('SELECT parent_comment_id FROM comments WHERE id = ?', [comment_id])
      if (comment) {
        is_reply = comment.parent_comment_id !== null
      }
    } else if (scene_moment_comment_id) {
      const commentId = parseInt(scene_moment_comment_id)
      if (!commentId || isNaN(commentId)) {
        return res.cc(false, '评论ID无效', 400)
      }
      sql = 'SELECT vote_type FROM votes WHERE user_id = ? AND target_id = ? AND target_type = ? LIMIT 1'
      params = [user_id, commentId, 'scene_moment_comment']

      // 检查是否是子评论
      const [comment] = await conMysql('SELECT parent_id FROM scene_moment_comments WHERE id = ? AND is_deleted = FALSE', [commentId])
      if (comment) {
        is_reply = comment.parent_id !== null
      }
    }

    const result = await conMysql(sql, params)

    // 默认值
    let vote_type = null
    let voted = false

    if (result.length > 0) {
      vote_type = result[0].vote_type
      voted = true
    }

    res.cc(true, '获取成功', 200, {
      voted,
      vote_type,
      is_reply  // 可以为 true, false 或 null
    })
  } catch (error) {
    next(error)
  }
}



// 获取投票数
// 获取评论树所有子评论ID（递归）
async function getCommentTreeIds (rootCommentId, postId = null) {
  const sql = postId
    ? 'SELECT id, parent_comment_id FROM comments WHERE post_id = ?'
    : 'SELECT id, parent_comment_id FROM comments'

  const rows = await conMysql(sql, postId ? [postId] : [])

  const idMap = new Map()
  rows.forEach(row => {
    if (!idMap.has(row.parent_comment_id)) {
      idMap.set(row.parent_comment_id, [])
    }
    idMap.get(row.parent_comment_id).push(row.id)
  })

  const result = []

  function collectIds (id) {
    result.push(id)
    const children = idMap.get(id) || []
    for (const childId of children) {
      collectIds(childId)
    }
  }

  collectIds(Number(rootCommentId))
  return result
}


exports.getVoteStats = async (req, res, next) => {
  const { post_id = null, comment_id = null, scene_moment_comment_id = null, include_children = 'true' } = req.query

  if (!post_id && !comment_id && !scene_moment_comment_id) {
    return res.cc(false, '必须提供 post_id、comment_id 或 scene_moment_comment_id', 400)
  }

  try {
    let sql = ''
    let params = []

    // 情况1：仅帖子本体投票
    if (post_id && !comment_id) {
      sql = `
        SELECT 
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE target_id = ? AND target_type = ?
      `
      params = [post_id, 'post']
    }

    // 情况2：只统计该评论
    else if (comment_id && include_children === 'false') {
      sql = `
        SELECT 
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE target_id = ? AND target_type = ?
      `
      params = [comment_id, 'comment']
    }

    // 情况3：该评论及其子评论（MySQL 5 处理）
    else if (comment_id) {
      const commentIds = await getCommentTreeIds(comment_id, post_id)
      if (commentIds.length === 0) {
        return res.cc(true, '没有相关评论投票', 200, { up: 0, down: 0, score: 0 })
      }

      const placeholders = commentIds.map(() => '?').join(',')
      sql = `
        SELECT
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE target_id IN (${placeholders}) AND target_type = ?
      `
      params = [...commentIds, 'comment']
    }

    // 情况4：名场面评论投票
    else if (scene_moment_comment_id && include_children === 'false') {
      sql = `
        SELECT
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE target_id = ? AND target_type = ?
      `
      params = [scene_moment_comment_id, 'scene_moment_comment']
    }

    // 情况5：名场面评论及其子评论
    else if (scene_moment_comment_id) {
      // 需要实现名场面评论树ID获取函数
      const commentIds = await getSceneMomentCommentTreeIds(scene_moment_comment_id)
      if (commentIds.length === 0) {
        return res.cc(true, '没有相关评论投票', 200, { up: 0, down: 0, score: 0 })
      }

      const placeholders = commentIds.map(() => '?').join(',')
      sql = `
        SELECT
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE target_id IN (${placeholders}) AND target_type = ?
      `
      params = [...commentIds, 'scene_moment_comment']
    }

    const [result] = await conMysql(sql, params)
    
    const up = Number(result.up_count) || 0
    const down = Number(result.down_count) || 0
    const score = up - down

    res.cc(true, '获取投票统计成功', 200, { up, down, score })

  } catch (err) {
    next(err)
  }
}

// 获取名场面评论树所有子评论ID（递归）
async function getSceneMomentCommentTreeIds (rootCommentId) {
  const sql = 'SELECT id, parent_id FROM scene_moment_comments WHERE is_deleted = FALSE'

  const rows = await conMysql(sql)

  const idMap = new Map()
  rows.forEach(row => {
    if (!idMap.has(row.parent_id)) {
      idMap.set(row.parent_id, [])
    }
    idMap.get(row.parent_id).push(row.id)
  })

  const result = []

  function collectIds (id) {
    result.push(id)
    const children = idMap.get(id) || []
    for (const childId of children) {
      collectIds(childId)
    }
  }

  collectIds(Number(rootCommentId))
  return result
}

