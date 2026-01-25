const { conMysql } = require('../db/index')

/**
 * 计算两个用户的静态相似度（基于兴趣标签，Jaccard相似度）
 * @param {number} user_id_1 
 * @param {number} user_id_2 
 * @returns {Promise<{similarity: number, commonTags: Array}>}
 */
async function calculateStaticSimilarity (user_id_1, user_id_2) {
  const sql = `
    SELECT 
      ui1.tag_id,
      t.name AS tag_name,
      t.category AS tag_category
    FROM user_interests ui1
    INNER JOIN user_interests ui2 ON ui1.tag_id = ui2.tag_id
    LEFT JOIN tags t ON ui1.tag_id = t.id
    WHERE ui1.user_id = ? AND ui2.user_id = ?
  `
  
  const commonTags = await conMysql(sql, [user_id_1, user_id_2])
  
  // 获取两个用户各自的标签数
  const [user1Tags] = await conMysql(
    'SELECT COUNT(*) as count FROM user_interests WHERE user_id = ?',
    [user_id_1]
  )
  const [user2Tags] = await conMysql(
    'SELECT COUNT(*) as count FROM user_interests WHERE user_id = ?',
    [user_id_2]
  )
  
  const user1Count = user1Tags.count
  const user2Count = user2Tags.count
  const commonCount = commonTags.length
  
  // Jaccard相似度 = 交集 / 并集
  const unionCount = user1Count + user2Count - commonCount
  const similarity = unionCount > 0 ? commonCount / unionCount : 0
  
  return {
    similarity: parseFloat(similarity.toFixed(4)),
    commonTags: commonTags.map(t => ({
      id: t.tag_id,
      name: t.tag_name,
      category: t.tag_category
    }))
  }
}

/**
 * 计算两个用户的动态行为相似度（基于协同过滤）
 * @param {number} user_id_1 
 * @param {number} user_id_2 
 * @returns {Promise<{similarity: number, commonBehaviors: Object}>}
 */
async function calculateBehaviorSimilarity (user_id_1, user_id_2) {
  const commonBehaviors = {
    media: [],
    character: [],
    scene_moment: [],
    post: []
  }
  
  let totalScore = 0
  let totalWeight = 0
  
  // 1. 共同收藏的作品
  const commonMediaSql = `
    SELECT 
      f1.target_id AS media_id,
      m.title_native,
      m.title_english,
      bw.weight
    FROM favorites f1
    INNER JOIN favorites f2 ON f1.target_id = f2.target_id AND f1.target_type = f2.target_type
    LEFT JOIN media m ON f1.target_id = m.id
    LEFT JOIN user_behavior_weights bw ON bw.behavior_type = 'favorite' AND bw.target_type = 'media'
    WHERE f1.user_id = ? AND f2.user_id = ? 
      AND f1.target_type = 'media' AND f2.target_type = 'media'
  `
  const commonMedia = await conMysql(commonMediaSql, [user_id_1, user_id_2])
  commonMedia.forEach(item => {
    commonBehaviors.media.push({
      id: item.media_id,
      title: item.title_native || item.title_english
    })
    const weight = parseFloat(item.weight || 0.9)
    totalScore += weight
    totalWeight += 1
  })
  
  // 2. 共同收藏的角色
  const commonCharacterSql = `
    SELECT 
      f1.target_id AS character_id,
      c.name_native AS character_name,
      bw.weight
    FROM favorites f1
    INNER JOIN favorites f2 ON f1.target_id = f2.target_id AND f1.target_type = f2.target_type
    LEFT JOIN characters c ON f1.target_id = c.id
    LEFT JOIN user_behavior_weights bw ON bw.behavior_type = 'favorite' AND bw.target_type = 'character'
    WHERE f1.user_id = ? AND f2.user_id = ? 
      AND f1.target_type = 'character' AND f2.target_type = 'character'
  `
  const commonCharacter = await conMysql(commonCharacterSql, [user_id_1, user_id_2])
  commonCharacter.forEach(item => {
    commonBehaviors.character.push({
      id: item.character_id,
      name: item.character_name
    })
    const weight = parseFloat(item.weight || 0.8)
    totalScore += weight
    totalWeight += 1
  })
  
  // 3. 共同点赞的名场面
  const commonSceneSql = `
    SELECT 
      sml1.scene_id,
      sm.title AS scene_title,
      bw.weight
    FROM scene_moment_likes sml1
    INNER JOIN scene_moment_likes sml2 ON sml1.scene_id = sml2.scene_id
    LEFT JOIN scene_moments sm ON sml1.scene_id = sm.id
    LEFT JOIN user_behavior_weights bw ON bw.behavior_type = 'like' AND bw.target_type = 'scene_moment'
    WHERE sml1.user_id = ? AND sml2.user_id = ?
  `
  const commonScene = await conMysql(commonSceneSql, [user_id_1, user_id_2])
  commonScene.forEach(item => {
    commonBehaviors.scene_moment.push({
      id: item.scene_id,
      title: item.scene_title
    })
    const weight = parseFloat(item.weight || 0.6)
    totalScore += weight
    totalWeight += 1
  })
  
  // 4. 共同点赞的帖子
  const commonPostSql = `
    SELECT 
      v1.post_id,
      p.title AS post_title,
      bw.weight
    FROM votes v1
    INNER JOIN votes v2 ON v1.post_id = v2.post_id AND v1.vote_type = v2.vote_type
    LEFT JOIN posts p ON v1.post_id = p.id
    LEFT JOIN user_behavior_weights bw ON bw.behavior_type = 'like' AND bw.target_type = 'post'
    WHERE v1.user_id = ? AND v2.user_id = ? 
      AND v1.vote_type = 'up' AND v2.vote_type = 'up'
  `
  const commonPost = await conMysql(commonPostSql, [user_id_1, user_id_2])
  commonPost.forEach(item => {
    commonBehaviors.post.push({
      id: item.post_id,
      title: item.post_title
    })
    const weight = parseFloat(item.weight || 0.5)
    totalScore += weight
    totalWeight += 1
  })
  
  // 计算加权平均相似度
  const similarity = totalWeight > 0 ? totalScore / totalWeight : 0
  // 归一化到0-1范围
  const normalizedSimilarity = Math.min(1, similarity)
  
  return {
    similarity: parseFloat(normalizedSimilarity.toFixed(4)),
    commonBehaviors
  }
}

/**
 * 生成推荐理由
 * @param {Object} staticData - 静态相似度数据
 * @param {Object} behaviorData - 行为相似度数据
 * @returns {Object}
 */
function generateRecommendationReason (staticData, behaviorData) {
  const reasons = []
  const reasonDetails = {
    common_interests: [],
    common_media: [],
    common_character: [],
    common_behavior: []
  }
  
  // 1. 共同兴趣标签
  if (staticData.commonTags && staticData.commonTags.length > 0) {
    const topTags = staticData.commonTags.slice(0, 3).map(t => t.name)
    reasons.push(`共同喜欢${topTags.join('、')}标签`)
    reasonDetails.common_interests = staticData.commonTags.slice(0, 5)
  }
  
  // 2. 共同收藏的作品
  if (behaviorData.commonBehaviors.media && behaviorData.commonBehaviors.media.length > 0) {
    const topMedia = behaviorData.commonBehaviors.media.slice(0, 2)
    topMedia.forEach(media => {
      reasons.push(`共同喜欢《${media.title}》`)
    })
    reasonDetails.common_media = behaviorData.commonBehaviors.media.slice(0, 3)
  }
  
  // 3. 共同收藏的角色
  if (behaviorData.commonBehaviors.character && behaviorData.commonBehaviors.character.length > 0) {
    const topChar = behaviorData.commonBehaviors.character[0]
    reasons.push(`共同喜欢角色${topChar.name}`)
    reasonDetails.common_character = behaviorData.commonBehaviors.character.slice(0, 2)
  }
  
  // 4. 共同行为
  const totalCommonBehaviors = 
    (behaviorData.commonBehaviors.media?.length || 0) +
    (behaviorData.commonBehaviors.character?.length || 0) +
    (behaviorData.commonBehaviors.scene_moment?.length || 0) +
    (behaviorData.commonBehaviors.post?.length || 0)
  
  if (totalCommonBehaviors > 0) {
    reasonDetails.common_behavior = {
      total: totalCommonBehaviors,
      media_count: behaviorData.commonBehaviors.media?.length || 0,
      character_count: behaviorData.commonBehaviors.character?.length || 0,
      scene_moment_count: behaviorData.commonBehaviors.scene_moment?.length || 0,
      post_count: behaviorData.commonBehaviors.post?.length || 0
    }
  }
  
  // 确定主要推荐理由类型
  let reasonType = 'common_behavior'
  if (reasonDetails.common_media.length > 0) {
    reasonType = 'common_media'
  } else if (reasonDetails.common_character.length > 0) {
    reasonType = 'common_character'
  } else if (reasonDetails.common_interests.length > 0) {
    reasonType = 'common_interests'
  }
  
  return {
    reason: reasons.slice(0, 2).join('，') || '兴趣相似',
    reasonType,
    reasonDetails: JSON.stringify(reasonDetails)
  }
}

/**
 * 计算并保存用户相似度
 * @param {number} user_id_1 
 * @param {number} user_id_2 
 * @returns {Promise<Object>}
 */
async function calculateAndSaveSimilarity (user_id_1, user_id_2) {
  // 确保 user_id_1 < user_id_2
  const [uid1, uid2] = user_id_1 < user_id_2 ? [user_id_1, user_id_2] : [user_id_2, user_id_1]
  
  // 计算静态相似度
  const staticData = await calculateStaticSimilarity(uid1, uid2)
  
  // 计算行为相似度
  const behaviorData = await calculateBehaviorSimilarity(uid1, uid2)
  
  // 综合相似度（静态30%，行为70%）
  const finalSimilarity = staticData.similarity * 0.3 + behaviorData.similarity * 0.7
  
  // 保存到数据库
  const insertSql = `
    INSERT INTO user_similarity (
      user_id_1, user_id_2, similarity_score,
      static_similarity, behavior_similarity,
      common_interests, common_behaviors,
      last_calculated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      similarity_score = VALUES(similarity_score),
      static_similarity = VALUES(static_similarity),
      behavior_similarity = VALUES(behavior_similarity),
      common_interests = VALUES(common_interests),
      common_behaviors = VALUES(common_behaviors),
      last_calculated_at = NOW()
  `
  
  await conMysql(insertSql, [
    uid1,
    uid2,
    finalSimilarity,
    staticData.similarity,
    behaviorData.similarity,
    JSON.stringify(staticData.commonTags),
    JSON.stringify(behaviorData.commonBehaviors)
  ])
  
  return {
    similarity: finalSimilarity,
    staticSimilarity: staticData.similarity,
    behaviorSimilarity: behaviorData.similarity,
    commonInterests: staticData.commonTags,
    commonBehaviors: behaviorData.commonBehaviors
  }
}

/**
 * 生成用户推荐列表
 * @param {number} user_id 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function generateRecommendations (user_id, limit = 20) {
  // 1. 获取与当前用户相似度最高的用户
  const similaritySql = `
    SELECT 
      CASE 
        WHEN user_id_1 = ? THEN user_id_2
        ELSE user_id_1
      END AS recommended_user_id,
      similarity_score,
      static_similarity,
      behavior_similarity,
      common_interests,
      common_behaviors
    FROM user_similarity
    WHERE (user_id_1 = ? OR user_id_2 = ?)
      AND similarity_score > 0.1
    ORDER BY similarity_score DESC
    LIMIT ?
  `
  
  const similarUsers = await conMysql(similaritySql, [user_id, user_id, user_id, limit * 2])
  
  // 2. 过滤掉已关注和已忽略的用户
  const excludeSql = `
    SELECT recommended_user_id 
    FROM user_recommendations 
    WHERE user_id = ? AND (is_followed = TRUE OR is_dismissed = TRUE)
  `
  const excluded = await conMysql(excludeSql, [user_id])
  const excludedSet = new Set(excluded.map(e => e.recommended_user_id))
  
  // 3. 检查是否已关注（从friends表）
  const friendsSql = `
    SELECT friend_id 
    FROM friends 
    WHERE user_id = ? AND status = 'accepted'
  `
  const friends = await conMysql(friendsSql, [user_id])
  const friendsSet = new Set(friends.map(f => f.friend_id))
  
  // 4. 生成推荐记录
  const recommendations = []
  let rank = 1
  
  for (const similarUser of similarUsers) {
    const recommendedUserId = similarUser.recommended_user_id
    
    // 跳过已关注、已忽略或自己的用户
    if (excludedSet.has(recommendedUserId) || 
        friendsSet.has(recommendedUserId) || 
        recommendedUserId === user_id) {
      continue
    }
    
    // 解析共同数据
    const commonInterests = JSON.parse(similarUser.common_interests || '[]')
    const commonBehaviors = JSON.parse(similarUser.common_behaviors || '{}')
    
    // 重新计算推荐理由（使用最新数据）
    const staticData = {
      commonTags: commonInterests
    }
    const behaviorData = {
      commonBehaviors: commonBehaviors
    }
    const reasonData = generateRecommendationReason(staticData, behaviorData)
    
    recommendations.push({
      user_id,
      recommended_user_id: recommendedUserId,
      similarity_score: similarUser.similarity_score,
      recommendation_reason: reasonData.reason,
      reason_type: reasonData.reasonType,
      reason_details: reasonData.reasonDetails,
      rank: rank++
    })
    
    if (recommendations.length >= limit) break
  }
  
  // 5. 批量插入或更新推荐记录
  if (recommendations.length > 0) {
    // 先删除旧的未关注未忽略的推荐
    await conMysql(
      'DELETE FROM user_recommendations WHERE user_id = ? AND is_followed = FALSE AND is_dismissed = FALSE',
      [user_id]
    )
    
    // 批量插入新推荐
    const insertSql = `
      INSERT INTO user_recommendations (
        user_id, recommended_user_id, similarity_score,
        recommendation_reason, reason_type, reason_details,
        rank, generated_at
      ) VALUES ?
    `
    const values = recommendations.map(r => [
      r.user_id,
      r.recommended_user_id,
      r.similarity_score,
      r.recommendation_reason,
      r.reason_type,
      r.reason_details,
      r.rank,
      new Date()
    ])
    
    await conMysql(insertSql, [values])
  }
  
  return recommendations
}

/**
 * 获取用户推荐列表
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { page = 1, pageSize = 10, refresh = false } = req.query
    
    // 如果需要刷新，重新生成推荐
    if (refresh === 'true') {
      await generateRecommendations(user_id, 50)
    }
    
    // 获取推荐列表
    const offset = (page - 1) * pageSize
    const sql = `
      SELECT 
        ur.id,
        ur.recommended_user_id,
        ur.similarity_score,
        ur.recommendation_reason,
        ur.reason_type,
        ur.reason_details,
        ur.rank,
        u.username,
        u.avatar_url,
        u.bio,
        ur.is_followed,
        ur.is_dismissed,
        ur.generated_at
      FROM user_recommendations ur
      INNER JOIN users u ON ur.recommended_user_id = u.id
      WHERE ur.user_id = ?
        AND ur.is_dismissed = FALSE
        AND ur.is_followed = FALSE
      ORDER BY ur.similarity_score DESC, ur.rank ASC
      LIMIT ? OFFSET ?
    `
    
    const countSql = `
      SELECT COUNT(*) as total
      FROM user_recommendations
      WHERE user_id = ? AND is_dismissed = FALSE AND is_followed = FALSE
    `
    
    const [recommendations, countResult] = await Promise.all([
      conMysql(sql, [user_id, parseInt(pageSize), parseInt(offset)]),
      conMysql(countSql, [user_id])
    ])
    
    const total = countResult[0].total
    const totalPages = Math.ceil(total / pageSize)
    
    // 解析reason_details JSON
    const formattedRecommendations = recommendations.map(rec => ({
      ...rec,
      reason_details: JSON.parse(rec.reason_details || '{}')
    }))
    
    res.cc(true, '获取推荐列表成功', 200, {
      recommendations: formattedRecommendations,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        currentPage: parseInt(page),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (err) {
    next(err)
  }
}

/**
 * 刷新推荐列表
 */
exports.refreshRecommendations = async (req, res, next) => {
  try {
    const user_id = req.user.id
    
    // 重新计算相似度（只计算活跃用户）
    const activeUsersSql = `
      SELECT DISTINCT user_id 
      FROM (
        SELECT user_id FROM browse_history WHERE last_visited_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION
        SELECT user_id FROM favorites WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION
        SELECT user_id FROM votes WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) AS active_users
      WHERE user_id != ?
      LIMIT 100
    `
    const activeUsers = await conMysql(activeUsersSql, [user_id])
    
    // 计算与活跃用户的相似度
    for (const activeUser of activeUsers) {
      await calculateAndSaveSimilarity(user_id, activeUser.user_id)
    }
    
    // 生成推荐列表
    const recommendations = await generateRecommendations(user_id, 20)
    
    res.cc(true, '刷新推荐列表成功', 200, {
      count: recommendations.length
    })
  } catch (err) {
    next(err)
  }
}

/**
 * 忽略推荐
 */
exports.dismissRecommendation = async (req, res, next) => {
  try {
    const user_id = req.user.id
    const { recommended_user_id } = req.params
    
    const sql = `
      UPDATE user_recommendations
      SET is_dismissed = TRUE, updated_at = NOW()
      WHERE user_id = ? AND recommended_user_id = ?
    `
    const result = await conMysql(sql, [user_id, recommended_user_id])
    
    if (result.affectedRows === 0) {
      return res.cc(false, '未找到对应的推荐记录', 404)
    }
    
    res.cc(true, '已忽略该推荐', 200)
  } catch (err) {
    next(err)
  }
}

/**
 * 获取与指定用户的相似度
 */
exports.getUserSimilarity = async (req, res, next) => {
  try {
    const user_id_1 = req.user.id
    const { user_id_2 } = req.params
    
    if (!user_id_2 || user_id_2 == user_id_1) {
      return res.cc(false, '无效的用户ID', 400)
    }
    
    // 计算或获取相似度
    const similarityData = await calculateAndSaveSimilarity(user_id_1, user_id_2)
    
    res.cc(true, '获取相似度成功', 200, similarityData)
  } catch (err) {
    next(err)
  }
}

