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
        preset_theme: 'light',
        primary_color: '#409EFF',
        background_color: '#FFFFFF',
        text_color: '#303133',
        layout_density: 'comfortable',
        font_size: 'medium',
        border_radius: 'medium',
        animation_enabled: true,
        sound_enabled: true
      }

      const insertSql = `
        INSERT INTO user_theme_settings
        (user_id, preset_theme, primary_color, background_color, text_color, layout_density, font_size, border_radius, animation_enabled, sound_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      await conMysql(insertSql, [
        defaultTheme.user_id,
        defaultTheme.preset_theme,
        defaultTheme.primary_color,
        defaultTheme.background_color,
        defaultTheme.text_color,
        defaultTheme.layout_density,
        defaultTheme.font_size,
        defaultTheme.border_radius,
        defaultTheme.animation_enabled,
        defaultTheme.sound_enabled
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
      primary_color,
      background_color,
      text_color,
      background_pattern,
      background_opacity,
      layout_density,
      font_size,
      border_radius,
      animation_enabled,
      sound_enabled
    } = req.body

    // 验证必需的枚举值
    const validEnums = {
      preset_theme: ['light', 'dark', 'eye_protection'],
      layout_density: ['compact', 'comfortable', 'spacious'],
      font_size: ['small', 'medium', 'large'],
      border_radius: ['none', 'small', 'medium', 'large']
    }

    // 验证枚举值
    if (preset_theme && !validEnums.preset_theme.includes(preset_theme)) {
      return res.cc(false, '无效的预置主题值', 400)
    }
    if (layout_density && !validEnums.layout_density.includes(layout_density)) {
      return res.cc(false, '无效的布局密度值', 400)
    }
    if (font_size && !validEnums.font_size.includes(font_size)) {
      return res.cc(false, '无效的字体大小值', 400)
    }
    if (border_radius && !validEnums.border_radius.includes(border_radius)) {
      return res.cc(false, '无效的圆角大小值', 400)
    }

    // 验证颜色格式 (HEX格式)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    const colorsToCheck = { primary_color, background_color, text_color }
    for (const [key, value] of Object.entries(colorsToCheck)) {
      if (value && !colorRegex.test(value)) {
        return res.cc(false, `${key}必须是有效的HEX颜色格式`, 400)
      }
    }

    // 验证透明度
    if (background_opacity !== undefined && (background_opacity < 0 || background_opacity > 1)) {
      return res.cc(false, '背景透明度必须在0-1之间', 400)
    }

    // 构建更新语句
    const updateFields = []
    const updateValues = []

    const fields = {
      preset_theme, primary_color, background_color, text_color,
      background_pattern, background_opacity, layout_density,
      font_size, border_radius, animation_enabled, sound_enabled
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
      preset_theme: 'light',
      primary_color: '#409EFF',
      background_color: '#FFFFFF',
      text_color: '#303133',
      background_pattern: null,
      background_opacity: 1.0,
      layout_density: 'comfortable',
      font_size: 'medium',
      border_radius: 'medium',
      animation_enabled: true,
      sound_enabled: true
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

    if (!['light', 'dark', 'eye_protection'].includes(preset)) {
      return res.cc(false, '无效的预置主题', 400)
    }

    // 预置主题配置
    const presetConfigs = {
      light: {
        preset_theme: 'light',
        primary_color: '#409EFF',
        background_color: '#FFFFFF',
        text_color: '#303133'
      },
      dark: {
        preset_theme: 'dark',
        primary_color: '#409EFF',
        background_color: '#1D1E1F',
        text_color: '#FFFFFF'
      },
      eye_protection: {
        preset_theme: 'eye_protection',
        primary_color: '#1989FA',
        background_color: '#F7F3E9',
        text_color: '#4A4A4A'
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



