const Joi = require('joi')

exports.create_post_schema =  Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content: Joi.string().allow('', null),
  image_url: Joi.string().uri().allow('', null),
  subreddit_id: Joi.number().integer().allow(null).optional()  // ✅ 可选
})
