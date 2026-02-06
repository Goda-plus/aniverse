const Joi = require('joi')

exports.create_post_schema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  content_html: Joi.string().required(),  // wangEditor生成的HTML，必填
  content_text: Joi.string().allow('', null).optional(),  // wangEditor生成的纯文本，可选
  // 话题标签：前端可传数组(对象)或JSON字符串
  // 例如：[{ "id": 1, "name": "xxx" }, { "id": 2, "name": "yyy" }]
  tags: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        id: Joi.number().integer().required(),
        name: Joi.string().min(1).max(100).required()
      })
    ).max(5),
    Joi.string().allow('', null) // 允许JSON字符串或空
  ).optional(),
  image_url: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.string(),  // 允许JSON字符串
    Joi.allow('', null)
  ).optional(),
  subreddit_id: Joi.number().integer().allow(null).optional(),  // 可选：通过ID指定板块
  subreddit: Joi.string().allow('', null).optional(),  // 可选：通过名称指定板块
  is_draft: Joi.number().integer().valid(0, 1).optional().default(0)  // 是否草稿：0-已发布，1-草稿
})

exports.update_post_schema = Joi.object({
  post_id: Joi.number().integer().required(),
  title: Joi.string().min(1).max(255).optional(),
  content_html: Joi.string().optional(),
  content_text: Joi.string().allow('', null).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(
      Joi.object({
        id: Joi.number().integer().required(),
        name: Joi.string().min(1).max(100).required()
      })
    ).max(5),
    Joi.string().allow('', null)
  ).optional(),
  image_url: Joi.alternatives().try(
    Joi.string().uri(),
    Joi.string(),  // 允许JSON字符串
    Joi.allow('', null)
  ).optional(),
  subreddit_id: Joi.number().integer().allow(null).optional(),
  is_draft: Joi.number().integer().valid(0, 1).optional()  // 是否草稿：0-已发布，1-草稿
})
