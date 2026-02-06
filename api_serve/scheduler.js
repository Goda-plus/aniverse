const cron = require('node-cron')
const { conMysql } = require('./db/index')

/**
 * 获取活跃用户列表（最近30天有行为的用户）
 * @param {number} limit - 限制返回的用户数量
 * @returns {Promise<Array>} 活跃用户ID列表
 */
async function  getActiveUsers (limit = 1000) {
  const sql = `
    SELECT DISTINCT user_id
    FROM (
      SELECT user_id FROM browse_history WHERE last_visited_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      UNION
      SELECT user_id FROM favorites WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      UNION
      SELECT user_id FROM votes WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      UNION
      SELECT user_id FROM user_interests WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    ) AS active_users
    LIMIT ?
  `

  const result = await conMysql(sql, [limit])
  return result.map(row => row.user_id)
}

/**
 * 获取所有用户列表（用于全量更新）
 * @param {number} limit - 限制返回的用户数量
 * @returns {Promise<Array>} 所有用户ID列表
 */
async function  getAllUsers (limit = 5000) {
  const sql = `
    SELECT id AS user_id
    FROM users
    WHERE id > 0
    ORDER BY id
    LIMIT ?
  `

  const result = await conMysql(sql, [limit])
  return result.map(row => row.user_id)
}

/**
 * 批量计算用户相似度
 * @param {Array} userIds - 用户ID列表
 * @param {boolean} isFullUpdate - 是否为全量更新
 */
async function  batchCalculateSimilarity (userIds, isFullUpdate = false) {
  console.log(`开始${isFullUpdate ? '全量' : '增量'}计算用户相似度，共${userIds.length}个用户`)

  // 动态导入以避免循环依赖
  const { calculateAndSaveSimilarity } = require('./router_handler/userRecommendation')

  const totalUsers = userIds.length
  let processedCount = 0
  let successCount = 0
  let errorCount = 0

  // 对每个用户计算与其他用户的相似度
  for (let i = 0; i < userIds.length; i++) {
    const userId1 = userIds[i]

    try {
      // 获取其他用户进行比较（避免重复计算）
      const compareUsers = userIds.slice(i + 1)

      for (const userId2 of compareUsers) {
        try {
          await calculateAndSaveSimilarity(userId1, userId2)
          successCount++
        } catch (error) {
          console.error(`计算用户${userId1}和${userId2}相似度失败:`, error.message)
          errorCount++
        }
      }

      processedCount++
      if (processedCount % 10 === 0) {
        console.log(`已处理 ${processedCount}/${totalUsers} 个用户，成功: ${successCount}, 失败: ${errorCount}`)
      }
    } catch (error) {
      console.error(`处理用户${userId1}失败:`, error.message)
      errorCount++
    }
  }

  console.log(`${isFullUpdate ? '全量' : '增量'}相似度计算完成。总用户: ${totalUsers}, 成功: ${successCount}, 失败: ${errorCount}`)
}

/**
 * 更新所有用户的推荐列表
 */
async function  updateAllRecommendations () {
  console.log('开始更新所有用户的推荐列表')

  // 动态导入以避免循环依赖
  const { generateRecommendations } = require('./router_handler/userRecommendation')

  // 获取所有活跃用户
  const activeUserIds = await getActiveUsers(2000)
  console.log(`找到 ${activeUserIds.length} 个活跃用户需要更新推荐列表`)

  let processedCount = 0
  let successCount = 0
  let errorCount = 0

  for (const userId of activeUserIds) {
    try {
      await generateRecommendations(userId, 20)
      successCount++

      processedCount++
      if (processedCount % 50 === 0) {
        console.log(`已更新 ${processedCount}/${activeUserIds.length} 个用户的推荐列表`)
      }
    } catch (error) {
      console.error(`更新用户${userId}推荐列表失败:`, error.message)
      errorCount++
    }
  }

  console.log(`推荐列表更新完成。处理用户: ${processedCount}, 成功: ${successCount}, 失败: ${errorCount}`)
}

/**
 * 增量计算活跃用户的相似度（每天执行）
 */
async function  incrementalSimilarityCalculation () {
  try {
    console.log('开始增量相似度计算任务')
    const activeUserIds = await getActiveUsers(500) // 限制活跃用户数量，避免计算时间过长
    await batchCalculateSimilarity(activeUserIds, false)
    console.log('增量相似度计算任务完成')
  } catch (error) {
    console.error('增量相似度计算任务失败:', error)
  }
}

/**
 * 全量重新计算所有用户的相似度（每周执行）
 */
async function  fullSimilarityCalculation () {
  try {
    console.log('开始全量相似度计算任务')
    const allUserIds = await getAllUsers(1000) // 限制用户数量，避免计算时间过长
    await batchCalculateSimilarity(allUserIds, true)
    console.log('全量相似度计算任务完成')
  } catch (error) {
    console.error('全量相似度计算任务失败:', error)
  }
}

/**
 * 每日更新推荐列表任务
 */
async function  dailyRecommendationUpdate () {
  try {
    console.log('开始每日推荐列表更新任务')
    await updateAllRecommendations()
    console.log('每日推荐列表更新任务完成')
  } catch (error) {
    console.error('每日推荐列表更新任务失败:', error)
  }
}

/**
 * 初始化定时任务
 */
function initScheduler () {
  console.log('初始化同好匹配定时任务...')

  // 每天凌晨2点执行增量相似度计算
  cron.schedule('0 2 * * *', async () => {
    console.log('执行定时任务：增量相似度计算')
    await incrementalSimilarityCalculation()
  }, {
    timezone: 'Asia/Shanghai'
  })

  // 每周日凌晨3点执行全量相似度计算
  cron.schedule('0 3 * * 0', async () => {
    console.log('执行定时任务：全量相似度计算')
    await fullSimilarityCalculation()
  }, {
    timezone: 'Asia/Shanghai'
  })

  // 每天凌晨4点更新推荐列表
  cron.schedule('0 4 * * *', async () => {
    console.log('执行定时任务：推荐列表更新')
    await dailyRecommendationUpdate()
  }, {
    timezone: 'Asia/Shanghai'
  })

  // 每小时更新热门帖子热度评分（增量更新）
  cron.schedule('0 * * * *', async () => {
    console.log('执行定时任务：热门帖子热度更新')
    await updateHotPostsHeatScores()
  }, {
    timezone: 'Asia/Shanghai'
  })

  // 每周日凌晨5点全量更新所有帖子热度评分
  cron.schedule('0 5 * * 0', async () => {
    console.log('执行定时任务：全量热度评分更新')
    await updateAllHeatScores(2000)
  }, {
    timezone: 'Asia/Shanghai'
  })

  console.log('同好匹配定时任务初始化完成')
  console.log('定时任务时间表:')
  console.log('- 增量相似度计算：每天凌晨2:00')
  console.log('- 全量相似度计算：每周日凌晨3:00')
  console.log('- 推荐列表更新：每天凌晨4:00')
  console.log('- 热门帖子热度更新：每小时')
  console.log('- 全量热度评分更新：每周日凌晨5:00')
}

/**
 * 手动执行相似度计算（用于测试或紧急更新）
 * @param {boolean} isFullUpdate - 是否执行全量更新
 * @param {number} userLimit - 用户数量限制
 */
async function  manualSimilarityCalculation (isFullUpdate = false, userLimit = 100) {
  try {
    console.log(`手动执行${isFullUpdate ? '全量' : '增量'}相似度计算`)

    const userIds = isFullUpdate
      ? await getAllUsers(userLimit)
      : await getActiveUsers(userLimit)

    await batchCalculateSimilarity(userIds, isFullUpdate)
    console.log('手动相似度计算完成')
  } catch (error) {
    console.error('手动相似度计算失败:', error)
    throw error
  }
}

/**
 * 更新所有帖子的热度评分
 * @param {number} batchSize - 批次大小
 */
async function updateAllHeatScores (batchSize = 1000) {
  try {
    console.log('开始更新所有帖子热度评分')

    // 动态导入热度计算器
    const HeatCalculator = require('./utils/heatCalculator')

    const result = await HeatCalculator.updateAllHeatScores(batchSize)
    console.log(`热度评分更新完成。总计: ${result.total}, 成功: ${result.updated}, 失败: ${result.errors}`)
  } catch (error) {
    console.error('更新热度评分失败:', error)
  }
}

/**
 * 更新热门帖子的热度评分（增量更新）
 * 只更新最近有互动的帖子
 */
async function updateHotPostsHeatScores () {
  try {
    console.log('开始增量更新热门帖子热度评分')

    // 动态导入热度计算器
    const HeatCalculator = require('./utils/heatCalculator')

    // 获取最近24小时有互动的帖子
    const sql = `
      SELECT DISTINCT p.id
      FROM posts p
      LEFT JOIN votes v ON v.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN favorites f ON f.target_id = p.id AND f.target_type = 'post'
      WHERE p.is_draft != 1
      AND (
        v.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        OR c.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        OR f.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        OR p.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      )
      LIMIT 1000
    `

    const { conMysql } = require('./db/index')
    const posts = await conMysql(sql)

    console.log(`找到 ${posts.length} 个需要更新热度的帖子`)

    let successCount = 0
    let errorCount = 0

    for (const post of posts) {
      try {
        await HeatCalculator.updatePostHeatScore(post.id)
        successCount++
      } catch (error) {
        console.error(`更新帖子 ${post.id} 热度失败:`, error.message)
        errorCount++
      }
    }

    console.log(`热门帖子热度更新完成。成功: ${successCount}, 失败: ${errorCount}`)
  } catch (error) {
    console.error('增量更新热度评分失败:', error)
  }
}

/**
 * 手动更新推荐列表（用于测试或紧急更新）
 * @param {number} userLimit - 用户数量限制
 */
async function  manualRecommendationUpdate (userLimit = 200) {
  try {
    console.log('手动更新推荐列表')

    // 动态导入以避免循环依赖
    const { generateRecommendations } = require('./router_handler/userRecommendation')

    const activeUserIds = await getActiveUsers(userLimit)
    console.log(`将更新 ${activeUserIds.length} 个用户的推荐列表`)

    let processedCount = 0
    let successCount = 0
    let errorCount = 0

    for (const userId of activeUserIds) {
      try {
        await generateRecommendations(userId, 20)
        successCount++
        processedCount++
      } catch (error) {
        console.error(`更新用户${userId}推荐列表失败:`, error.message)
        errorCount++
      }
    }

    console.log(`手动推荐列表更新完成。处理: ${processedCount}, 成功: ${successCount}, 失败: ${errorCount}`)
  } catch (error) {
    console.error('手动推荐列表更新失败:', error)
    throw error
  }
}

module.exports = {
  initScheduler,
  manualSimilarityCalculation,
  manualRecommendationUpdate,
  incrementalSimilarityCalculation,
  fullSimilarityCalculation,
  dailyRecommendationUpdate,
  updateAllHeatScores,
  updateHotPostsHeatScores
}
