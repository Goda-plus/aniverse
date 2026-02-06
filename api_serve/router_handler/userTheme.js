const { conMysql } = require('../db/index')

/**
 * 获取用户主题设置
 */
exports.getUserTheme = async (req, res, next) => {
  try {
    const userId = req.user.id

    const sql = 'SELECT * FROM user_theme_settings WHERE user_id = ?'
    const result = await conMysql(sql, [userId])

    if (result.length === 0) {
      // 如果没有主题设置，创建默认设置
      const defaultTheme = {
        user_id: userId,
        preset_theme: 'dark',
        background_pattern: null,
        background_opacity: 1.0,
        bg_primary: '#030303',
        bg_secondary: '#1a1a1b',
        bg_tertiary: '#272729',
        bg_hover: '#343536',
        text_primary: '#d7dadc',
        text_secondary: '#818384',
        border_color: '#343536',
        card_bg: '#1a1a1b',
        card_border: '#343536',
        setting_blur: '15px',
        setting_opacity: '100%'
      }

      const insertSql = `
        INSERT INTO user_theme_settings
        (user_id, preset_theme, background_pattern, background_opacity, bg_primary, bg_secondary, bg_tertiary, bg_hover, text_primary, text_secondary, border_color, card_bg, card_border, setting_blur, setting_opacity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      await conMysql(insertSql, [
        defaultTheme.user_id,
        defaultTheme.preset_theme,
        defaultTheme.background_pattern,
        defaultTheme.background_opacity,
        defaultTheme.bg_primary,
        defaultTheme.bg_secondary,
        defaultTheme.bg_tertiary,
        defaultTheme.bg_hover,
        defaultTheme.text_primary,
        defaultTheme.text_secondary,
        defaultTheme.border_color,
        defaultTheme.card_bg,
        defaultTheme.card_border,
        defaultTheme.setting_blur,
        defaultTheme.setting_opacity
      ])

      res.cc(true, '获取主题设置成功', 200, defaultTheme)
    } else {
      res.cc(true, '获取主题设置成功', 200, result[0])
    }
  } catch (err) {
    next(err)
  }
}

/**
 * 更新用户主题设置
 */
exports.updateUserTheme = async (req, res, next) => {
  try {
    const userId = req.user.id
    const {
      preset_theme,
      background_pattern,
      background_opacity,
      bg_primary,
      bg_secondary,
      bg_tertiary,
      bg_hover,
      text_primary,
      text_secondary,
      border_color,
      card_bg,
      card_border,
      setting_blur,
      setting_opacity
    } = req.body

    // 验证必需的枚举值
    const validEnums = {
      preset_theme: ['light', 'dark', 'auto', 'customer']
    }

    // 验证枚举值
    if (preset_theme && !validEnums.preset_theme.includes(preset_theme)) {
      return res.cc(false, '无效的预置主题值', 400)
    }

    // 验证颜色格式 (HEX格式)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    const colorsToCheck = { bg_primary, bg_secondary, bg_tertiary, bg_hover, text_primary, text_secondary, border_color, card_bg, card_border }
    for (const [key, value] of Object.entries(colorsToCheck)) {
      if (value && !colorRegex.test(value)) {
        return res.cc(false, `${key}必须是有效的HEX颜色格式`, 400)
      }
    }

    // 验证透明度
    if (background_opacity !== undefined && (background_opacity < 0 || background_opacity > 1)) {
      return res.cc(false, '背景透明度必须在0-1之间', 400)
    }

    // 验证setting_blur格式 (如15px)
    if (setting_blur && !/^\d+px$/.test(setting_blur)) {
      return res.cc(false, 'setting_blur必须是有效的px格式', 400)
    }

    // 验证setting_opacity格式 (如100%)
    if (setting_opacity && !/^\d+%$/.test(setting_opacity)) {
      return res.cc(false, 'setting_opacity必须是有效的百分比格式', 400)
    }

    // 构建更新语句
    const updateFields = []
    const updateValues = []

    const fields = {
      preset_theme, background_pattern, background_opacity,
      bg_primary, bg_secondary, bg_tertiary, bg_hover,
      text_primary, text_secondary, border_color,
      card_bg, card_border, setting_blur, setting_opacity
    }

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`)
        updateValues.push(value)
      }
    })

    if (updateFields.length === 0) {
      return res.cc(false, '没有需要更新的字段', 400)
    }

    updateValues.push(userId)
    const sql = `UPDATE user_theme_settings SET ${updateFields.join(', ')} WHERE user_id = ?`

    const result = await conMysql(sql, updateValues)

    if (result.affectedRows === 0) {
      return res.cc(false, '主题设置不存在', 404)
    }

    // 返回更新后的主题设置
    const [updatedTheme] = await conMysql('SELECT * FROM user_theme_settings WHERE user_id = ?', [userId])

    res.cc(true, '更新主题设置成功', 200, updatedTheme)
  } catch (err) {
    next(err)
  }
}

/**
 * 重置为默认主题设置
 */
exports.resetUserTheme = async (req, res, next) => {
  try {
    const userId = req.user.id

    const defaultTheme = {
      preset_theme: 'dark',
      background_pattern: null,
      background_opacity: 1.0,
      bg_primary: '#030303',
      bg_secondary: '#1a1a1b',
      bg_tertiary: '#272729',
      bg_hover: '#343536',
      text_primary: '#d7dadc',
      text_secondary: '#818384',
      border_color: '#343536',
      card_bg: '#1a1a1b',
      card_border: '#343536',
      setting_blur: '15px',
      setting_opacity: '100%'
    }

    const updateFields = Object.keys(defaultTheme).map(key => `${key} = ?`)
    const updateValues = Object.values(defaultTheme)
    updateValues.push(userId)

    const sql = `UPDATE user_theme_settings SET ${updateFields.join(', ')} WHERE user_id = ?`
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows === 0) {
      return res.cc(false, '主题设置不存在', 404)
    }

    res.cc(true, '重置主题设置成功', 200, { user_id: userId, ...defaultTheme })
  } catch (err) {
    next(err)
  }
}

/**
 * 应用预置主题
 */
exports.applyPresetTheme = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { preset } = req.body

    if (!['light', 'dark', 'auto'].includes(preset)) {
      return res.cc(false, '无效的预置主题', 400)
    }

    // 预置主题配置
    const presetConfigs = {
      light: {
        preset_theme: 'light',
        bg_primary: '#ffffff',
        bg_secondary: '#f8f9fa',
        bg_tertiary: '#e9ecef',
        bg_hover: '#dee2e6',
        text_primary: '#212529',
        text_secondary: '#6c757d',
        border_color: '#dee2e6',
        card_bg: '#ffffff',
        card_border: '#dee2e6'
      },
      dark: {
        preset_theme: 'dark',
        bg_primary: '#030303',
        bg_secondary: '#1a1a1b',
        bg_tertiary: '#272729',
        bg_hover: '#343536',
        text_primary: '#d7dadc',
        text_secondary: '#818384',
        border_color: '#343536',
        card_bg: '#1a1a1b',
        card_border: '#343536'
      },
      auto: {
        preset_theme: 'auto'
      }
    }

    const config = presetConfigs[preset]
    const updateFields = Object.keys(config).map(key => `${key} = ?`)
    const updateValues = Object.values(config)
    updateValues.push(userId)

    const sql = `UPDATE user_theme_settings SET ${updateFields.join(', ')} WHERE user_id = ?`
    const result = await conMysql(sql, updateValues)

    if (result.affectedRows === 0) {
      return res.cc(false, '主题设置不存在', 404)
    }

    // 返回更新后的完整主题设置
    const [updatedTheme] = await conMysql('SELECT * FROM user_theme_settings WHERE user_id = ?', [userId])

    res.cc(true, '应用预置主题成功', 200, updatedTheme)
  } catch (err) {
    next(err)
  }
}






