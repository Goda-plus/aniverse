const Joi = require('joi')

// 自定义时分秒格式验证函数
const timePositionValidator = (value, helpers) => {
  if (value === null || value === undefined || value === '') return value

  // 验证格式 HH:MM:SS
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
  if (!timeRegex.test(value)) {
    return helpers.error('string.pattern.base', { pattern: 'HH:MM:SS' })
  }

  return value
}

// 创建名场面
exports.create_scene_moment_schema = Joi.object({
  media_id: Joi.number().integer().required(),
  title: Joi.string().max(255).required(),
  episode: Joi.string().max(50).optional().allow(null, ''),
  time_position: Joi.string().optional().allow(null, '').custom(timePositionValidator, '时分秒格式验证').messages({
    'string.pattern.base': '时间点格式必须为时:分:秒（如 01:23:45）'
  }),
  image_url: Joi.string().max(500).required(),
  quote_text: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  season: Joi.number().integer().optional().allow(null),
  part: Joi.string().max(50).optional().allow(null, ''),
  main_character_id: Joi.number().integer().optional().allow(null),
  is_public: Joi.boolean().optional(),
  tag_ids: Joi.array().items(Joi.number().integer()).optional().allow(null),
  character_ids: Joi.array().items(Joi.number().integer()).optional().allow(null)
})

// 点赞切换（body 允许为空）
exports.toggle_like_schema = Joi.object({}).unknown(true)

// 发表评论
exports.create_scene_comment_schema = Joi.object({
  content: Joi.string().min(1).required(),
  parent_id: Joi.number().integer().optional().allow(null)
})


