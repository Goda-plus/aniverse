<template>
  <el-dialog
    v-model="dialogVisible"
    :title="getStepTitle()"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <div class="create-community-dialog">
      <!-- 步骤指示器 - 左下角圆点组 -->
      <div class="step-dots">
        <div
          v-for="step in 3"
          :key="step"
          :class="['step-dot', { 'is-active': currentStep === step, 'is-completed': currentStep > step }]"
        />
      </div>

      <!-- 步骤1: 选择主题 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="step-subtitle">
          请选择主题,帮助 Reddit 用户发现你的社区
        </div>
        <div class="categories-grid">
          <div
            v-for="category in categories"
            :key="category.id"
            :class="['category-item', { 'is-selected': formData.genre_id === category.id }]"
            @click="selectCategory(category.id)"
          >
            <div class="category-icon">
              {{ getCategoryEmoji(category.ch_name || category.name) }}
            </div>
            <div class="category-name">
              {{ category.ch_name || category.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 选择类型 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="step-subtitle">
          这是哪类社区?
        </div>
        <div class="community-types">
          <div
            v-for="type in communityTypes"
            :key="type.value"
            :class="['type-item', { 'is-selected': formData.visibility === type.value }]"
            @click="selectType(type.value)"
          >
            <div class="type-icon">
              <el-icon :size="24">
                <component :is="type.icon" />
              </el-icon>
            </div>
            <div class="type-content">
              <div class="type-title">
                {{ type.label }}
              </div>
              <div class="type-description">
                {{ type.description }}
              </div>
            </div>
            <div class="type-radio">
              <el-radio :model-value="formData.visibility === type.value" />
            </div>
          </div>
          
          <!-- 成人内容开关 -->
          <div class="adult-option">
            <div class="adult-content">
              <div class="adult-icon">
                <span class="adult-badge">18</span>
              </div>
              <div class="adult-text">
                <div class="adult-title">
                  成人 (18+)
                </div>
                <div class="adult-description">
                  用户必须年满18岁才能浏览和贡献内容
                </div>
              </div>
            </div>
            <el-switch v-model="formData.is_adult" />
          </div>
        </div>
        
        <div class="agreement-text">
          继续操作即表示你同意我们的
          <el-link type="primary" :underline="false">
            版主行为准则
          </el-link>
          并确认已了解
          <el-link type="primary" :underline="false">
            Reddit 规则
          </el-link>。
        </div>
      </div>

      <!-- 步骤3: 填写信息 -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="form-layout">
          <div class="form-left">
            <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
              <el-form-item label="社区名称" prop="name" required>
                <el-input
                  v-model="formData.name"
                  placeholder="请输入社区名称"
                  maxlength="100"
                  show-word-limit
                />
                <div class="form-hint">
                  社区名称将显示为 r/社区名称
                </div>
              </el-form-item>
              
              <el-form-item label="描述" prop="description">
                <el-input
                  v-model="formData.description"
                  type="textarea"
                  :rows="6"
                  placeholder="请描述你的社区（可选）"
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>
            </el-form>
          </div>
          
          <div class="form-right">
            <div class="preview-card">
              <div class="preview-header">
                <div class="preview-icon">
                  r/{{ formData.name || 'communityname' }}
                </div>
              </div>
              <div class="preview-info">
                <div class="preview-meta">
                  1个成员 • 1个在线
                </div>
                <div class="preview-ranking">
                  今日社区排名
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="currentStep > 1" @click="prevStep">
          返回
        </el-button>
        <el-button v-if="currentStep < 3" type="primary" :disabled="!canNextStep" @click="nextStep">
          下一步
        </el-button>
        <el-button v-if="currentStep === 3" type="primary" :loading="submitting" @click="submitForm">
          创建社区
        </el-button>
        <el-button @click="handleClose">
          取消
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, computed, watch, defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Globe, View, Lock } from '@element-plus/icons-vue'
  import { getAllGenres } from '@/axios/genre'
  import { createSubreddit } from '@/axios/subreddit'
  import { useRouter } from 'vue-router'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:modelValue', 'success'])

  const router = useRouter()

  const dialogVisible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const currentStep = ref(1)
  const categories = ref([])
  const submitting = ref(false)
  const formRef = ref(null)

  const formData = ref({
    genre_id: null,
    visibility: 'public',
    is_adult: false,
    name: '',
    description: ''
  })

  const communityTypes = [
    {
      value: 'public',
      label: '公共',
      icon: Globe,
      description: '任何人均可在此社区中浏览内容、发帖和评论'
    },
    {
      value: 'restricted',
      label: '受限',
      icon: View,
      description: '任何人均可浏览内容,但仅获批用户才能贡献内容'
    },
    {
      value: 'private',
      label: '私人',
      icon: Lock,
      description: '仅获批用户可浏览和贡献内容'
    }
  ]

  const rules = {
    name: [
      { required: true, message: '请输入社区名称', trigger: 'blur' },
      { min: 2, max: 100, message: '社区名称长度在 2 到 100 个字符', trigger: 'blur' }
    ],
    description: [
      { max: 1000, message: '描述不能超过1000个字符', trigger: 'blur' }
    ]
  }

  // 分类表情映射
  const categoryEmojiMap = {
    '动漫与角色扮演': '🍣',
    '互联网文化': '🐒',
    '技术': '🛠️',
    '家居与园艺': '🏡',
    '健康': '❤️',
    '健康与幸福': '🧘‍♀️',
    '交通工具': '🚗',
    '教育与职业': '🧑‍🎓',
    '科学': '🧪',
    '可收藏品与其他爱好': '❇️',
    '灵异': '💀',
    '流行文化': '✨',
    '人文与法律': '🏛️',
    '商业与金融': '💰',
    '身份与关系': '🌈',
    '胜地与旅行': '🌐',
    '时尚与美容': '👗',
    '食品与饮料': '🍔',
    '体育': '🏅',
    '问答与故事': '📝',
    '新闻与政治': '📰',
    '艺术': '🎨',
    '音乐': '🎵',
    '影视': '📺',
    '游戏': '🎮',
    '阅读与写作': '📖',
    '自然与户外': '🌿',
    '成人话题': '🔞',
    '成人内容': '🟥'
  }

  const getCategoryEmoji = (name) => {
    return categoryEmojiMap[name] || '📌'
  }

  const getStepTitle = () => {
    const titles = {
      1: '你的社区主题是什么?',
      2: '这是哪类社区?',
      3: '向我们介绍你的社区'
    }
    return titles[currentStep.value] || ''
  }

  const canNextStep = computed(() => {
    if (currentStep.value === 1) {
      return formData.value.genre_id !== null
    }
    if (currentStep.value === 2) {
      return formData.value.visibility !== null
    }
    return true
  })

  const selectCategory = (genreId) => {
    formData.value.genre_id = genreId
  }

  const selectType = (type) => {
    formData.value.visibility = type
  }

  const nextStep = () => {
    if (currentStep.value < 3) {
      currentStep.value++
    }
  }

  const prevStep = () => {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  const loadCategories = async () => {
    try {
      const res = await getAllGenres()
      if (res.success) {
        categories.value = res.data || []
      }
    } catch (error) {
      console.error('加载分类失败:', error)
      ElMessage.error('加载分类失败')
    }
  }

  const submitForm = async () => {
    if (!formRef.value) return
  
    try {
      await formRef.value.validate()
    
      submitting.value = true
    
      const submitData = {
        name: formData.value.name.trim(),
        description: formData.value.description.trim() || '',
        category_id: formData.value.genre_id, // API 使用 category_id，但数据来自 genres
        visibility: formData.value.visibility,
        is_adult: formData.value.is_adult
      }
    
      const res = await createSubreddit(submitData)
    
      if (res.success) {
        ElMessage.success('社区创建成功')
        emit('success', res.data)
        handleClose()
        // 跳转到新创建的社区
        router.push(`/r/${formData.value.name}`)
      } else {
        ElMessage.error(res.message || '创建社区失败')
      }
    } catch (error) {
      if (error !== false) { // 表单验证失败会返回 false
        console.error('创建社区失败:', error)
        ElMessage.error(error.message || '创建社区失败')
      }
    } finally {
      submitting.value = false
    }
  }

  const handleClose = () => {
    dialogVisible.value = false
    // 重置表单
    currentStep.value = 1
    formData.value = {
      genre_id: null,
      visibility: 'public',
      is_adult: false,
      name: '',
      description: ''
    }
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  }

  // 监听弹窗打开，加载分类
  watch(dialogVisible, (val) => {
    if (val) {
      loadCategories()
    }
  })
</script>

<style scoped>
/* Reddit 风格的弹窗样式 */
:deep(.el-dialog) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
}

:deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
}

.create-community-dialog {
  padding: 20px 0;
  position: relative;
  min-height: 500px;
}

/* 左下角步骤圆点指示器 */
.step-dots {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  align-items: center;
  z-index: 10;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary, rgba(255, 255, 255, 0.3));
  transition: all 0.3s ease;
  cursor: pointer;
}

.step-dot.is-active {
  width: 10px;
  height: 10px;
  background: var(--primary, #0079d3);
  box-shadow: 0 0 0 2px rgba(0, 121, 211, 0.2);
}

.step-dot.is-completed {
  background: var(--primary, #0079d3);
  opacity: 0.6;
}

.step-content {
  min-height: 400px;
  padding-bottom: 60px; /* 为底部圆点留出空间 */
}

.step-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  text-align: center;
}

/* 分类网格 - Reddit 风格 */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--text-tertiary) transparent;
}

.categories-grid::-webkit-scrollbar {
  width: 8px;
}

.categories-grid::-webkit-scrollbar-track {
  background: transparent;
}

.categories-grid::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
  position: relative;
}

.category-item:hover {
  border-color: var(--primary, #0079d3);
  background: var(--bg-hover, rgba(0, 121, 211, 0.05));
}

.category-item.is-selected {
  border-color: var(--primary, #0079d3);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.category-item.is-selected::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 16px;
  height: 16px;
  background: var(--primary, #0079d3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-item.is-selected::before {
  content: '✓';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 16px;
  height: 16px;
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.category-icon {
  display: none; /* 只保留文字按钮，隐藏图标 */
}

.category-name {
  font-size: 13px;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.4;
}

/* 社区类型 */
.community-types {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
  gap: 16px;
}

.type-item:hover {
  border-color: var(--primary, #0079d3);
  background: var(--bg-hover, rgba(0, 121, 211, 0.05));
}

.type-item.is-selected {
  border-color: var(--primary, #0079d3);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.type-icon {
  display: none; /* 隐藏类型图标，只留按钮内容 */
}

.type-content {
  flex: 1;
}

.type-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.type-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.type-radio {
  flex-shrink: 0;
}

/* 成人选项 */
.adult-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  background: var(--card-bg);
}

.adult-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.adult-icon {
  display: none; /* 隐藏成人标记的图标，只留文字与开关 */
}

.adult-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.adult-text {
  flex: 1;
}

.adult-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.adult-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.agreement-text {
  margin-top: 24px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.6;
}

/* 表单布局 */
.form-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 32px;
}

.form-left {
  flex: 1;
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.form-right {
  flex-shrink: 0;
}

.preview-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 20px;
  position: sticky;
  top: 20px;
}

.preview-header {
  margin-bottom: 16px;
}

.preview-icon {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-meta {
  font-size: 14px;
  color: var(--text-secondary);
}

.preview-ranking {
  font-size: 12px;
  color: var(--text-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
}

/* Reddit 风格的按钮 */
.dialog-footer .el-button {
  border-radius: 9999px;
  font-weight: 600;
  padding: 8px 24px;
}

.dialog-footer .el-button--primary {
  background: var(--primary, #0079d3);
  border-color: var(--primary, #0079d3);
}

.dialog-footer .el-button--primary:hover {
  background: var(--primary-hover, #005ba1);
  border-color: var(--primary-hover, #005ba1);
}

/* 响应式 */
@media (max-width: 768px) {
  .form-layout {
    grid-template-columns: 1fr;
  }
  
  .form-right {
    display: none;
  }
  
  .categories-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}
</style>

