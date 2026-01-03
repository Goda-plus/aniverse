const {conMysql} = require('../db/index'); // 你现有的数据库连接模块

// 收藏/取消收藏
exports.toggleFavorite = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const { target_type, target_id } = req.body;
  
    // 查询是否已经收藏
    const checkSql = `SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?`;
    const [exist] = await conMysql(checkSql, [user_id, target_type, target_id]);

    if (exist) {
      // 取消收藏
      const delSql = `DELETE FROM favorites WHERE id = ?`;
      await conMysql(delSql, [exist.id]);
      return res.cc(true, '取消收藏成功', 200, { favorited: false });
    } else {
      // 添加收藏
      const insertSql = `INSERT INTO favorites (user_id, target_type, target_id) VALUES (?, ?, ?)`;
      await conMysql(insertSql, [user_id, target_type, target_id]);
      return res.cc(true, '收藏成功', 200, { favorited: true });
    }
  } catch (err) {
    next(err);
  }
};

// 获取用户收藏的帖子或板块
exports.getFavorites = async (req, res, next) => {
  try {
    const user_id = req.user.id;
    const target_type = req.query.target_type;
    if (!['post', 'subreddit'].includes(target_type)) {
      return res.cc(false, '无效的 target_type 参数', 400);
    }

    let sql, data;
    if (target_type === 'post') {
      sql = `
        SELECT p.* FROM favorites f
        JOIN posts p ON f.target_id = p.id
        WHERE f.user_id = ? AND f.target_type = 'post'
        ORDER BY f.created_at DESC
      `;
    } else {
      sql = `
        SELECT s.* FROM favorites f
        JOIN subreddits s ON f.target_id = s.id
        WHERE f.user_id = ? AND f.target_type = 'subreddit'
        ORDER BY f.created_at DESC
      `;
    }

    data = await conMysql(sql, [user_id]);
    res.cc(true, '获取收藏列表成功', 200, { items: data });
  } catch (err) {
    next(err);
  }
};
