const HeatCalculator = require('./api_serve/utils/heatCalculator')

async function testHeatCalculation () {
  try {
    console.log('开始测试热度计算系统...')

    // 测试1: 批量更新所有帖子的热度评分
    console.log('\n=== 测试1: 批量更新所有帖子热度评分 ===')
    const result = await HeatCalculator.updateAllHeatScores(10) // 限制批次大小便于测试
    console.log('批量更新结果:', result)

    // 测试2: 获取热门帖子
    console.log('\n=== 测试2: 获取热门帖子 ===')
    const hotPosts = await HeatCalculator.getHotPosts(5)
    console.log('热门帖子:', hotPosts.map(p => ({
      id: p.id,
      title: p.title.substring(0, 30) + '...',
      heat_score: p.heat_score
    })))

    // 测试3: 计算单个帖子的热度（如果有帖子的话）
    console.log('\n=== 测试3: 单个帖子热度计算 ===')
    if (hotPosts.length > 0) {
      const postId = hotPosts[0].id
      const heatScore = await HeatCalculator.updatePostHeatScore(postId)
      console.log(`帖子 ${postId} 的热度评分: ${heatScore}`)
    }

    console.log('\n 热度计算系统测试完成！')

  } catch (error) {
    console.error(' 测试失败:', error)
  }
}

// 运行测试
testHeatCalculation().then(() => {
  console.log('测试脚本执行完毕')
  process.exit(0)
}).catch(error => {
  console.error('测试脚本执行失败:', error)
  process.exit(1)
})
