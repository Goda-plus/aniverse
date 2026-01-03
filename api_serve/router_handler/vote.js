const {conMysql} = require('../db/index')

// 添加或更新投票
exports.vote = async (req, res, next) => {
  const { post_id = null, comment_id = null, vote_type } = req.body;
  const user_id = req.user.id;

  if (!['up', 'down'].includes(vote_type)) {
    return res.cc(false, 'vote_type 必须是 up 或 down', 400);
  }

  const isPostVote = !!post_id;
  const isCommentVote = !!comment_id;

  if ((isPostVote && isCommentVote) || (!isPostVote && !isCommentVote)) {
    return res.cc(false, '只能指定 post_id 或 comment_id 中的一个', 400);
  }

  try {
    if (isPostVote) {
      //  处理帖子的投票逻辑
      const [existingVote] = await conMysql(
        `SELECT vote_type FROM votes WHERE user_id = ? AND post_id = ?`,
        [user_id, post_id]
      );

      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          await conMysql(`DELETE FROM votes WHERE user_id = ? AND post_id = ?`, [user_id, post_id]);
          return res.cc(true, '投票已取消', 200, { vote_type: null });
        } else {
          await conMysql(`UPDATE votes SET vote_type = ? WHERE user_id = ? AND post_id = ?`, [vote_type, user_id, post_id]);
          return res.cc(true, '投票已更新', 200, { vote_type });
        }
      } else {
        await conMysql(`INSERT INTO votes (user_id, post_id, vote_type) VALUES (?, ?, ?)`, [user_id, post_id, vote_type]);
        return res.cc(true, '投票成功', 200, { vote_type });
      }

    } else if (isCommentVote) {
      //  处理评论（或子评论）的投票逻辑
      const [comment] = await conMysql(`SELECT parent_comment_id FROM comments WHERE id = ?`, [comment_id]);
      if (!comment) return res.cc(false, '评论不存在', 404);

      const is_reply = comment.parent_comment_id !== null;

      const [existingVote] = await conMysql(
        `SELECT vote_type FROM votes WHERE user_id = ? AND comment_id = ?`,
        [user_id, comment_id]
      );

      if (existingVote) {
        if (existingVote.vote_type === vote_type) {
          await conMysql(`DELETE FROM votes WHERE user_id = ? AND comment_id = ?`, [user_id, comment_id]);
          return res.cc(true, '投票已取消', 200, { vote_type: null, is_reply });
        } else {
          await conMysql(`UPDATE votes SET vote_type = ? WHERE user_id = ? AND comment_id = ?`, [vote_type, user_id, comment_id]);
          return res.cc(true, '投票已更新', 200, { vote_type, is_reply });
        }
      } else {
        await conMysql(`INSERT INTO votes (user_id, comment_id, vote_type) VALUES (?, ?, ?)`, [user_id, comment_id, vote_type]);
        return res.cc(true, '投票成功', 200, { vote_type, is_reply });
      }
    }

  } catch (err) {
    next(err);
  }
};




// 取消投票
exports.unvote = async (req, res, next) => {
  const {  post_id = null, comment_id = null } = req.body
  const user_id = req.user.id

  try {
    const sql = `
      DELETE FROM votes
      WHERE user_id = ? AND post_id <=> ? AND comment_id <=> ?
    `
    await conMysql(sql, [user_id, post_id, comment_id])
    res.cc(true, '取消投票成功')
  } catch (err) {
    next(err)
  }
}

exports.getUserVoteStatus = async (req, res, next) => {
  const { post_id = null, comment_id = null } = req.query;
  const user_id = req.user.id;

  if (!user_id || (!post_id && !comment_id)) {
    return res.cc(false, '参数缺失', 400);
  }

  try {
    const sql = `
      SELECT vote_type
      FROM votes
      WHERE user_id = ? AND post_id <=> ? AND comment_id <=> ?
      LIMIT 1
    `;
    const result = await conMysql(sql, [user_id, post_id, comment_id]);

    // 默认值
    let vote_type = null;
    let voted = false;
    let is_reply = null;

    if (result.length > 0) {
      vote_type = result[0].vote_type;
      voted = true;

      //  如果是评论投票，再查是否是子评论
      if (comment_id) {
        const [comment] = await conMysql(`SELECT parent_comment_id FROM comments WHERE id = ?`, [comment_id]);
        if (comment) {
          is_reply = comment.parent_comment_id !== null;
        }
      }
    }

    res.cc(true, '获取成功', 200, {
      voted,
      vote_type,
      is_reply  // 可以为 true, false 或 null（如果是帖子投票）
    });
  } catch (error) {
    next(error);
  }
};



// 获取投票数
// 获取评论树所有子评论ID（递归）
async function getCommentTreeIds(rootCommentId, postId = null) {
  const sql = postId
    ? `SELECT id, parent_comment_id FROM comments WHERE post_id = ?`
    : `SELECT id, parent_comment_id FROM comments`;

  const rows = await conMysql(sql, postId ? [postId] : []);

  const idMap = new Map();
  rows.forEach(row => {
    if (!idMap.has(row.parent_comment_id)) {
      idMap.set(row.parent_comment_id, []);
    }
    idMap.get(row.parent_comment_id).push(row.id);
  });

  const result = [];

  function collectIds(id) {
    result.push(id);
    const children = idMap.get(id) || [];
    for (const childId of children) {
      collectIds(childId);
    }
  }

  collectIds(Number(rootCommentId));
  return result;
}


exports.getVoteStats = async (req, res, next) => {
  const { post_id = null, comment_id = null, include_children = 'true' } = req.query;

  if (!post_id && !comment_id) {
    return res.cc(false, '必须提供 post_id 或 comment_id', 400);
  }

  try {
    let sql = '';
    let params = [];

    // 情况1：仅帖子本体投票
    if (post_id && !comment_id) {
      sql = `
        SELECT 
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE post_id = ? AND comment_id IS NULL
      `;
      params = [post_id];
    }

    // 情况2：只统计该评论
    else if (comment_id && include_children === 'false') {
      sql = `
        SELECT 
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE comment_id = ?
      `;
      params = [comment_id];
    }

    // 情况3：该评论及其子评论（MySQL 5 处理）
    else {
      const commentIds = await getCommentTreeIds(comment_id, post_id);
      if (commentIds.length === 0) {
        return res.cc(true, '没有相关评论投票', 200, { up: 0, down: 0, score: 0 });
      }

      const placeholders = commentIds.map(() => '?').join(',');
      sql = `
        SELECT 
          SUM(vote_type = 'up') AS up_count,
          SUM(vote_type = 'down') AS down_count
        FROM votes
        WHERE comment_id IN (${placeholders})
      `;
      params = commentIds;
    }

    const [result] = await conMysql(sql, params);
    
    const up = Number(result.up_count) || 0;
    const down = Number(result.down_count) || 0;
    const score = up - down;

    res.cc(true, '获取投票统计成功', 200, { up, down, score });

  } catch (err) {
    next(err);
  }
};


