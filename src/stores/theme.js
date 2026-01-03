import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  // state
  const mode = ref(localStorage.getItem('theme-mode') || 'auto')
  const currentTheme = ref('dark')
  const blurAmount = ref(Number(localStorage.getItem('setting-blur') || 15))
  const opacityAmount = ref(Number(localStorage.getItem('setting-opacity') || 100))
  const backgroundImage = ref(localStorage.getItem('background-image') || '')

  // getters
  const isDark = computed(() => currentTheme.value === 'dark')
  const isLight = computed(() => currentTheme.value === 'light')

  // actions
  function initTheme () {
    updateTheme()
    // 监听系统主题变化（如果模式是 auto）
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
    } else {
      currentTheme.value = mode.value
    }
    applyTheme()
  }

  function applyTheme () {
    const root = document.documentElement
    if (currentTheme.value === 'dark') {
      root.classList.remove('theme-light')
      root.classList.add('theme-dark')
    } else {
      root.classList.remove('theme-dark')
      root.classList.add('theme-light')
    }
  }

  function setMode (newMode) {
    if (['light', 'dark', 'auto'].includes(newMode)) {
      mode.value = newMode
      localStorage.setItem('theme-mode', newMode)
      updateTheme()
    }
  }

  function setBlurAmount (amount) {
    blurAmount.value = amount
    localStorage.setItem('setting-blur', amount.toString())
    applySettingControls()
  }

  function setOpacityAmount (amount) {
    opacityAmount.value = amount
    localStorage.setItem('setting-opacity', amount.toString())
    applySettingControls()
  }

  function applySettingControls () {
    const root = document.documentElement
    root.style.setProperty('--setting-blur', `${blurAmount.value}px`)
    root.style.setProperty('--setting-opacity', opacityAmount.value.toString())
  }

  function setBackgroundImage (imageUrl) {
    backgroundImage.value = imageUrl || ''
    if (imageUrl) {
      localStorage.setItem('background-image', imageUrl)
    } else {
      localStorage.removeItem('background-image')
    }
    applyBackgroundImage()
  }

  function applyBackgroundImage () {
    const root = document.documentElement
    if (backgroundImage.value) {
      root.style.setProperty('--background-image', `url(${backgroundImage.value})`)
    } else {
      root.style.removeProperty('--background-image')
    }
  }

  function resetSettings () {
    blurAmount.value = 15
    opacityAmount.value = 100
    backgroundImage.value = ''
    localStorage.setItem('setting-blur', '15')
    localStorage.setItem('setting-opacity', '100')
    localStorage.removeItem('background-image')
    applySettingControls()
    applyBackgroundImage()
  }

  function initSettings () {
    applySettingControls()
    applyBackgroundImage()
  }

  return {
    // state
    mode,
    currentTheme,
    blurAmount,
    opacityAmount,
    backgroundImage,
    // getters
    isDark,
    isLight,
    // actions
    initTheme,
    updateTheme,
    applyTheme,
    setMode,
    setBlurAmount,
    setOpacityAmount,
    setBackgroundImage,
    resetSettings,
    initSettings
  }
})

