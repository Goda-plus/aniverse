const Joi = require('joi')

exports.create_category_schema =  Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': '分类名称不能为空',
      'string.min': '分类名称不能少于2个字符',
      'string.max': '分类名称不能超过50个字符'
    }),
  description: Joi.string()
    .max(500)
    .allow('', null)
    .optional()
})
