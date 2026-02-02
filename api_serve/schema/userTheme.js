const joi = require('joi')

// 预置主题验证
const preset_theme = joi.string().valid('light', 'dark', 'eye_protection').optional()

// 颜色验证（HEX格式）
const color = joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().allow('', null)

// 背景图案验证
const background_pattern = joi.string().max(100).optional().allow('', null)

// 背景透明度验证
const background_opacity = joi.number().min(0).max(1).optional()

// 布局密度验证
const layout_density = joi.string().valid('compact', 'comfortable', 'spacious').optional()

// 字体大小验证
const font_size = joi.string().valid('small', 'medium', 'large').optional()

// 圆角大小验证
const border_radius = joi.string().valid('none', 'small', 'medium', 'large').optional()

// 布尔值验证
const boolean_setting = joi.boolean().optional()

/**
 * 更新主题设置验证规则
 */
exports.update_theme_schema = joi.object({
  preset_theme,
  primary_color: color,
  background_color: color,
  text_color: color,
  background_pattern,
  background_opacity,
  layout_density,
  font_size,
  border_radius,
  animation_enabled: boolean_setting,
  sound_enabled: boolean_setting,
})

/**
 * 应用预置主题验证规则
 */
exports.apply_preset_schema = joi.object({
  preset: joi.string().valid('light', 'dark', 'eye_protection').required(),
})



