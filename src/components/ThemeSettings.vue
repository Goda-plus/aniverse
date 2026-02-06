<template>
  <el-dialog
    v-model="visible"
    title="设置面板"
    width="60%"
    :close-on-click-modal="false"
    class="theme-settings-dialog setting-control"
    align-center
  >
    <div class="settings-panel">
      <div class="settings-content">
        <!-- 左侧设置区域 -->
        <div class="settings-left">
          <!-- 模式切换 -->
          <div class="settings-section">
            <h3 class="section-title">
              模式切换
            </h3>
            <div class="mode-switch">
              <div
                class="mode-icon"
                :class="{ active: themeStore.mode === 'light' }"
                @click="handleModeChange('light')"
              >
                <el-icon><Sunny /></el-icon>
              </div>
              <div
                class="mode-icon"
                :class="{ active: themeStore.mode === 'dark' }"
                @click="handleModeChange('dark')"
              >
                <el-icon><Moon /></el-icon>
              </div>
              <div
                class="mode-icon"
                :class="{ active: themeStore.mode === 'auto' }"
                @click="handleModeChange('auto')"
              >
                <el-icon><Refresh /></el-icon>
              </div>
              <div
                class="mode-icon"
                :class="{ active: themeStore.mode === 'customer' }"
                @click="handleModeChange('customer')"
              >
                <el-icon><Brush /></el-icon>
              </div>
            </div>
          </div>

          <!-- 配置选项 -->
          <div class="settings-section">
            <h3 class="section-title">
              配置选项
            </h3>
            <div class="config-options">
              <div class="option-item">
                <div class="option-label">
                  <el-icon><LightBulb /></el-icon>
                  <span>毛玻璃模糊度</span>
                </div>
                <div class="option-control">
                  <el-slider
                    v-model="blurValue"
                    :min="0"
                    :max="32"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="handleBlurChange"
                  />
                  <span class="slider-value">{{ blurValue }}px</span>
                </div>
              </div>
              <div class="option-item">
                <div class="option-label">
                  <el-icon><View /></el-icon>
                  <span>背景透明度</span>
                </div>
                <div class="option-control">
                  <el-slider
                    v-model="opacityValue"
                    :min="0"
                    :max="100"
                    :step="1"
                    show-input
                    :show-input-controls="false"
                    @change="handleOpacityChange"
                  />
                  <span class="slider-value">{{ opacityValue }}%</span>
                </div>
              </div>
              <div class="option-item">
                <div class="option-label">
                  <el-icon><Brush /></el-icon>
                  <span>卡片圆角</span>
                </div>
                <div class="option-control">
                  <el-select
                    v-model="borderRadiusPreset"
                    placeholder="选择圆角大小"
                    style="width: 160px;"
                    @change="handleBorderRadiusChange"
                  >
                    <el-option
                      v-for="item in borderRadiusOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="option-item">
                <div class="option-label">
                  <el-icon><Brush /></el-icon>
                  <span>全局字体大小</span>
                </div>
                <div class="option-control">
                  <el-select
                    v-model="fontSizePreset"
                    placeholder="选择字体大小"
                    style="width: 160px;"
                    @change="handleFontSizeChange"
                  >
                    <el-option
                      v-for="item in fontSizeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="option-item color-grid">
                <div class="option-label">
                  <el-icon><Brush /></el-icon>
                  <span>自定义色调</span>
                </div>
                <div class="color-grid-list">
                  <div
                    v-for="item in colorItems"
                    :key="item.key"
                    class="color-grid-item"
                  >
                    <span class="color-grid-label">{{ item.label }}</span>
                    <div class="color-picker-control">
                      <el-color-picker
                        v-model="colorValues[item.key]"
                        :predefine="predefineColors"
                        @change="(val) => handleColorChange(item.key, val)"
                      />
                      <span class="color-value">{{ colorValues[item.key] }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 背景设置 -->
          <div class="settings-section">
            <h3 class="section-title">
              背景设置
            </h3>
            <div class="background-settings">
              <!-- 背景图网格 -->
              <div class="background-grid">
                <div
                  v-for="(bg, index) in visibleBackgrounds"
                  :key="index"
                  class="background-item"
                  :class="{ active: themeStore.backgroundImage === bg.url || (!themeStore.backgroundImage && bg.url === '') }"
                  @click="handleBackgroundSelect(bg.url)"
                >
                  <div
                    v-if="bg.url"
                    class="background-thumbnail"
                    :style="{ backgroundImage: `url(${bg.url})` }"
                  />
                  <div
                    v-else
                    class="background-thumbnail default-bg"
                  >
                    <el-icon><Close /></el-icon>
                  </div>
                  <div class="background-overlay">
                    <el-icon v-if="themeStore.backgroundImage === bg.url || (!themeStore.backgroundImage && bg.url === '')">
                      <Check />
                    </el-icon>
                  </div>
                </div>
              </div>
              
              <!-- 导航和控制按钮 -->
              <div class="background-controls">
                <div class="controls-left">
                  <el-button
                    text
                    @click="handleBackgroundReset"
                  >
                    重置
                  </el-button>
                  <el-button
                    text
                    @click="handleCustomBackground"
                  >
                    自定义
                  </el-button>
                </div>
                <el-pagination
                  v-model:current-page="currentPage"
                  :page-size="backgroundsPerPage"
                  :total="presetBackgrounds.length"
                  layout="prev, pager, next"
                  small
                  @current-change="handlePageChange"
                />
              </div>
              
              <!-- 自定义背景输入 -->
              <div v-if="showCustomInput" class="custom-background-input">
                <el-input
                  v-model="customBackgroundUrl"
                  placeholder="输入图片 URL 或选择本地文件"
                  clearable
                >
                  <template #append>
                    <el-button
                      type="primary" style=" width: 100%;background-color: var(--primary);" 
                      @click="handleUploadClick"
                    >
                      <el-icon><Upload /></el-icon>
                    </el-button>
                  </template>
                </el-input>
                <el-button
                  type="primary"
                  style="margin-top: 8px; width: 100%;"
                  @click="handleCustomBackgroundApply"
                >
                  应用
                </el-button>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  style="display: none;"
                  @change="handleFileChange"
                >
              </div>
            </div>
          </div>

          <!-- 应用方案按钮 -->
          <div class="settings-section">
            <div class="apply-section">
              <el-button
                type="primary"
                class="apply-button"
                @click="handleApplyScheme"
              >
                应用方案
              </el-button>
              <span v-if="hasUnsavedChanges" class="unsaved-indicator">
                有未保存的修改
              </span>
            </div>
          </div>

          <!-- 恢复默认按钮 -->
          <div class="settings-section">
            <el-button
              type="default"
              class="reset-button"
              @click="handleReset"
            >
              恢复所有设置为默认
            </el-button>
          </div>
        </div>

        <!-- 右侧插图区域 -->
        <div class="settings-right">
          <div class="anime-illustration">
            <div class="illustration-placeholder">
              <el-icon class="illustration-icon">
                <UserFilled />
              </el-icon>
              <p>插图区域</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
  import { ref, watch, onMounted, computed, nextTick } from 'vue'
  import { defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useThemeStore } from '@/stores/theme'
  import { uploadPostImage } from '@/axios/post'
  import {
    Sunny,
    Moon,
    Refresh,
    LightBulb,
    View,
    Brush,
    UserFilled,
    Check,
    Close,
    Upload
  } from '@element-plus/icons-vue'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:modelValue'])

  const themeStore = useThemeStore()
  const visible = ref(props.modelValue)
  const blurValue = ref(themeStore.blurAmount)
  const opacityValue = ref(themeStore.opacityAmount)
  const colorValues = ref({ ...themeStore.colorSettings })
  const initialColorValues = ref({ ...themeStore.colorSettings })
  const borderRadiusPreset = ref(themeStore.borderRadiusPreset || 'medium')
  const fontSizePreset = ref(themeStore.fontSizePreset || 'medium')
  const showAmber = ref(false)
  const nsfwMode = ref(false)
  
  const colorItems = [
    { key: 'bg_primary', label: '主背景色' },
    { key: 'bg_secondary', label: '次背景色' },
    { key: 'bg_tertiary', label: '第三背景色' },
    { key: 'bg_hover', label: '悬停背景色' },
    { key: 'text_primary', label: '主文字色' },
    { key: 'text_secondary', label: '次文字色' },
    { key: 'border_color', label: '边框色' },
    { key: 'card_bg', label: '卡片背景' },
    { key: 'card_border', label: '卡片边框' }
  ]
  
  // 预设颜色列表
  const predefineColors = ref([
    '#030303', '#1a1a1b', '#272729', '#343536',
    '#d7dadc', '#818384', '#ffffff', '#e0e0e0',
    '#409EFF', '#67C23A', '#E6A23C', '#F56C6C',
    '#909399', '#ff4500', '#38bdf8', '#22d3ee'
  ])
  
  // 背景设置
  const backgroundsPerPage = 4
  const currentPage = ref(1)
  const showCustomInput = ref(false)
  const customBackgroundUrl = ref('')
  const fileInput = ref(null)

  const borderRadiusOptions = [
    { value: 'none', label: '无圆角' },
    { value: 'small', label: '小圆角' },
    { value: 'medium', label: '中等圆角' },
    { value: 'large', label: '大圆角' }
  ]

  const fontSizeOptions = [
    { value: 'small', label: '小号字体' },
    { value: 'medium', label: '中号字体' },
    { value: 'large', label: '大号字体' }
  ]
  
  // 预设背景图列表（使用占位图，实际使用时可以替换为真实图片）
  const presetBackgrounds = ref([
    { url: '' }, // 默认无背景
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop' },
    { url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=300&fit=crop' }
  ])
  
  const visibleBackgrounds = computed(() => {
    const start = (currentPage.value - 1) * backgroundsPerPage
    const end = start + backgroundsPerPage
    return presetBackgrounds.value.slice(start, end)
  })

  // 检查是否有未保存的颜色修改
  const hasUnsavedChanges = computed(() => {
    return JSON.stringify(colorValues.value) !== JSON.stringify(initialColorValues.value)
  })
  
  const handlePageChange = (page) => {
    currentPage.value = page
  }

  watch(() => props.modelValue, (val) => {
    visible.value = val
  })

  watch(visible, async (val) => {
    emit('update:modelValue', val)
    if (val) {
      // 对话框打开后，动态设置高度
      await nextTick()
      const dialogEl = document.querySelector('.theme-settings-dialog .el-dialog')
      const bodyEl = document.querySelector('.theme-settings-dialog .el-dialog__body')
      if (dialogEl) {
        dialogEl.style.height = '500px'
        dialogEl.style.maxHeight = '500px'
      }
      if (bodyEl) {
        bodyEl.style.height = 'calc(500px - 80px)'
        bodyEl.style.maxHeight = 'calc(500px - 80px)'
      }
      // 更新初始颜色状态
      initialColorValues.value = { ...themeStore.colorSettings }
      colorValues.value = { ...themeStore.colorSettings }
    }
  })

  watch(() => themeStore.blurAmount, (val) => {
    blurValue.value = val
  })

  watch(() => themeStore.opacityAmount, (val) => {
    opacityValue.value = val
  })

  watch(() => themeStore.colorSettings, (val) => {
    colorValues.value = { ...val }
  }, { deep: true })

  watch(() => themeStore.borderRadiusPreset, (val) => {
    if (val) borderRadiusPreset.value = val
  })

  watch(() => themeStore.fontSizePreset, (val) => {
    if (val) fontSizePreset.value = val
  })

  watch(() => themeStore.backgroundImage, () => {
    // 背景图变化时，确保 UI 更新
  })

  onMounted(() => {
    themeStore.initSettings()
  })

  const handleModeChange = (mode) => {
    // 自定义模式仅切换前端状态，不立即调用更新接口，真正保存交给“应用方案”按钮
    if (mode === 'customer') {
      themeStore.setMode(mode, false)
    } else {
      themeStore.setMode(mode)
    }
  }

  const handleBlurChange = (value) => {
    themeStore.setBlurAmount(value, false) // 不保存到数据库
  }

  const handleOpacityChange = (value) => {
    themeStore.setOpacityAmount(value, false) // 不保存到数据库
  }

  const handleBorderRadiusChange = (value) => {
    if (!value) return
    borderRadiusPreset.value = value
    themeStore.setBorderRadiusPreset(value)
  }

  const handleFontSizeChange = (value) => {
    if (!value) return
    fontSizePreset.value = value
    themeStore.setFontSizePreset(value)
  }

  const handleColorChange = (key, value) => {
    if (!value) return
    const normalized = normalizeColor(value)
    // 更新本地显示值
    colorValues.value[key] = normalized
    // 使用 store 提供的方法统一更新（会处理 localStorage 和已登录时的 DB 持久化）
    themeStore.setColorSetting(key, normalized)
  }

  // 将 rgba/hex 统一转换为 hex 格式
  function normalizeColor (color) {
    if (!color) return ''
    if (color.startsWith('#')) {
      return color.slice(0, 7)
    }
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      const r = parseInt(match[1]).toString(16).padStart(2, '0')
      const g = parseInt(match[2]).toString(16).padStart(2, '0')
      const b = parseInt(match[3]).toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
    return color
  }

  const handleReset = () => {
    themeStore.resetSettings()
    blurValue.value = themeStore.blurAmount
    opacityValue.value = themeStore.opacityAmount
    colorValues.value = { ...themeStore.colorSettings }
    showAmber.value = false
    nsfwMode.value = false
    showCustomInput.value = false
    customBackgroundUrl.value = ''
  }
  
  // 背景设置相关方法
  const handleBackgroundSelect = (url) => {
    themeStore.setBackgroundImage(url, false) // 不保存到数据库
  }
  
  const handleBackgroundReset = () => {
    themeStore.setBackgroundImage('')
  }
  
  const handleCustomBackground = () => {
    showCustomInput.value = !showCustomInput.value
    if (!showCustomInput.value) {
      customBackgroundUrl.value = ''
    }
  }
  
  const handleUploadClick = () => {
    fileInput.value?.click()
  }
  
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        ElMessage.info('正在上传图片...')
        const response = await uploadPostImage(file)
        if (response.success && response.code === 200 && response.data?.url) {
          customBackgroundUrl.value = response.data.url
          ElMessage.success('图片上传成功')
        } else {
          ElMessage.error(response.message || '图片上传失败')
        }
      } catch (error) {
        console.error('Upload failed:', error)
        ElMessage.error('图片上传失败')
      }
    }
  }
  
  const handleCustomBackgroundApply = () => {
    if (customBackgroundUrl.value) {
      themeStore.setBackgroundImage(customBackgroundUrl.value, false) // 不保存到数据库
      showCustomInput.value = false
      customBackgroundUrl.value = ''
      ElMessage.success('背景图片已应用')
    }
  }

  const handleApplyScheme = async () => {
    try {
      await themeStore.saveThemeToDB()
      // 更新初始状态为当前状态
      initialColorValues.value = { ...colorValues.value }
      ElMessage.success('主题方案已应用')
    } catch (error) {
      console.error('应用主题方案失败:', error)
      ElMessage.error('应用主题方案失败')
    }
  }
</script>

<style scoped>
.settings-panel {
  padding: 0;
}

.settings-content {
  display: flex;
  gap: 24px;
}

.settings-left {
  flex: 1;
  padding-right: 24px;
}

.settings-right {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-color);
  padding-left: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-section {
  margin-bottom: 16px;
  display: flex;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  margin-right: 16px;
  color: var(--text-primary);
}

/* 模式切换 */
.mode-switch {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mode-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s;
  color: var(--text-secondary);
}

.mode-icon:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.mode-icon.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.mode-icon .el-icon {
  font-size: 24px;
}

/* 配置选项 */
.config-options {
  flex:1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: background 0.2s;
}

.option-item:hover {
  background: var(--bg-hover);
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 14px;
}

.option-label .el-icon {
  font-size: 18px;
  color: var(--primary);
}

.option-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  max-width: 300px;
  margin-left: 16px;
}

.color-grid {
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
}

.color-grid-list {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.color-grid-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.color-grid-label {
  color: var(--text-primary);
  font-size: 13px;
}

.color-picker-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-value {
  min-width: 80px;
  text-align: right;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: monospace;
}

.option-control ::v-deep(.el-slider) {
  flex: 1;
}

.option-control ::v-deep(.el-slider__input) {
  width: 60px;
}

.slider-value {
  min-width: 50px;
  text-align: right;
  color: var(--text-secondary);
  font-size: 12px;
}

.toggle-item {
  padding: 16px 12px;
}

.apply-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.apply-button {
  flex: 1;
  background-color: var(--primary);
}

.unsaved-indicator {
  font-size: 12px;
  color: var(--primary);
  font-weight: 500;
}

.reset-button {
  width: 100%;
  margin-top: 8px;
}

/* 背景设置 */
.background-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: 1fr;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.background-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--border-color);
  transition: all 0.2s;
}

.background-item:hover {
  border-color: var(--primary);
  transform: scale(1.05);
}

.background-item.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary);
}

.background-thumbnail {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.default-bg {
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.default-bg .el-icon {
  font-size: 24px;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.background-item:hover .background-overlay,
.background-item.active .background-overlay {
  opacity: 1;
}

.background-overlay .el-icon {
  color: #ffffff;
  font-size: 24px;
}

.background-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.controls-left {
  display: flex;
  gap: 8px;
}

.background-controls ::v-deep(.el-pagination) {
  margin: 0;
}

.background-controls ::v-deep(.el-pagination .btn-prev),
.background-controls ::v-deep(.el-pagination .btn-next),
.background-controls ::v-deep(.el-pagination .number) {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.background-controls ::v-deep(.el-pagination .btn-prev:hover),
.background-controls ::v-deep(.el-pagination .btn-next:hover),
.background-controls ::v-deep(.el-pagination .number:hover) {
  color: var(--primary);
  border-color: var(--primary);
}

.background-controls ::v-deep(.el-pagination .number.is-active) {
  background-color: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

.custom-background-input {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

/* 插图区域 */
.anime-illustration {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.illustration-placeholder {
  text-align: center;
  color: var(--text-secondary);
}

.illustration-icon {
  font-size: 120px;
  color: var(--border-color);
  margin-bottom: 16px;
}

.illustration-placeholder p {
  margin: 0;
  font-size: 14px;
}
/* 对话框样式 */
::v-deep(.theme-settings-dialog .el-dialog) {
  background-color: var(--bg-secondary) !important;
  border-radius: 12px;
  height: 500px !important;
  max-height: 500px !important;
}

::v-deep(.theme-settings-dialog .el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

::v-deep(.theme-settings-dialog .el-dialog__title) {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

::v-deep(.theme-settings-dialog .el-dialog__body) {
  padding: 24px;
  height: calc(500px - 80px) !important;
  max-height: calc(500px - 80px) !important;
  overflow-y: auto;
}

::v-deep(.theme-settings-dialog .el-dialog__headerbtn) {
  top: 20px;
  right: 24px;
}

::v-deep(.theme-settings-dialog .el-dialog__close) {
  color: var(--text-secondary);
  font-size: 20px;
}

::v-deep(.theme-settings-dialog .el-dialog__close:hover) {
  color: var(--text-primary);
}

/* Element Plus 组件样式覆盖 */
::v-deep(.el-slider__runway) {
  background-color: var(--bg-tertiary);
}

::v-deep(.el-slider__bar) {
  background-color: var(--primary);
}

::v-deep(.el-slider__button) {
  border-color: var(--primary);
  background-color: var(--primary);
}

::v-deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--primary);
}

::v-deep(.el-input__wrapper) {
  background-color: var(--bg-tertiary);
  border-color: var(--border-color);
}

::v-deep(.el-input__inner) {
  color: var(--text-primary);
}
</style>
