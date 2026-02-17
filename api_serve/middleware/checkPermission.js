// 权限校验中间件
// 用法：router.get('/api/admin/users', checkPermission('user.read'), handler)

const db = require('../db/index')

module.exports = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // 从 req.user 中获取权限（由 express-jwt 解析后设置）
      const user = req.user

      if (!user || !user.id) {
        return res.cc(false, '未登录', 401)
      }

      let userPermissions = []

      // 如果 token 中有权限信息，直接使用
      if (user.permissions && Array.isArray(user.permissions)) {
        userPermissions = user.permissions
      } else {
        // 如果 token 中没有权限信息，从数据库重新获取
        const sql = `
          SELECT ar.permissions
          FROM admins a
          LEFT JOIN admin_roles ar ON a.role_id = ar.id
          WHERE a.id = ? AND a.status = 'active'
        `
        const results = await db.conMysql(sql, [user.id])

        if (results.length === 0) {
          return res.cc(false, '管理员不存在或已被禁用', 403)
        }

        try {
          userPermissions = JSON.parse(results[0].permissions || '[]')
        } catch (e) {
          userPermissions = []
        }

        // 更新 req.user 中的权限信息，避免重复查询
        req.user.permissions = userPermissions
      }

      // 检查是否有所需权限
      if (!userPermissions.includes(requiredPermission)) {
        return res.cc(false, '权限不足', 403)
      }

      // 权限验证通过，继续执行
      next()
    } catch (err) {
      console.error('权限校验错误:', err)
      return res.cc(false, '权限校验失败', 500)
    }
  }
}

