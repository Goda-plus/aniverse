<template>
  <el-dialog
    v-model="innerVisible"
    width="720px"
    class="onboarding-dialog"
    :close-on-click-modal="false"
    :show-close="true"
    destroy-on-close
  >
    <template #header>
      <div class="dialog-header">
        <div>
          <h3>{{ stepTitle }}</h3>
          <p class="subtitle">
            让我们更好地为你推荐社区与内容（可随时在个人中心修改）
          </p>
        </div>
        <el-button text @click="handleSkip">
          跳过
        </el-button>
      </div>
    </template>

    <div class="onboarding-steps">
      <div
        v-for="step in 3"
        :key="step"
        :class="['step-dot', { 'is-active': currentStep === step, 'is-completed': currentStep > step }]"
      />
    </div>

    <el-form
      ref="formRef"
      :model="form"
      label-width="80px"
      :rules="rules"
      class="onboarding-form"
    >
      <!-- 步骤 1：基本信息 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="section">
          <div class="section-title">
            基本信息
          </div>
          <el-form-item label="昵称" prop="nickname">
            <el-input
              v-model="form.nickname"
              maxlength="20"
              show-word-limit
              placeholder="展示给其他用户的名字"
            />
          </el-form-item>
          <el-form-item label="签名" prop="bio">
            <el-input
              v-model="form.bio"
              type="textarea"
              :rows="2"
              maxlength="80"
              show-word-limit
              placeholder="一句话介绍自己（可选）"
            />
          </el-form-item>
          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="form.gender">
              <el-radio-button label="male">
                男
              </el-radio-button>
              <el-radio-button label="female">
                女
              </el-radio-button>
              <el-radio-button label="other">
                其他
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="生日" prop="birthday">
            <el-date-picker
              v-model="form.birthday"
              type="date"
              placeholder="选择生日（可选）"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%;"
            />
          </el-form-item>
        </div>
      </div>

      <!-- 步骤 2：兴趣标签（类似创建社区的网格可多选） -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="section">
          <div class="section-title">
            兴趣标签
            <span class="section-subtitle">（可多选，至少选 3 个更利于推荐）</span>
          </div>

          <div class="tags-container">
            <el-input
              v-model="tagSearchKeyword"
              placeholder="搜索标签..."
              class="tag-search-input"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>

            <div class="tags-grid">
              <div
                v-for="tag in filteredTags"
                :key="tag.id"
                :class="['tag-item', { 'is-selected': isTagSelected(tag.id) }]"
                @click="toggleTag(tag.id)"
              >
                <div class="tag-name">
                  {{ tag.name }}
                </div>
                <div v-if="tag.description" class="tag-description">
                  {{ tag.description }}
                </div>
              </div>
              <div v-if="!loadingTags && filteredTags.length === 0" class="tags-empty">
                暂无匹配的标签
              </div>
            </div>

            <div v-if="form.tagIds.length > 0" class="selected-tags">
              <div class="selected-tags-title">
                已选择的标签：
              </div>
              <div class="selected-tags-list">
                <el-tag
                  v-for="tagId in form.tagIds"
                  :key="tagId"
                  class="selected-tag"
                  closable
                  @close="removeTag(tagId)"
                >
                  {{ getTagName(tagId) }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤 3：偏好类型 -->
      <div v-if="currentStep === 3" class="step-content">
        <div class="section">
          <div class="section-title">
            偏好类型
          </div>

          <el-form-item label="番剧类型" prop="genres">
            <el-select
              v-model="form.genres"
              multiple
              clearable
              :loading="loadingGenres"
              placeholder="选择你常看的番剧类型（如：日常、战斗、恋爱…）"
            >
              <el-option
                v-for="genre in genreOptions"
                :key="genre.id"
                :label="genre.name"
                :value="genre.name"
              />
            </el-select>
          </el-form-item>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleSkip">
          以后再说
        </el-button>
        <el-button
          v-if="currentStep > 1"
          @click="prevStep"
        >
          上一步
        </el-button>
        <el-button
          v-if="currentStep < 3"
          type="primary"
          :disabled="!canNextStep"
          @click="nextStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="currentStep === 3"
          type="primary"
          :loading="submitting"
          @click="handleConfirm"
        >
          完成并开始使用
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, watch, onMounted, computed, defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Search } from '@element-plus/icons-vue'
  import { getUserInfo, updateUserInfo } from '@/axios/user'
  import { getTagsList } from '@/axios/tags'
  import { getAllGenres } from '@/axios/genre'
  import { batchAddInterests } from '@/axios/userInterest'

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:visible', 'completed', 'skipped'])

  const innerVisible = ref(props.visible)
  const formRef = ref(null)
  const currentStep = ref(1)

  const form = reactive({
    nickname: '',
    bio: '',
    gender: '',
    birthday: '',
    tagIds: [],
    genres: []
  })

  const tagOptions = ref([])
  const tagSearchKeyword = ref('')
  const genreOptions = ref([])
  const loadingTags = ref(false)
  const loadingGenres = ref(false)
  const submitting = ref(false)

  const stepTitle = computed(() => {
    const titles = {
      1: '完善你的基本信息',
      2: '选择你的兴趣标签',
      3: '选择偏好类型'
    }
    return titles[currentStep.value] || '完善个人信息'
  })

  const rules = {
    nickname: [
      { required: true, message: '请输入昵称', trigger: 'blur' }
    ]
  }

  const canNextStep = computed(() => {
    if (currentStep.value === 1) {
      return !!form.nickname
    }
    return true
  })

  const filteredTags = computed(() => {
    if (!tagSearchKeyword.value) return tagOptions.value
    const keyword = tagSearchKeyword.value.toLowerCase()
    return tagOptions.value.filter(tag =>
      tag.name.toLowerCase().includes(keyword) ||
      (tag.description && tag.description.toLowerCase().includes(keyword))
    )
  })

  const isTagSelected = (tagId) => form.tagIds.includes(tagId)

  const toggleTag = (tagId) => {
    const idx = form.tagIds.indexOf(tagId)
    if (idx > -1) {
      form.tagIds.splice(idx, 1)
    } else {
      form.tagIds.push(tagId)
    }
  }

  const removeTag = (tagId) => {
    const idx = form.tagIds.indexOf(tagId)
    if (idx > -1) {
      form.tagIds.splice(idx, 1)
    }
  }

  const getTagName = (tagId) => {
    const tag = tagOptions.value.find(t => t.id === tagId)
    return tag ? tag.name : ''
  }

  // 同步外部 v-model
  watch(
    () => props.visible,
    (val) => {
      innerVisible.value = val
      if (val) {
        currentStep.value = 1
        initData()
      }
    }
  )

  watch(innerVisible, (val) => {
    emit('update:visible', val)
  })

  async function initData () {
    await Promise.all([loadUserInfo(), loadTags(), loadGenres()])
  }

  async function loadUserInfo () {
    try {
      const res = await getUserInfo()
      if (res.success && res.data) {
        const info = res.data
        form.nickname = info.nickname || info.username || ''
        form.bio = info.bio || ''
        form.gender = info.gender || ''
        form.birthday = info.birthday || ''
      }
    } catch (error) {
      console.error('获取用户信息失败', error)
    }
  }

  async function loadTags () {
    loadingTags.value = true
    try {
      const res = await getTagsList({ page: 1, pageSize: 50 })
      if (res.success) {
        // 兼容 data 在 data 或 data.list 场景
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.list || [])
        tagOptions.value = list
      }
    } catch (error) {
      console.error('获取标签列表失败', error)
    } finally {
      loadingTags.value = false
    }
  }

  async function loadGenres () {
    loadingGenres.value = true
    try {
      const res = await getAllGenres()
      if (res.success) {
        genreOptions.value = Array.isArray(res.data) ? res.data : (res.data?.genres || [])
      }
    } catch (error) {
      console.error('获取分类失败', error)
    } finally {
      loadingGenres.value = false
    }
  }

  async function handleConfirm () {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      submitting.value = true

      // 更新基础资料
      await updateUserInfo({
        nickname: form.nickname,
        bio: form.bio,
        gender: form.gender || null,
        birthday: form.birthday || null
      })

      // 保存兴趣标签（可选）
      if (form.tagIds.length > 0) {
        // 后端期望的 tags 字段同时包含 id 和标签名
        const selectedTags = form.tagIds.map(id => {
          const tag = tagOptions.value.find(t => t.id === id)
          return {
            id,
            name: tag ? tag.name : ''
          }
        })

        await batchAddInterests({
          // 兼容后端原有的 tag_ids 字段，同时额外传 tags（包含 id 和 name）
          tag_ids: form.tagIds,
          tags: selectedTags,
          genres: form.genres
        })
      }

      ElMessage.success('资料已更新，欢迎加入 Aniverse！')
      innerVisible.value = false
      emit('completed')
    } catch (error) {
      console.error('保存资料失败', error)
      ElMessage.error(error.response?.data?.message || '保存失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  function handleSkip () {
    innerVisible.value = false
    emit('skipped')
  }

  function nextStep () {
    if (currentStep.value < 3 && canNextStep.value) {
      currentStep.value++
    }
  }

  function prevStep () {
    if (currentStep.value > 1) {
      currentStep.value--
    }
  }

  onMounted(() => {
    if (innerVisible.value) {
      initData()
    }
  })
</script>

<style scoped>
.onboarding-dialog :deep(.el-dialog__body) {
  padding-top: 0;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.onboarding-form {
  padding-top: 8px;
}

.onboarding-steps {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
  padding-left: 4px;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary, rgba(255, 255, 255, 0.3));
  transition: all 0.3s ease;
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

.section {
  margin-bottom: 18px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-color);
}

.section-subtitle {
  font-size: 12px;
  font-weight: 400;
  margin-left: 6px;
  color: var(--text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 标签网格选择样式，沿用创建社区风格 */
.tags-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tag-search-input {
  max-width: 360px;
}

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  max-height: 360px;
  overflow-y: auto;
  padding: 8px;
}

.tags-grid::-webkit-scrollbar {
  width: 8px;
}

.tags-grid::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

.tag-item {
  padding: 12px 14px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg, var(--bg-secondary));
  min-height: 64px;
}

.tag-item:hover {
  border-color: var(--primary, #0079d3);
  background: var(--bg-hover, rgba(0, 121, 211, 0.05));
}

.tag-item.is-selected {
  border-color: var(--primary, #0079d3);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.tag-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tag-description {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.tags-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-secondary);
  padding: 24px 0;
}

.selected-tags {
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.selected-tags-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.selected-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-tag {
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
  border-color: var(--primary, #0079d3);
  color: var(--primary, #0079d3);
}
</style>



