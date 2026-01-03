const Joi = require('joi')

exports.create_subreddit_schema =  Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': '板块名称不能为空',
      'string.min': '板块名称不能少于2个字符',
      'string.max': '板块名称不能超过100个字符'
    }),
  description: Joi.string()
    .max(1000)
    .allow('', null)
    .optional()
    .messages({
      'string.max': '描述不能超过1000个字符'
    }),
  category_id: Joi.number().integer().required().messages({
    'any.required': '分类ID是必填项',
    'number.base': '分类ID必须是数字'
  })
})

