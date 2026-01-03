const { conMysql } = require("../db/index");

// 添加成员
exports.addMember = async (req, res, next) => {
  try {
    const { subreddit_id, role } = req.body;
    const user_id = req.user.id
    // 检查是否已加入
    const checkSql = `
      SELECT * FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ?
    `;
    const exists = await conMysql(checkSql, [user_id, subreddit_id]);
    if (exists.length > 0) {
      return res.cc(false, "该用户已是该板块成员", 409);
    }

    // 插入成员记录
    const insertSql = `
      INSERT INTO subreddit_members (user_id, subreddit_id, role)
      VALUES (?, ?, ?)
    `;
    const result = await conMysql(insertSql, [user_id, subreddit_id, role || 'member']);

    if (result.affectedRows !== 1) {
      throw new Error("添加成员失败");
    }

    res.cc(true, "添加成员成功", 201);
  } catch (err) {
    next(err);
  }
};

// 获取某个板块的成员列表
exports.getMembersBySubreddit = async (req, res, next) => {
  try {
    const { subreddit_id } = req.query;
    const sql = `
      SELECT sm.*, u.username, u.avatar_url
      FROM subreddit_members sm
      JOIN users u ON sm.user_id = u.id
      WHERE sm.subreddit_id = ?
      ORDER BY sm.role DESC, sm.joined_at ASC
    `;
    const members = await conMysql(sql, [subreddit_id]);
    res.cc(true, "获取成员列表成功", 200, members);
  } catch (err) {
    next(err);
  }
};

exports.toggleMember = async (req, res, next) => {
  try {
    const { subreddit_id } = req.body;
    const user_id = req.user.id;

    if (!subreddit_id) {
      return res.cc(false, "缺少板块ID参数", 400);
    }

    // 检查是否已是成员
    const checkSql = `
      SELECT * FROM subreddit_members 
      WHERE user_id = ? AND subreddit_id = ?
    `;
    const exists = await conMysql(checkSql, [user_id, subreddit_id]);

    if (exists.length > 0) {
      //  已是成员，执行退出
      const deleteSql = `
        DELETE FROM subreddit_members 
        WHERE user_id = ? AND subreddit_id = ?
      `;
      const result = await conMysql(deleteSql, [user_id, subreddit_id]);

      if (result.affectedRows !== 1) {
        throw new Error("退出板块失败");
      }

      return res.cc(true, "已退出板块", 200);
    } else {
      //  不是成员，执行加入
      const insertSql = `
        INSERT INTO subreddit_members (user_id, subreddit_id, role)
        VALUES (?, ?, 'member')
      `;
      const result = await conMysql(insertSql, [user_id, subreddit_id]);

      if (result.affectedRows !== 1) {
        throw new Error("加入板块失败");
      }

      return res.cc(true, "已加入板块", 201);
    }
  } catch (err) {
    next(err);
  }
};

