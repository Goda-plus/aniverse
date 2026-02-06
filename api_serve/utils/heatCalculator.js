const { conMysql } = require('../db/index')

/**
 * 热度计算算法
 * 综合考虑：点赞、评论、转发、收藏、时间衰减等多因子
 */
class HeatCalculator {

  // 权重配置
  static WEIGHTS = {
    LIKE: 1.0,        // 点赞权重
    COMMENT: 2.0,     // 评论权重
    REPOST: 3.0,      // 转发权重
    FAVORITE: 1.5,    // 收藏权重
    BASE_SCORE: 1.0   // 基础分数
  }

  // 时间衰减配置
  static TIME_DECAY = {
    HALF_LIFE_HOURS: 24,  // 半衰期24小时
    DECAY_FACTOR: 0.1     // 衰减因子
  }

  /**
   * 计算帖子的热度评分
   * @param {Object} post - 帖子数据，包含各种统计信息
   * @returns {number} 热度评分
   */
  static calculateHeatScore (post) {
    try {
      // 基础分数
      let score = this.WEIGHTS.BASE_SCORE

      // 互动分数
      const interactionScore =
        (post.likes || 0) * this.WEIGHTS.LIKE +
        (post.comments || 0) * this.WEIGHTS.COMMENT +
        (post.reposts || 0) * this.WEIGHTS.REPOST +
        (post.favorites || 0) * this.WEIGHTS.FAVORITE

      // 时间衰减因子
      const timeDecayFactor = this.calculateTimeDecay(post.created_at)

      // 最终热度评分 = (基础分数 + 互动分数) × 时间衰减因子
      const heatScore = (score + interactionScore) * timeDecayFactor

      return Math.max(0, parseFloat(heatScore.toFixed(4)))
    } catch (error) {
      console.error('热度计算出错:', error)
      return 0
    }
  }

  /**
   * 计算时间衰减因子
   * 使用指数衰减模型：score × e^(-λt)
   * 其中 λ = ln(2) / 半衰期
   * @param {string|Date} createdAt - 创建时间
   * @returns {number} 时间衰减因子 (0-1之间)
   */
  static calculateTimeDecay (createdAt) {
    try {
      const now = new Date()
      const created = new Date(createdAt)
      const hoursDiff = (now - created) / (1000 * 60 * 60)

      if (hoursDiff < 0) return 1 // 未来时间，不衰减

      // 计算衰减因子：e^(-ln(2) * t / T_half)
      // 简化为：2^(-t/T_half)
      const decay = Math.pow(2, -hoursDiff / this.TIME_DECAY.HALF_LIFE_HOURS)

      return Math.max(0.1, decay) // 最小衰减因子为0.1，避免完全衰减
    } catch (error) {
      console.error('时间衰减计算出错:', error)
      return 1
    }
  }

  /**
   * 获取帖子的完整统计数据
   * @param {number} postId - 帖子ID
   * @returns {Object} 包含所有统计数据的帖子对象
   */
  static async getPostStats (postId) {
    try {
      const sql = `
        SELECT
          p.id,
          p.created_at,
          COUNT(DISTINCT CASE WHEN v.vote_type = 'up' THEN v.id END) AS likes,
          COUNT(DISTINCT CASE WHEN v.vote_type = 'down' THEN v.id END) AS dislikes,
          COUNT(DISTINCT c.id) AS comments,
          COUNT(DISTINCT CASE WHEN f.target_type = 'post' THEN f.id END) AS favorites,
          COALESCE(p.repost_count, 0) AS reposts
        FROM posts p
        LEFT JOIN votes v ON v.post_id = p.id AND v.vote_type = 'up'
        LEFT JOIN comments c ON c.post_id = p.id
        LEFT JOIN favorites f ON f.target_id = p.id AND f.target_type = 'post'
        WHERE p.id = ?
        GROUP BY p.id, p.created_at, p.repost_count
      `

      const [result] = await conMysql(sql, [postId])

      if (!result) {
        throw new Error(`帖子 ${postId} 不存在`)
      }

      return result
    } catch (error) {
      console.error('获取帖子统计数据出错:', error)
      throw error
    }
  }

  /**
   * 更新单个帖子的热度评分
   * @param {number} postId - 帖子ID
   * @returns {number} 新的热度评分
   */
  static async updatePostHeatScore (postId) {
    try {
      // 获取帖子统计数据
      const postStats = await this.getPostStats(postId)

      // 计算热度评分
      const heatScore = this.calculateHeatScore(postStats)

      // 更新数据库
      const updateSql = 'UPDATE posts SET heat_score = ? WHERE id = ?'
      await conMysql(updateSql, [heatScore, postId])

      console.log(`帖子 ${postId} 热度评分更新为: ${heatScore}`)
      return heatScore
    } catch (error) {
      console.error(`更新帖子 ${postId} 热度评分出错:`, error)
      throw error
    }
  }

  /**
   * 批量更新所有帖子的热度评分
   * @param {number} batchSize - 批次大小，默认1000
   * @returns {Object} 更新结果统计
   */
  static async updateAllHeatScores (batchSize = 1000) {
    try {
      console.log('开始批量更新热度评分...')

      // 获取所有帖子ID
      const postIds = await conMysql('SELECT id FROM posts WHERE is_draft != 1 ORDER BY id')

      let updated = 0
      let errors = 0

      // 分批处理
      for (let i = 0; i < postIds.length; i += batchSize) {
        const batch = postIds.slice(i, i + batchSize)
        console.log(`处理批次 ${Math.floor(i/batchSize) + 1}/${Math.ceil(postIds.length/batchSize)} (${batch.length} 条)`)

        // 并行处理批次内的帖子
        const promises = batch.map(async (post) => {
          try {
            await this.updatePostHeatScore(post.id)
            return true
          } catch (error) {
            console.error(`更新帖子 ${post.id} 失败:`, error)
            return false
          }
        })

        const results = await Promise.all(promises)
        updated += results.filter(Boolean).length
        errors += results.filter(r => !r).length
      }

      console.log(`热度评分更新完成，共处理 ${postIds.length} 条，成功 ${updated} 条，失败 ${errors} 条`)

      return {
        total: postIds.length,
        updated,
        errors
      }
    } catch (error) {
      console.error('批量更新热度评分出错:', error)
      throw error
    }
  }

  /**
   * 获取热门帖子（基于热度评分）
   * @param {number} limit - 返回数量，默认20
   * @param {number} minHours - 最小发布时间（小时），默认0
   * @returns {Array} 热门帖子列表
   */
  static async getHotPosts (limit = 20, minHours = 0) {
    try {
      let sql = `
        SELECT
          p.id,
          p.title,
          p.content_text,
          p.heat_score,
          p.created_at,
          u.username,
          u.avatar_url,
          COUNT(DISTINCT c.id) AS comment_count,
          COUNT(DISTINCT v.id) AS vote_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN comments c ON c.post_id = p.id
        LEFT JOIN votes v ON v.post_id = p.id
        WHERE p.is_draft != 1
      `

      const params = []

      if (minHours > 0) {
        sql += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)'
        params.push(minHours)
      }

      sql += ' GROUP BY p.id, u.id ORDER BY p.heat_score DESC LIMIT ?'
      params.push(limit)

      const results = await conMysql(sql, params)
      return results
    } catch (error) {
      console.error('获取热门帖子出错:', error)
      throw error
    }
  }
}

module.exports = HeatCalculator
