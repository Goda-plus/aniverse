const Joi = require('joi')

// 创建名场面
exports.create_scene_moment_schema = Joi.object({
  media_id: Joi.number().integer().required(),
  title: Joi.string().max(255).required(),
  episode: Joi.string().max(50).optional().allow(null, ''),
  time_position: Joi.number().integer().min(0).optional().allow(null),
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


