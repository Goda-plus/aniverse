const { conMysql } = require('../db/index')

class ModerationService {
  constructor () {
    this.sensitiveWords = []
    this.moderationRules = []
    this.initialized = false
  }

  // 初始化敏感词库和审核规则
  async initialize () {
    if (this.initialized) return

    try {
      // 加载敏感词库
      this.sensitiveWords = await this.loadSensitiveWords()
      // 加载审核规则
      this.moderationRules = await this.loadModerationRules()
      this.initialized = true
      console.log(`Content moderation initialized: ${this.sensitiveWords.length} sensitive words, ${this.moderationRules.length} rules`)
    } catch (error) {
      console.error('Failed to initialize moderation service:', error)
      throw error
    }
  }

  // 加载敏感词库
  async loadSensitiveWords () {
    const sql = 'SELECT word, category, severity FROM sensitive_words WHERE is_active = TRUE'
    const result = await conMysql(sql)
    return result.map(row => ({
      word: row.word,
      category: row.category,
      severity: row.severity
    }))
  }

  // 加载审核规则
  async loadModerationRules () {
    const sql = 'SELECT * FROM moderation_rules WHERE is_active = TRUE ORDER BY priority DESC'
    const result = await conMysql(sql)
    return result.map(row => ({
      id: row.id,
      name: row.rule_name,
      type: row.rule_type,
      config: JSON.parse(row.rule_config),
      severity_score: row.severity_score,
      action: row.action,
      priority: row.priority
    }))
  }

  // 审核内容
  async moderateContent (content, contentType = 'post', userId = null) {
    await this.initialize()

    const moderationResult = {
      status: 'approved', // approved, pending, rejected
      score: 0,
      violations: [],
      triggeredRules: [],
      action: 'pass'
    }

    // 应用所有审核规则
    for (const rule of this.moderationRules) {
      const ruleResult = await this.applyRule(rule, content, contentType)
      if (ruleResult.triggered) {
        moderationResult.score += rule.severity_score
        moderationResult.violations.push({
          rule: rule.name,
          severity: rule.severity_score,
          reason: ruleResult.reason
        })
        moderationResult.triggeredRules.push({
          rule_id: rule.id,
          rule_name: rule.name,
          severity_score: rule.severity_score
        })

        // 确定最终动作（优先级高的规则优先）
        if (rule.action !== 'pass') {
          moderationResult.action = rule.action
          if (rule.action === 'reject') {
            moderationResult.status = 'rejected'
          } else if (rule.action === 'queue' && moderationResult.status !== 'rejected') {
            moderationResult.status = 'pending'
          }
        }
      }
    }

    // 如果有违规行为，记录到审核日志
    if (moderationResult.violations.length > 0) {
      await this.logModeration(content, contentType, userId, moderationResult)
    }

    return moderationResult
  }

  // 应用单个审核规则
  async applyRule (rule, content, contentType) {
    const result = { triggered: false, reason: '' }

    switch (rule.type) {
      case 'keyword_filter':
        return this.applyKeywordFilter(rule, content)
      case 'content_length':
        return this.applyContentLengthCheck(rule, content)
      case 'spam_detection':
        return this.applySpamDetection(rule, content, contentType)
      case 'behavior_analysis':
        return this.applyBehaviorAnalysis(rule, content, contentType)
      default:
        return result
    }
  }

  // 敏感词过滤
  applyKeywordFilter (rule, content) {
    const result = { triggered: false, reason: '' }
    const { check_fields = ['content_text', 'title'], min_matches = 1, categories = null } = rule.config

    let matchCount = 0
    const matchedWords = []

    // 筛选符合类别的敏感词
    let wordsToCheck = this.sensitiveWords
    if (categories && categories.length > 0) {
      wordsToCheck = this.sensitiveWords.filter(word => categories.includes(word.category))
    }

    for (const field of check_fields) {
      if (!content[field]) continue

      const text = content[field].toLowerCase()
      for (const sensitiveWord of wordsToCheck) {
        if (text.includes(sensitiveWord.word.toLowerCase())) {
          matchCount++
          matchedWords.push(sensitiveWord.word)
          if (matchCount >= min_matches) break
        }
      }
      if (matchCount >= min_matches) break
    }

    if (matchCount >= min_matches) {
      result.triggered = true
      result.reason = `检测到 ${matchCount} 个敏感词: ${matchedWords.slice(0, 3).join(', ')}`
    }

    return result
  }

  // 内容长度检查
  applyContentLengthCheck (rule, content) {
    const result = { triggered: false, reason: '' }
    const { min_length = 0, max_length = 10000, check_field = 'content_text' } = rule.config

    const text = content[check_field] || ''
    const length = text.length

    if (length < min_length) {
      result.triggered = true
      result.reason = `内容过短 (${length} 字符)，最小要求 ${min_length} 字符`
    } else if (length > max_length) {
      result.triggered = true
      result.reason = `内容过长 (${length} 字符)，最大允许 ${max_length} 字符`
    }

    return result
  }

  // 垃圾内容检测（简化版）
  applySpamDetection (rule, content, contentType) {
    const result = { triggered: false, reason: '' }
    const { similarity_threshold = 0.8, time_window_hours = 24 } = rule.config

    // 这里可以实现重复内容检测逻辑
    // 暂时返回未触发，需要具体实现相似度算法
    return result
  }

  // 用户行为分析
  async applyBehaviorAnalysis (rule, content, contentType) {
    const result = { triggered: false, reason: '' }
    const { check_recent_posts = 10, violation_threshold = 3, time_window_hours = 24 } = rule.config

    if (contentType !== 'post') return result // 暂时只对帖子进行行为分析

    try {
      const userId = content.user_id || content.userId

      // 检查用户近期被拒的帖子数量
      const recentViolations = await conMysql(`
        SELECT COUNT(*) as violation_count
        FROM moderation_logs
        WHERE user_id = ?
          AND action IN ('auto_reject', 'manual_reject')
          AND created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
      `, [userId, time_window_hours])

      const violationCount = recentViolations[0]?.violation_count || 0

      if (violationCount >= violation_threshold) {
        result.triggered = true
        result.reason = `${time_window_hours}小时内已有 ${violationCount} 次违规记录，超过阈值 ${violation_threshold}`
      }

      // 检查用户的总体违规分数
      const userStats = await this.getUserModerationStats(userId)
      if (userStats && userStats.violation_score > 50) {
        result.triggered = true
        result.reason = `用户违规分数过高 (${userStats.violation_score})`
      }

    } catch (error) {
      console.error('Behavior analysis error:', error)
      // 出错时不阻止发布，只记录日志
    }

    return result
  }

  // 记录审核结果到日志
  async logModeration (content, contentType, userId, moderationResult) {
    const sql = `
      INSERT INTO moderation_logs
      (content_type, content_id, user_id, action, reason, triggered_rules, severity_score, processing_time_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const triggeredRulesJson = JSON.stringify(moderationResult.triggeredRules)
    const reason = moderationResult.violations.map(v => v.reason).join('; ')

    await conMysql(sql, [
      contentType,
      content.id || null, // content_id 在创建时可能还没有
      userId,
      moderationResult.action,
      reason,
      triggeredRulesJson,
      moderationResult.score,
      0 // processing_time_ms，暂时设为0
    ])
  }

  // 刷新缓存（当敏感词或规则更新时调用）
  async refreshCache () {
    this.initialized = false
    await this.initialize()
  }

  // 检查文本是否包含敏感词
  checkSensitiveWords (text) {
    if (!text) return []

    const matchedWords = []
    const lowerText = text.toLowerCase()

    for (const sensitiveWord of this.sensitiveWords) {
      if (lowerText.includes(sensitiveWord.word.toLowerCase())) {
        matchedWords.push({
          word: sensitiveWord.word,
          category: sensitiveWord.category,
          severity: sensitiveWord.severity
        })
      }
    }

    return matchedWords
  }

  // 获取用户审核统计
  async getUserModerationStats (userId) {
    const sql = 'SELECT * FROM user_moderation_stats WHERE user_id = ?'
    const result = await conMysql(sql, [userId])
    return result[0] || null
  }

  // 更新用户审核统计
  async updateUserModerationStats (userId, action, score = 0) {
    // 先获取现有统计
    let stats = await this.getUserModerationStats(userId)

    if (!stats) {
      // 创建新统计记录
      const insertSql = `
        INSERT INTO user_moderation_stats (user_id, total_posts, moderated_posts, rejected_posts, flagged_posts, violation_score)
        VALUES (?, 1, 0, 0, 0, 0)
      `
      await conMysql(insertSql, [userId])
      stats = { total_posts: 1, moderated_posts: 0, rejected_posts: 0, flagged_posts: 0, violation_score: 0 }
    }

    // 更新统计
    const updateFields = ['total_posts = total_posts + 1']
    const updateValues = []

    switch (action) {
      case 'rejected':
        updateFields.push('rejected_posts = rejected_posts + 1')
        updateFields.push('violation_score = violation_score + ?')
        updateValues.push(score)
        break
      case 'flagged':
        updateFields.push('flagged_posts = flagged_posts + 1')
        break
      case 'moderated':
        updateFields.push('moderated_posts = moderated_posts + 1')
        break
    }

    if (action !== 'approved') {
      updateFields.push('last_violation_at = NOW()')
    }

    updateValues.push(userId)
    const updateSql = `UPDATE user_moderation_stats SET ${updateFields.join(', ')} WHERE user_id = ?`
    await conMysql(updateSql, updateValues)
  }
}

module.exports = new ModerationService()
