const Joi = require('joi')

exports.toggle_favorite_schema = Joi.object({
  target_type: Joi.string().valid('post', 'subreddit', 'media', 'character', 'scene_moment').required(),
  target_id: Joi.number().integer().required(),
  genres: Joi.alternatives().try(Joi.array(), Joi.string()).optional().allow(null),
  tags: Joi.alternatives().try(Joi.array(), Joi.string()).optional().allow(null)
})

exports.check_favorites_batch_schema = Joi.object({
  target_type: Joi.string().valid('post', 'subreddit', 'media', 'character', 'scene_moment').required(),
  target_ids: Joi.array().items(Joi.number().integer()).min(1).required()
})
