const moderationService = require('./utils/moderationService')
const { conMysql } = require('./db/index')

async function testModerationSystem () {
  console.log('=== 内容审核系统测试 ===\n')

  try {
    // 等待服务初始化
    console.log('1. 初始化审核服务...')
    await moderationService.initialize()
    console.log('✓ 审核服务初始化完成\n')

    // 测试敏感词检测
    console.log('2. 测试敏感词检测...')
    const testTexts = [
      { text: '这是一个正常的帖子内容', expected: false },
      { text: '共产党万岁！', expected: true },
      { text: '这个游戏真好玩，包含枪支元素', expected: true },
      { text: '我想学习炸弹制作', expected: true }
    ]

    for (const test of testTexts) {
      const violations = moderationService.checkSensitiveWords(test.text)
      const hasViolations = violations.length > 0
      const status = hasViolations === test.expected ? '✓' : '✗'
      console.log(`${status} "${test.text}" -> ${hasViolations ? '检测到违规' : '正常'} (${violations.length} 个敏感词)`)
    }
    console.log()

    // 测试内容审核
    console.log('3. 测试内容审核...')
    const testContents = [
      {
        id: 999,
        title: '正常标题',
        content_text: '这是一个正常的帖子内容，没有任何敏感信息。',
        user_id: 1
      },
      {
        id: 1000,
        title: '测试敏感内容',
        content_text: '这个帖子包含共产党和台独等敏感词。',
        user_id: 1
      }
    ]

    for (const content of testContents) {
      const result = await moderationService.moderateContent(content, 'post', content.user_id)
      console.log(`✓ 内容 "${content.title}" -> 状态: ${result.status}, 分数: ${result.score}`)
      if (result.violations.length > 0) {
        console.log(`  违规原因: ${result.violations.map(v => v.reason).join('; ')}`)
      }
    }
    console.log()

    // 测试审核队列查询
    console.log('4. 测试审核队列查询...')
    const queueResult = await conMysql(`
      SELECT COUNT(*) as total_pending
      FROM moderation_queue
      WHERE status = 'pending'
    `)
    console.log(`✓ 待审核队列中有 ${queueResult[0].total_pending} 项内容`)
    console.log()

    // 测试用户统计
    console.log('5. 测试用户审核统计...')
    const testUserId = 1
    const userStats = await moderationService.getUserModerationStats(testUserId)
    if (userStats) {
      console.log(`✓ 用户 ${testUserId} 统计: 总发帖 ${userStats.total_posts}, 被拒 ${userStats.rejected_posts}, 违规分数 ${userStats.violation_score}`)
    } else {
      console.log(`✓ 用户 ${testUserId} 暂无审核统计`)
    }
    console.log()

    console.log('=== 测试完成 ===')

  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    process.exit(0)
  }
}

// 只有直接运行此文件时才执行测试
if (require.main === module) {
  testModerationSystem()
}

module.exports = { testModerationSystem }
