const joi = require('joi')

// 用户名：必填，长度 3-30，字母数字
const username = joi.string().alphanum().min(3).max(30).required()

// 密码：必填，非空格字符，6-20 位
const password = joi
  .string()
  .pattern(/^[\S]{6,20}$/)
  .required()

// 邮箱：标准邮箱格式，可选
const email = joi.string().email().required()

// 头像：可选，合法 URI
const avatar_url = joi.string().uri().optional().allow('', null)

// 个人简介：可选，最长 500 字符
const bio = joi.string().max(500).optional().allow('', null)

/**
 * 注册 & 登录 验证规则
 * 注册必填：username, password, email，其他为可选
 */
exports.reg_login_schema = 
 joi.object({
   username,
   email,
   password,
   avatar_url,
   bio,
 }),


/**
 * 修改用户信息验证规则（允许部分字段为空或未传）
 */
exports.update_userinfo_schema = joi.object({
  email: joi.string().email().allow('', null).optional(),
  avatar_url: joi.string().uri().allow('', null).optional(),
  bio: joi.string().max(500).allow('', null).optional(),
})

/**
 * 修改密码验证规则
 * - oldPwd：必须合法密码
 * - newPwd：必须合法密码，且不同于 oldPwd
 */
exports.update_password_schema = joi.object({
  oldPwd: password,
  newPwd: joi.not(joi.ref('oldPwd')).concat(password),
})
