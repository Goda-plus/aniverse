const Joi = require('joi')

exports.create_comment_schema = Joi.object({
  post_id: Joi.number().integer().required().messages({
    'any.required': '缺少帖子 ID',
    'number.base': 'post_id 应为数字'
  }),
  user_id: Joi.number().integer().required().messages({
    'any.required': '缺少用户 ID',
    'number.base': 'user_id 应为数字'
  }),
  content: Joi.string().trim().min(1).max(1000).required().messages({
    'string.empty': '评论内容不能为空',
    'string.min': '评论内容不能为空',
    'string.max': '评论内容不能超过1000字'
  }),
  parent_comment_id: Joi.number().integer().allow(null).optional()
})
