const Joi = require('joi')

exports.create_post_schema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content_html: Joi.string().required(),  // wangEditor生成的HTML，必填
  content_text: Joi.string().allow('', null).optional(),  // wangEditor生成的纯文本，可选
  image_url: Joi.string().uri().allow('', null).optional(),
  subreddit_id: Joi.number().integer().allow(null).optional(),  // 可选：通过ID指定板块
  subreddit: Joi.string().allow('', null).optional()  // 可选：通过名称指定板块
})
