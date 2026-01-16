const Joi = require('joi')

exports.toggle_favorite_schema = Joi.object({
  target_type: Joi.string().valid('post', 'subreddit').required(),
  target_id: Joi.number().integer().required(),
  genres: Joi.alternatives().try(Joi.array(), Joi.string()).optional().allow(null),
  tags: Joi.alternatives().try(Joi.array(), Joi.string()).optional().allow(null)
})
