const joi = require('joi')

// 预置主题验证（支持自定义 customer 模式）
const preset_theme = joi.string().valid('light', 'dark', 'auto', 'customer').optional()

// 颜色验证（HEX格式）
const color = joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().allow('', null)

// 背景图案验证
const background_pattern = joi.string().max(500).optional().allow('', null)

// 背景透明度验证
const background_opacity = joi.number().min(0).max(1).optional()

// 设置模糊度验证（如15px）
const setting_blur = joi.string().pattern(/^\d+px$/).optional().allow('', null)

// 设置透明度验证（如100%）
const setting_opacity = joi.string().pattern(/^\d+%$/).optional().allow('', null)

/**
 * 更新主题设置验证规则
 */
exports.update_theme_schema = joi.object({
  preset_theme,
  background_pattern,
  background_opacity,
  bg_primary: color,
  bg_secondary: color,
  bg_tertiary: color,
  bg_hover: color,
  text_primary: color,
  text_secondary: color,
  border_color: color,
  card_bg: color,
  card_border: color,
  setting_blur,
  setting_opacity,
})

/**
 * 应用预置主题验证规则
 */
exports.apply_preset_schema = joi.object({
  preset: joi.string().valid('light', 'dark', 'auto').required(),
})






