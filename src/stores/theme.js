import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useUserStore } from './user'
import { getUserTheme, updateUserTheme, resetUserTheme, applyPresetTheme } from '@/axios/user'

export const useThemeStore = defineStore('theme', () => {
  const userStore = useUserStore()

  // state
  const mode = ref(localStorage.getItem('theme-mode') || 'dark')
  const currentTheme = ref('dark')
  const blurAmount = ref(Number(localStorage.getItem('setting-blur') || 15))
  const opacityAmount = ref(Number(localStorage.getItem('setting-opacity') || 100))
  const backgroundImage = ref(localStorage.getItem('background-image') || '')

  // 额外的布局与排版设置（仅前端本地存储，不写入数据库）
  const borderRadiusPreset = ref(localStorage.getItem('border-radius-preset') || 'medium')
  const fontSizePreset = ref(localStorage.getItem('font-size-preset') || 'medium')

  const defaultColorSettings = {
    bg_primary: '#030303',
    bg_secondary: '#1a1a1b',
    bg_tertiary: '#272729',
    bg_hover: '#343536',
    text_primary: '#d7dadc',
    text_secondary: '#818384',
    border_color: '#343536',
    card_bg: '#1a1a1b',
    card_border: '#343536'
  }

  // Light 主题默认颜色
  const lightColorSettings = {
    bg_primary: '#ffffff',
    bg_secondary: '#f8f9fa',
    bg_tertiary: '#e9ecef',
    bg_hover: '#dee2e6',
    text_primary: '#212529',
    text_secondary: '#6c757d',
    border_color: '#dee2e6',
    card_bg: '#ffffff',
    card_border: '#dee2e6'
  }
  const getInitialColorSettings = () => {
    try {
      const local = localStorage.getItem('color-settings')
      if (local) return { ...defaultColorSettings, ...JSON.parse(local) }
    } catch (e) {
      console.warn('Failed to parse color settings from localStorage', e)
    }
    return { ...defaultColorSettings }
  }
  const colorSettings = ref(getInitialColorSettings())

  const isLoading = ref(false)

  // getters
  const isDark = computed(() => currentTheme.value === 'dark')
  const isLight = computed(() => currentTheme.value === 'light')
  const isCustom = computed(() => currentTheme.value === 'customer')

  // 判断当前颜色设置是否为自定义
  function isCustomColors () {
    const currentColors = colorSettings.value
    const darkColors = defaultColorSettings
    const lightColors = lightColorSettings

    // 检查是否与 dark 主题匹配
    const matchesDark = Object.keys(darkColors).every(key => currentColors[key] === darkColors[key])
    // 检查是否与 light 主题匹配
    const matchesLight = Object.keys(lightColors).every(key => currentColors[key] === lightColors[key])

    return !matchesDark && !matchesLight
  }

  // Database operations
  async function loadThemeFromDB () {
    // 未登录用户没有服务端主题配置，直接跳过
    if (!userStore.isLoggedIn) return

    try {
      isLoading.value = true
      const response = await getUserTheme()
      if (response && response.code === 200) {
        const themeData = response.data
        // 应用数据库中的设置到 store（本地 state 作为单一数据源）
        mode.value = themeData.preset_theme || 'dark'
        blurAmount.value = themeData.setting_blur ? parseInt(themeData.setting_blur) : 15
        opacityAmount.value = themeData.setting_opacity ? parseInt(themeData.setting_opacity) : 100
        backgroundImage.value = themeData.background_pattern || ''
        colorSettings.value = {
          ...defaultColorSettings,
          ...(themeData.bg_primary ? { bg_primary: themeData.bg_primary } : {}),
          ...(themeData.bg_secondary ? { bg_secondary: themeData.bg_secondary } : {}),
          ...(themeData.bg_tertiary ? { bg_tertiary: themeData.bg_tertiary } : {}),
          ...(themeData.bg_hover ? { bg_hover: themeData.bg_hover } : {}),
          ...(themeData.text_primary ? { text_primary: themeData.text_primary } : {}),
          ...(themeData.text_secondary ? { text_secondary: themeData.text_secondary } : {}),
          ...(themeData.border_color ? { border_color: themeData.border_color } : {}),
          ...(themeData.card_bg ? { card_bg: themeData.card_bg } : {}),
          ...(themeData.card_border ? { card_border: themeData.card_border } : {})
        }

        // 更新本地存储作为备份：接口失败或离线时仍可回退到最近一次有效设置
        localStorage.setItem('theme-mode', mode.value)
        localStorage.setItem('setting-blur', blurAmount.value.toString())
        localStorage.setItem('setting-opacity', opacityAmount.value.toString())
        localStorage.setItem('color-settings', JSON.stringify(colorSettings.value))
        if (backgroundImage.value) {
          localStorage.setItem('background-image', backgroundImage.value)
        } else {
          localStorage.removeItem('background-image')
        }

        // 注意：不在此处应用主题设置，因为在initTheme中会统一重新应用
        // updateTheme()
        // applySettingControls()
        // applyBackgroundImage()
        // applyColorSettings()
      }
    } catch (error) {
      console.warn('Failed to load theme from database:', error)
      // 加载失败时使用本地设置
      updateTheme()
    } finally {
      isLoading.value = false
    }
  }

  async function saveThemeToDB () {
    // 游客模式只保存在 localStorage
    if (!userStore.isLoggedIn) return

    try {
      // 自动判断是否为自定义模式
      const actualPresetTheme = isCustomColors() ? 'customer' : mode.value

      const themeData = {
        preset_theme: actualPresetTheme,
        setting_blur: `${blurAmount.value}px`,
        setting_opacity: `${opacityAmount.value}%`,
        background_pattern: backgroundImage.value || null,
        ...colorSettings.value
      }
      await updateUserTheme(themeData)
    } catch (error) {
      console.warn('Failed to save theme to database:', error)
    }
  }

  async function saveColorSettingsToDB () {
    // 仅登录用户可持久化到数据库
    if (!userStore.isLoggedIn) return

    try {
      const themeData = {
        ...colorSettings.value,
        background_pattern: backgroundImage.value || null,
        setting_blur: `${blurAmount.value}px`,
        setting_opacity: `${opacityAmount.value}%`
      }
      await updateUserTheme(themeData)
    } catch (error) {
      console.warn('Failed to save color settings to database:', error)
    }
  }

  // actions
  async function initTheme () {
    // 先同步应用本地设置，避免首屏等待接口造成“闪烁/白屏样式跳变”
    updateTheme()
    applyColorSettings()

    // 如果用户已登录，从数据库加载主题设置
    if (userStore.isLoggedIn) {
      try {
        await loadThemeFromDB()
        // 数据库加载后统一再应用一次，覆盖本地默认值
        updateTheme()
        applyColorSettings()
      } catch (error) {
        console.warn('Failed to load theme from database during init:', error)
        // 如果数据库加载失败，继续使用本地设置（已经在上面同步设置过了）
      }
    }

    // auto 模式下监听系统主题变化；当前实现仍以“时间段”决定浅/深色
    if (mode.value === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (mode.value === 'auto') {
          updateTheme()
        }
      })
    }
  }

  function updateTheme () {
    if (mode.value === 'auto') {
      // 根据系统时间判断：6:00-18:00 为白天（浅色），其他时间为夜晚（深色）
      const hour = new Date().getHours()
      currentTheme.value = hour >= 6 && hour < 18 ? 'light' : 'dark'
    } else if (mode.value === 'customer') {
      currentTheme.value = 'customer'
    } else {
      currentTheme.value = mode.value
    }
    applyTheme()
  }

  function applyTheme () {
    const root = document.documentElement
    if (currentTheme.value === 'dark') {
      root.classList.remove('theme-light', 'theme-customer')
      root.classList.add('theme-dark')
    } else if (currentTheme.value === 'light') {
      root.classList.remove('theme-dark', 'theme-customer')
      root.classList.add('theme-light')
    } else if (currentTheme.value === 'customer') {
      // 自定义模式：移除默认主题类，使用自定义颜色
      root.classList.remove('theme-dark', 'theme-light')
      root.classList.add('theme-customer')
    }

    // 每次切换主题都处理一次颜色变量，避免 customer 模式变量残留
    applyColorSettings()
  }

  async function setMode (newMode, saveToDB = true) {
    // 只接受约定模式，避免非法值污染状态
    if (['light', 'dark', 'auto', 'customer'].includes(newMode)) {
      mode.value = newMode
      localStorage.setItem('theme-mode', newMode)
      updateTheme()

      // 登录且允许写库时，同步服务端主题
      if (userStore.isLoggedIn && saveToDB) {
        // 对于预置主题(light, dark, auto)，使用applyPresetTheme API
        if (['light', 'dark', 'auto'].includes(newMode)) {
          try {
            const response = await applyPresetTheme({ preset: newMode })
            if (response && response.code === 200) {
              const themeData = response.data
              // 以服务端返回配置为准，保证预设主题与后端定义一致
              blurAmount.value = themeData.setting_blur ? parseInt(themeData.setting_blur) : 15
              opacityAmount.value = themeData.setting_opacity ? parseInt(themeData.setting_opacity) : 100
              backgroundImage.value = themeData.background_pattern || ''
              colorSettings.value = {
                bg_primary: themeData.bg_primary,
                bg_secondary: themeData.bg_secondary,
                bg_tertiary: themeData.bg_tertiary,
                bg_hover: themeData.bg_hover,
                text_primary: themeData.text_primary,
                text_secondary: themeData.text_secondary,
                border_color: themeData.border_color,
                card_bg: themeData.card_bg,
                card_border: themeData.card_border
              }

              // 更新本地缓存，避免刷新后又回到旧值
              localStorage.setItem('setting-blur', blurAmount.value.toString())
              localStorage.setItem('setting-opacity', opacityAmount.value.toString())
              localStorage.setItem('color-settings', JSON.stringify(colorSettings.value))
              if (backgroundImage.value) {
                localStorage.setItem('background-image', backgroundImage.value)
              } else {
                localStorage.removeItem('background-image')
              }

              applySettingControls()
              applyBackgroundImage()
              applyColorSettings()
            }
          } catch (error) {
            console.warn('Failed to apply preset theme:', error)
          }
        } else if (newMode === 'customer') {
          // 对于用户主动选择的自定义模式，直接设置为customer
          try {
            const themeData = {
              preset_theme: 'customer',
              setting_blur: `${blurAmount.value}px`,
              setting_opacity: `${opacityAmount.value}%`,
              background_pattern: backgroundImage.value || null,
              ...colorSettings.value
            }
            await updateUserTheme(themeData)
          } catch (error) {
            console.warn('Failed to save custom theme:', error)
          }
        }
      }
    }
  }

  async function setBlurAmount (amount, saveToDB = true) {
    // 该值用于 CSS 变量 --setting-blur（单位 px 在 applySettingControls 中补齐）
    blurAmount.value = amount
    localStorage.setItem('setting-blur', amount.toString())
    applySettingControls()

    // 如果用户已登录且需要保存到数据库
    if (userStore.isLoggedIn && saveToDB) {
      await saveThemeToDB()
    }
  }

  async function setOpacityAmount (amount, saveToDB = true) {
    // 保持 0-100 的百分比语义，具体表现由 CSS 使用场景决定
    opacityAmount.value = amount
    localStorage.setItem('setting-opacity', amount.toString())
    applySettingControls()

    // 如果用户已登录且需要保存到数据库
    if (userStore.isLoggedIn && saveToDB) {
      await saveThemeToDB()
    }
  }

  function applySettingControls () {
    const root = document.documentElement
    root.style.setProperty('--setting-blur', `${blurAmount.value}px`)
    root.style.setProperty('--setting-opacity', opacityAmount.value.toString())

    // 预设 -> 实际 CSS 值映射，便于控制面板只操作“语义选项”
    const borderRadiusMap = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '16px'
    }
    const fontSizeMap = {
      small: '13px',
      medium: '14px',
      large: '16px'
    }

    const borderRadiusValue = borderRadiusMap[borderRadiusPreset.value] || borderRadiusMap.medium
    const fontSizeValue = fontSizeMap[fontSizePreset.value] || fontSizeMap.medium

    root.style.setProperty('--card-border-radius', borderRadiusValue)
    root.style.setProperty('--ui-font-size-base', fontSizeValue)
  }

  function setBorderRadiusPreset (preset) {
    // 非法值直接忽略，避免写入错误配置
    if (!['none', 'small', 'medium', 'large'].includes(preset)) return
    borderRadiusPreset.value = preset
    localStorage.setItem('border-radius-preset', preset)
    applySettingControls()
  }

  function setFontSizePreset (preset) {
    // 非法值直接忽略，避免写入错误配置
    if (!['small', 'medium', 'large'].includes(preset)) return
    fontSizePreset.value = preset
    localStorage.setItem('font-size-preset', preset)
    applySettingControls()
  }

  async function setBackgroundImage (imageUrl, saveToDB = true) {
    // 统一将空值归一化为 ''，便于判断和移除本地缓存
    backgroundImage.value = imageUrl || ''
    if (imageUrl) {
      localStorage.setItem('background-image', imageUrl)
    } else {
      localStorage.removeItem('background-image')
    }
    applyBackgroundImage()

    // 如果用户已登录且需要保存到数据库
    if (userStore.isLoggedIn && saveToDB) {
      await saveThemeToDB()
    }
  }

  function applyBackgroundImage () {
    const root = document.documentElement
    if (backgroundImage.value) {
      root.style.setProperty('--background-image', `url(${backgroundImage.value})`)
    } else {
      root.style.removeProperty('--background-image')
    }
  }

  function applyColorSettings () {
    const root = document.documentElement

    if (currentTheme.value === 'customer') {
      // 仅在 customer 模式下注入颜色变量，避免覆盖预设主题的 class 样式
      Object.entries(colorSettings.value).forEach(([key, value]) => {
        root.style.setProperty(`--${key.replace(/_/g, '-')}`, value)
      })
    } else {
      // 退出 customer 时清理变量，让 .theme-light/.theme-dark 接管渲染
      Object.keys(colorSettings.value).forEach((key) => {
        root.style.removeProperty(`--${key.replace(/_/g, '-')}`)
      })
    }
  }

  async function setColorSetting (key, value) {
    // 防御：只允许修改已声明字段，防止写入未知 key
    if (!(key in colorSettings.value)) return
    colorSettings.value = { ...colorSettings.value, [key]: value || defaultColorSettings[key] }
    localStorage.setItem('color-settings', JSON.stringify(colorSettings.value))
    applyColorSettings()

    // 如果用户已登录，保存到数据库
    if (userStore.isLoggedIn) {
      await saveThemeToDB()
    }
  }

  async function resetSettings () {
    // 重置本地状态与缓存到“默认暗色方案”
    blurAmount.value = 15
    opacityAmount.value = 100
    backgroundImage.value = ''
    borderRadiusPreset.value = 'medium'
    fontSizePreset.value = 'medium'
    colorSettings.value = { ...defaultColorSettings }
    localStorage.setItem('setting-blur', '15')
    localStorage.setItem('setting-opacity', '100')
    localStorage.setItem('color-settings', JSON.stringify(colorSettings.value))
    localStorage.removeItem('background-image')
    localStorage.setItem('border-radius-preset', borderRadiusPreset.value)
    localStorage.setItem('font-size-preset', fontSizePreset.value)
    applySettingControls()
    applyBackgroundImage()
    applyColorSettings()

    // 登录用户同时重置服务端配置，确保多端一致
    if (userStore.isLoggedIn) {
      try {
        await resetUserTheme()
      } catch (error) {
        console.warn('Failed to reset theme in database:', error)
      }
    }
  }

  function initSettings () {
    // 仅做 DOM 应用，不发请求、不改状态
    applySettingControls()
    applyBackgroundImage()
    applyColorSettings()
  }

  // 处理用户登录状态变化
  async function onUserLogin () {
    // 登录后以服务端为准覆盖本地，并立即刷新 DOM 变量/类名
    await loadThemeFromDB()
    // 登录后从数据库恢复到最新设置后，立即重新应用到 DOM
    updateTheme()
    applySettingControls()
    applyBackgroundImage()
    applyColorSettings()
  }

  function onUserLogout () {
    // 登出不清理本地主题，保证游客态也能延续当前视觉体验
  }

  // 监听用户登录状态变化
  watch(() => userStore.isLoggedIn, async (isLoggedIn, wasLoggedIn) => {
    if (isLoggedIn && !wasLoggedIn) {
      // 用户刚登录
      await onUserLogin()
    } else if (!isLoggedIn && wasLoggedIn) {
      // 用户刚登出
      onUserLogout()
    }
  }, { immediate: false })

  return {
    // state
    mode,
    currentTheme,
    blurAmount,
    opacityAmount,
    backgroundImage,
    borderRadiusPreset,
    fontSizePreset,
    colorSettings,
    isLoading,
    // getters
    isDark,
    isLight,
    isCustom,
    // actions
    initTheme,
    updateTheme,
    applyTheme,
    setMode,
    setBlurAmount,
    setOpacityAmount,
    setBackgroundImage,
    setColorSetting,
    setBorderRadiusPreset,
    setFontSizePreset,
    saveColorSettingsToDB,
    resetSettings,
    initSettings,
    applyColorSettings,
    loadThemeFromDB,
    saveThemeToDB,
    onUserLogin,
    onUserLogout,
    isCustomColors
  }
})

