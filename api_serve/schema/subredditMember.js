const Joi = require('joi')

exports.add_member_schema = Joi.object({
  user_id: Joi.number().integer().positive().required().messages({
    'any.required': '用户ID不能为空',
    'number.base': '用户ID必须为数字',
    'number.positive': '用户ID必须为正整数',
  }),
  subreddit_id: Joi.number().integer().positive().required().messages({
    'any.required': '板块ID不能为空',
    'number.base': '板块ID必须为数字',
    'number.positive': '板块ID必须为正整数',
  }),
  role: Joi.string().valid('member', 'moderator', 'admin').optional().messages({
    'any.only': '角色必须为 member、moderator 或 admin'
  })
})
