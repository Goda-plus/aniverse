const db = require('../db/index')

// 统计总览：用户/内容/订单/审核/举报等
exports.getOverview = async (req, res) => {
  try {
    // 总量
    const [
      usersTotal,
      postsTotal,
      commentsTotal,
      ordersTotal,
      salesTotal
    ] = await Promise.all([
      db.conMysql('SELECT COUNT(*) AS c FROM users'),
      db.conMysql('SELECT COUNT(*) AS c FROM posts'),
      db.conMysql('SELECT COUNT(*) AS c FROM comments'),
      db.conMysql('SELECT COUNT(*) AS c FROM orders'),
      db.conMysql('SELECT COALESCE(SUM(total_amount), 0) AS s FROM orders WHERE status IN ("paid","shipped","completed")')
    ])

    // 待处理
    let moderationPending = [{ c: 0 }]
    let reportsPending = [{ c: 0 }]
    try {
      moderationPending = await db.conMysql('SELECT COUNT(*) AS c FROM moderation_queue WHERE status = "pending"')
    } catch (e) {}
    try {
      reportsPending = await db.conMysql('SELECT COUNT(*) AS c FROM user_reports WHERE status = "pending"')
    } catch (e) {}

    // 最近7天折线（按天统计）
    const series = {}
    series.users = await db.conMysql(`
      SELECT DATE(created_at) AS d, COUNT(*) AS c
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    `)
    series.posts = await db.conMysql(`
      SELECT DATE(created_at) AS d, COUNT(*) AS c
      FROM posts
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    `)
    series.orders = await db.conMysql(`
      SELECT DATE(created_at) AS d, COUNT(*) AS c, COALESCE(SUM(total_amount),0) AS s
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(created_at)
      ORDER BY d ASC
    `)

    res.cc(true, '获取成功', 200, {
      totals: {
        users: usersTotal[0].c,
        posts: postsTotal[0].c,
        comments: commentsTotal[0].c,
        orders: ordersTotal[0].c,
        sales: salesTotal[0].s
      },
      pending: {
        moderation: moderationPending[0] ? moderationPending[0].c : 0,
        reports: reportsPending[0] ? reportsPending[0].c : 0
      },
      series
    })
  } catch (err) {
    res.cc(false, '获取失败', 500)
  }
}


