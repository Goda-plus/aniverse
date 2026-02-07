/**
 * 定时任务测试脚本
 * 用于验证同好匹配定时任务功能
 */

const { manualSimilarityCalculation, manualRecommendationUpdate } = require('./scheduler')

async function testScheduler () {
  console.log('开始测试同好匹配定时任务功能...\n')

  try {
    // 测试1: 增量相似度计算
    console.log('=== 测试1: 增量相似度计算 ===')
    await manualSimilarityCalculation(false, 10) // 只计算前10个活跃用户
    console.log('✓ 增量相似度计算测试完成\n')

    // 测试2: 全量相似度计算
    console.log('=== 测试2: 全量相似度计算（小规模）===')
    await manualSimilarityCalculation(true, 5) // 只计算前5个用户
    console.log('✓ 全量相似度计算测试完成\n')

    // 测试3: 推荐列表更新
    console.log('=== 测试3: 推荐列表更新 ===')
    await manualRecommendationUpdate(10) // 只更新前10个用户的推荐
    console.log('✓ 推荐列表更新测试完成\n')

    console.log('🎉 所有定时任务功能测试完成！')
    console.log('\n定时任务将按以下时间自动执行:')
    console.log('- 增量相似度计算：每天凌晨2:00')
    console.log('- 全量相似度计算：每周日凌晨3:00')
    console.log('- 推荐列表更新：每天凌晨4:00')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    process.exit(1)
  }
}

// 如果直接运行此脚本，则执行测试
if (require.main === module) {
  testScheduler()
}

module.exports = { testScheduler }





