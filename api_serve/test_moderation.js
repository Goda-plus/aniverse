const moderationService = require('./utils/moderationService')
const { conMysql } = require('./db/index')

const POST_SAMPLE_LIMIT = 8
const QUEUE_SAMPLE_LIMIT = 5
const SNIPPET_LEN = 120

function clip (s, n = SNIPPET_LEN) {
  if (s == null) return ''
  const t = String(s).replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : `${t.slice(0, n)}…`
}

async function testModerationSystem () {
  console.log('=== 内容审核系统测试（基于数据库真实表） ===\n')
  console.log('说明：对真实帖子执行 moderateContent 时，若命中规则会向 moderation_logs 写入记录。\n')

  try {
    console.log('1. 初始化审核服务（加载 sensitive_words、moderation_rules）...')
    await moderationService.initialize()
    console.log('✓ 审核服务初始化完成\n')

    console.log('2. 使用库中敏感词抽样做命中检测...')
    let wordsFromDb = []
    try {
      wordsFromDb = await conMysql(
        'SELECT id, word, category FROM sensitive_words WHERE is_active = TRUE ORDER BY id ASC LIMIT 20'
      )
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        console.log('✗ 表 sensitive_words 不存在，跳过\n')
      } else {
        throw e
      }
    }

    if (!wordsFromDb.length) {
      console.log('（无启用敏感词，跳过抽样命中）\n')
    } else {
      const sample = wordsFromDb.slice(0, Math.min(6, wordsFromDb.length))
      for (const row of sample) {
        const w = row.word
        const probe = `探针文本：${w}`
        const hits = moderationService.checkSensitiveWords(probe)
        const ok = hits.length > 0
        console.log(`${ok ? '✓' : '✗'} 词「${w}」(${row.category || '无分类'}) -> ${ok ? `命中 ${hits.length} 处` : '未命中（检查词库匹配逻辑）'}`)
      }
      console.log()
    }

    console.log('3. 最近帖子正文敏感词扫描（仅 checkSensitiveWords，不写日志）...')
    let recentPosts = []
    try {
      recentPosts = await conMysql(`
        SELECT id, user_id, title,
               COALESCE(content_text, '') AS content_text
        FROM posts
        WHERE COALESCE(is_draft, 0) != 1
        ORDER BY id DESC
        LIMIT ?
      `, [POST_SAMPLE_LIMIT])
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        console.log('✗ 表 posts 不存在，跳过\n')
      } else {
        throw e
      }
    }

    if (!recentPosts.length) {
      console.log('（无已发布帖子，跳过）\n')
    } else {
      for (const p of recentPosts) {
        const blob = `${p.title || ''}\n${p.content_text || ''}`
        const hits = moderationService.checkSensitiveWords(blob)
        console.log(
          `  帖子 #${p.id} ${clip(p.title, 40)} -> 敏感词命中 ${hits.length} 个` +
          (hits.length ? ` [${hits.slice(0, 3).map((h) => h.word).join(', ')}${hits.length > 3 ? '…' : ''}]` : '')
        )
      }
      console.log()
    }

    console.log('4. 对真实帖子执行完整审核流程 moderateContent（可能写 moderation_logs）...')
    if (!recentPosts.length) {
      console.log('（无帖子可测，跳过）\n')
    } else {
      for (const p of recentPosts.slice(0, Math.min(5, recentPosts.length))) {
        const content = {
          id: p.id,
          title: p.title || '',
          content_text: p.content_text || '',
          user_id: p.user_id
        }
        const result = await moderationService.moderateContent(content, 'post', p.user_id)
        console.log(
          `  帖子 #${p.id} ${clip(p.title, 36)} -> status=${result.status}, score=${result.score}, action=${result.action}`
        )
        if (result.violations.length > 0) {
          console.log(`    原因: ${result.violations.map((v) => v.reason).join('; ')}`)
        }
      }
      console.log()
    }

    console.log('5. 审核队列表 moderation_queue（pending 统计与抽样）...')
    try {
      const queueResult = await conMysql(`
        SELECT COUNT(*) AS total_pending
        FROM moderation_queue
        WHERE status = 'pending'
      `)
      const totalPending = queueResult[0] ? queueResult[0].total_pending : 0
      console.log(`✓ 待审核队列共 ${totalPending} 条`)

      const samples = await conMysql(`
        SELECT id, content_type, content_id, user_id, status, priority, created_at
        FROM moderation_queue
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT ?
      `, [QUEUE_SAMPLE_LIMIT])
      for (const q of samples) {
        console.log(
          `   #${q.id} ${q.content_type} content_id=${q.content_id} user=${q.user_id} priority=${q.priority} @${q.created_at}`
        )
      }
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        console.log('✗ 表 moderation_queue 不存在\n')
      } else {
        throw e
      }
    }
    console.log()

    console.log('6. 用户审核统计 user_moderation_stats（取最近发帖作者）...')
    let statsUserId = null
    if (recentPosts.length) {
      statsUserId = recentPosts[0].user_id
    } else {
      try {
        const one = await conMysql(
          'SELECT id FROM users WHERE id > 0 ORDER BY id ASC LIMIT 1'
        )
        if (one.length) statsUserId = one[0].id
      } catch (e) {
        if (!(e && e.code === 'ER_NO_SUCH_TABLE')) throw e
      }
    }

    if (statsUserId == null) {
      console.log('（无用户可测，跳过）\n')
    } else {
      try {
        const userStats = await moderationService.getUserModerationStats(statsUserId)
        if (userStats) {
          console.log(
            `✓ 用户 ${statsUserId}: 总发帖 ${userStats.total_posts}, 被拒 ${userStats.rejected_posts}, 违规分 ${userStats.violation_score}`
          )
        } else {
          console.log(`✓ 用户 ${statsUserId} 在 user_moderation_stats 中暂无记录`)
        }
      } catch (e) {
        if (e && e.code === 'ER_NO_SUCH_TABLE') {
          console.log('✗ 表 user_moderation_stats 不存在\n')
        } else {
          throw e
        }
      }
    }
    console.log()

    console.log('=== 测试完成 ===')
  } catch (error) {
    console.error('测试失败:', error)
    throw error
  }
}

if (require.main === module) {
  testModerationSystem()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { testModerationSystem }
