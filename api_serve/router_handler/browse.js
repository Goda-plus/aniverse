const { conMysql } = require('../db/index')

// 添加或更新浏览记录
exports.addOrUpdateHistory = async (req, res, next) => {
  try {
    const { target_type, target_id } = req.body
    const user_id = req.user.id

    const sql = `
      INSERT INTO browse_history (user_id, target_type, target_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE last_visited_at = CURRENT_TIMESTAMP
    `
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
    const { limit = 20 } = req.query

    const sql = `
      SELECT * FROM browse_history
      WHERE user_id = ?
      ORDER BY last_visited_at DESC
      LIMIT ?
    `
    const rows = await conMysql(sql, [user_id, Number(limit)])
    res.cc(true, '获取历史记录成功', 200, rows)
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
