<template>
  <el-dialog
    v-model="dialogVisible"
    :title="getStepTitle()"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <div class="create-community-dialog">
      <!-- 步骤指示器 - 左下角圆点组 -->
      <div class="step-dots">
        <div
          v-for="step in 5"
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
            <div class="category-name">
              {{ category.ch_name || category.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤2: 选择标签 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="step-subtitle">
          选择标签，帮助用户更好地发现你的社区（可选）
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
          </div>
          <div v-if="selectedTags.length > 0" class="selected-tags">
            <div class="selected-tags-title">
              已选择的标签：
            </div>
            <div class="selected-tags-list">
              <el-tag
                v-for="tagId in selectedTags"
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

      <!-- 步骤3: 选择类型 -->
      <div v-if="currentStep === 3" class="step-content">
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

      <!-- 步骤4: 关联动漫 -->
      <div v-if="currentStep === 4" class="step-content">
        <div class="step-subtitle">
          关联动漫，帮助用户更好地了解你的社区（可选）
        </div>
        <div class="media-container">
          <el-input
            v-model="mediaSearchKeyword"
            placeholder="搜索动漫..."
            class="media-search-input"
            clearable
            @input="handleMediaSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <div v-if="mediaLoading" class="media-loading">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>加载中...</span>
          </div>
          <div v-else-if="filteredMedia.length === 0" class="media-empty">
            <div class="media-empty-text">
              {{ mediaSearchKeyword ? '未找到相关动漫，请尝试其他关键词' : '暂无动漫数据' }}
            </div>
          </div>
          <MediaList
            v-else
            :items="filteredMedia"
            layout="grid"
            :selectable="true"
            :selected-ids="selectedMedia"
            @select="handleMediaSelect"
          />
          <div v-if="selectedMedia.length > 0" class="selected-media">
            <div class="selected-media-title">
              已选择的动漫：
            </div>
            <div class="selected-media-list">
              <el-tag
                v-for="mediaId in selectedMedia"
                :key="mediaId"
                class="selected-media-tag"
                closable
                @close="removeMedia(mediaId)"
              >
                {{ getMediaName(mediaId) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤5: 填写信息 -->
      <div v-if="currentStep === 5" class="step-content">
        <div class="form-layout">
          <div class="form-left">
            <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
              <el-form-item label="社区头像" prop="image_url">
                <div class="avatar-upload-section">
                  <el-upload
                    class="avatar-uploader"
                    :show-file-list="false"
                    :before-upload="beforeAvatarUpload"
                    :http-request="handleAvatarUpload"
                    accept="image/*"
                  >
                    <div v-if="avatarPreview || formData.image_url" class="avatar-preview">
                      <img :src="avatarPreview || formData.image_url" alt="社区头像">
                      <div class="avatar-overlay">
                        <el-icon class="avatar-icon">
                          <Plus />
                        </el-icon>
                        <span>更换头像</span>
                      </div>
                    </div>
                    <el-icon v-else class="avatar-uploader-icon" :class="{ 'is-uploading': avatarUploading }">
                      <Plus v-if="!avatarUploading" />
                      <Loading v-else />
                    </el-icon>
                    <div v-if="!avatarPreview && !formData.image_url" class="avatar-upload-text">
                      <div class="upload-text-main">
                        上传头像
                      </div>
                      <div class="upload-text-hint">
                        支持 JPG、PNG 格式，建议尺寸 256x256
                      </div>
                    </div>
                  </el-upload>
                  <div v-if="avatarPreview || formData.image_url" class="avatar-actions">
                    <el-button size="small" @click="removeAvatar">
                      移除头像
                    </el-button>
                  </div>
                </div>
              </el-form-item>
              
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
                <div class="preview-avatar">
                  <img
                    v-if="avatarPreview || formData.image_url"
                    :src="avatarPreview || formData.image_url"
                    alt="社区头像"
                  >
                  <div v-else class="preview-avatar-placeholder">
                    r/
                  </div>
                </div>
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
        <el-button v-if="currentStep < 5" type="primary" :disabled="!canNextStep" @click="nextStep">
          下一步
        </el-button>
        <el-button v-if="currentStep === 5" type="primary" :loading="submitting" @click="submitForm">
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
  import { Search, Plus, Loading } from '@element-plus/icons-vue'
  import { getAllGenres } from '@/axios/genre'
  import { createSubreddit } from '@/axios/subreddit'
  import { getTagsList } from '@/axios/tags'
  import { uploadPostImage } from '@/axios/post'
  import { getMediaList, searchMedia } from '@/axios/media'
  import { useRouter } from 'vue-router'
  import MediaList from '@/components/MediaList.vue'

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
  const tags = ref([])
  const tagSearchKeyword = ref('')
  const mediaList = ref([])
  const mediaSearchKeyword = ref('')
  const mediaLoading = ref(false)
  const submitting = ref(false)
  const formRef = ref(null)

  const formData = ref({
    genre_id: null,
    visibility: 'public',
    is_adult: false,
    name: '',
    description: '',
    tag_ids: [],
    media_ids: [],
    image_url: null
  })
  const avatarUploading = ref(false)
  const avatarPreview = ref(null)

  const communityTypes = [
    {
      value: 'public',
      label: '公共',
      description: '任何人均可在此社区中浏览内容、发帖和评论'
    },
    {
      value: 'restricted',
      label: '受限',
      description: '任何人均可浏览内容,但仅获批用户才能贡献内容'
    },
    {
      value: 'private',
      label: '私人',
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

  const getStepTitle = () => {
    const titles = {
      1: '你的社区主题是什么?',
      2: '选择标签',
      3: '这是哪类社区?',
      4: '关联动漫',
      5: '向我们介绍你的社区'
    }
    return titles[currentStep.value] || ''
  }

  const canNextStep = computed(() => {
    if (currentStep.value === 1) {
      return formData.value.genre_id !== null
    }
    if (currentStep.value === 2) {
      return true // 标签是可选的，所以总是可以进入下一步
    }
    if (currentStep.value === 3) {
      return formData.value.visibility !== null
    }
    if (currentStep.value === 4) {
      return true // 动漫是可选的，所以总是可以进入下一步
    }
    return true
  })

  const selectedTags = computed(() => formData.value.tag_ids || [])
  const selectedMedia = computed(() => formData.value.media_ids || [])

  const filteredTags = computed(() => {
    if (!tagSearchKeyword.value) {
      return tags.value
    }
    const keyword = tagSearchKeyword.value.toLowerCase()
    return tags.value.filter(tag => 
      tag.name.toLowerCase().includes(keyword) ||
      (tag.description && tag.description.toLowerCase().includes(keyword))
    )
  })

  const filteredMedia = computed(() => {
    // 如果有搜索关键词，说明已经通过API搜索过了，直接返回搜索结果
    // 如果没有搜索关键词，返回默认列表的前20个
    if (!mediaSearchKeyword.value || mediaSearchKeyword.value.trim() === '') {
      return mediaList.value.slice(0, 20) // 默认显示前20个
    }
    // API已经返回了匹配的结果，不需要再次过滤
    return mediaList.value
  })

  const isTagSelected = (tagId) => {
    return formData.value.tag_ids.includes(tagId)
  }

  const toggleTag = (tagId) => {
    const index = formData.value.tag_ids.indexOf(tagId)
    if (index > -1) {
      formData.value.tag_ids.splice(index, 1)
    } else {
      formData.value.tag_ids.push(tagId)
    }
  }

  const removeTag = (tagId) => {
    const index = formData.value.tag_ids.indexOf(tagId)
    if (index > -1) {
      formData.value.tag_ids.splice(index, 1)
    }
  }

  const getTagName = (tagId) => {
    const tag = tags.value.find(t => t.id === tagId)
    return tag ? tag.name : ''
  }

  const isMediaSelected = (mediaId) => {
    return formData.value.media_ids.includes(mediaId)
  }

  const toggleMedia = (mediaId) => {
    const index = formData.value.media_ids.indexOf(mediaId)
    if (index > -1) {
      formData.value.media_ids.splice(index, 1)
    } else {
      formData.value.media_ids.push(mediaId)
    }
  }

  const handleMediaSelect = (media) => {
    toggleMedia(media.id)
  }

  const removeMedia = (mediaId) => {
    const index = formData.value.media_ids.indexOf(mediaId)
    if (index > -1) {
      formData.value.media_ids.splice(index, 1)
    }
  }

  const getMediaName = (mediaId) => {
    const media = mediaList.value.find(m => m.id === mediaId)
    return media ? (media.title_native || media.title || media.title_english || media.name) : ''
  }

  let searchTimeout = null
  const handleMediaSearch = async () => {
    // 清除之前的定时器
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    
    // 如果搜索关键词为空，加载默认列表
    if (!mediaSearchKeyword.value || mediaSearchKeyword.value.trim() === '') {
      loadMedia()
      return
    }
    
    // 如果搜索关键词少于2个字符，不搜索
    if (mediaSearchKeyword.value.length < 2) {
      return
    }
    
    // 防抖处理，500ms后执行搜索
    searchTimeout = setTimeout(async () => {
      mediaLoading.value = true
      try {
        const res = await searchMedia({ keyword: mediaSearchKeyword.value.trim(), page: 1, pageSize: 50 })
        if (res.success) {
          mediaList.value = res.data?.list || []
        }
      } catch (error) {
        console.error('搜索动漫失败:', error)
        ElMessage.error('搜索动漫失败')
      } finally {
        mediaLoading.value = false
      }
    }, 500)
  }

  const selectCategory = (genreId) => {
    formData.value.genre_id = genreId
  }

  const selectType = (type) => {
    formData.value.visibility = type
  }

  const nextStep = () => {
    if (currentStep.value < 5) {
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

  const loadTags = async () => {
    try {
      const res = await getTagsList({ page: 1, pageSize: 100 })
      if (res.success) {
        tags.value = res.data?.list || []
      }
    } catch (error) {
      console.error('加载标签失败:', error)
      ElMessage.error('加载标签失败')
    }
  }

  const loadMedia = async () => {
    try {
      const res = await getMediaList({ page: 1, pageSize: 50 })
      if (res.success) {
        mediaList.value = res.data?.list || []
      }
    } catch (error) {
      console.error('加载动漫列表失败:', error)
    }
  }

  const submitForm = async () => {
    if (!formRef.value) return
  
    try {
      await formRef.value.validate()
    
      submitting.value = true
      
      // 处理media数据，构建包含完整动漫数据的对象数组
      let mediaJson = null
      if (formData.value.media_ids && formData.value.media_ids.length > 0) {
        const mediaData = formData.value.media_ids.map(mediaId => {
          const media = mediaList.value.find(m => m.id === mediaId)
          if (!media) return null
          
          // 构建完整的动漫数据对象，包含所有字段
          return {
            id: media.id,
            title_native: media.title_native || null,
            title_english: media.title_english || null,
            description: media.description || null,
            format: media.format || null,
            status: media.status || null,
            source: media.source || null,
            start_date: media.start_date || null,
            end_date: media.end_date || null,
            season: media.season || null,
            season_year: media.season_year || null,
            episodes: media.episodes || null,
            duration: media.duration || null,
            chapters: media.chapters || null,
            volumes: media.volumes || null,
            hashtag: media.hashtag || null,
            cover_image_extra_large: media.cover_image_extra_large || null,
            cover_image_large: media.cover_image_large || null,
            cover_image_medium: media.cover_image_medium || null,
            cover_image_color: media.cover_image_color || null,
            banner_image: media.banner_image || null,
            average_score: media.average_score || null,
            mean_score: media.mean_score || null,
            popularity: media.popularity || null,
            favourites: media.favourites || null,
            is_boolean: media.is_boolean || 0,
            country_of_origin: media.country_of_origin || null,
            created_at: media.created_at || null,
            updated_at: media.updated_at || null,
            // genres 和 tags 可能是字符串（逗号分隔）或数组，统一处理为数组
            genres: Array.isArray(media.genres) 
              ? media.genres 
              : (media.genres ? media.genres.split(',').map(g => g.trim()).filter(Boolean) : []),
            tags: Array.isArray(media.tags) 
              ? media.tags 
              : (media.tags ? media.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
          }
        }).filter(Boolean)
        
        if (mediaData.length > 0) {
          mediaJson = JSON.stringify(mediaData)
        }
      }

      const submitData = {
        name: formData.value.name.trim(),
        description: formData.value.description.trim() || '',
        category_id: formData.value.genre_id, // API 使用 category_id，但数据来自 genres
        visibility: formData.value.visibility,
        is_adult: formData.value.is_adult,
        tag_ids: formData.value.tag_ids || [],
        media: mediaJson,
        image_url: formData.value.image_url || null
      }
    
      const res = await createSubreddit(submitData)
    
      if (res.success) {
        ElMessage.success('社区创建成功')
        emit('success', res.data)
        handleClose()
        // 等待接口返回后，使用返回的社区名称跳转
        const communityName = res.data?.name || formData.value.name
        if (communityName) {
          router.push({
            path: `/r/${communityName}`,
            query: {
              subredditId: res.data.id
            }
          })
        }
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

  const beforeAvatarUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('图片大小不能超过 5MB!')
      return false
    }
    return true
  }

  const handleAvatarUpload = async (options) => {
    const file = options.file
    avatarUploading.value = true
    
    try {
      // 创建预览
      const reader = new FileReader()
      reader.onload = (e) => {
        avatarPreview.value = e.target.result
      }
      reader.readAsDataURL(file)
      
      // 上传图片
      const res = await uploadPostImage(file)
      if (res.success) {
        formData.value.image_url = res.data.url
        ElMessage.success('头像上传成功')
      } else {
        ElMessage.error(res.message || '头像上传失败')
        avatarPreview.value = null
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      ElMessage.error(error.message || '头像上传失败')
      avatarPreview.value = null
    } finally {
      avatarUploading.value = false
    }
  }

  const removeAvatar = () => {
    formData.value.image_url = null
    avatarPreview.value = null
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
      description: '',
      tag_ids: [],
      media_ids: [],
      image_url: null
    }
    tagSearchKeyword.value = ''
    mediaSearchKeyword.value = ''
    mediaList.value = []
    avatarPreview.value = null
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  }

  // 监听弹窗打开，加载分类、标签和动漫列表
  watch(dialogVisible, (val) => {
    if (val) {
      loadCategories()
      loadTags()
      loadMedia()
    }
  })

  // 监听步骤变化，当进入步骤4时加载动漫列表
  watch(currentStep, (val) => {
    if (val === 4 && mediaList.value.length === 0) {
      loadMedia()
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

.category-name {
  font-size: 13px;
  color: var(--text-primary);
  text-align: center;
  line-height: 1.4;
}

/* 标签选择 */
.tags-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tag-search-input {
  margin-bottom: 8px;
}

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--text-tertiary) transparent;
}

.tags-grid::-webkit-scrollbar {
  width: 8px;
}

.tags-grid::-webkit-scrollbar-track {
  background: transparent;
}

.tags-grid::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

.tag-item {
  padding: 12px 16px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
}

.tag-item:hover {
  border-color: var(--primary, #0079d3);
  background: var(--bg-hover, rgba(0, 121, 211, 0.05));
}

.tag-item.is-selected {
  border-color: var(--primary, #0079d3);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.tag-item.is-selected::after {
  content: '✓';
  float: right;
  color: var(--primary, #0079d3);
  font-weight: 600;
  font-size: 16px;
}

.tag-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tag-description {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.selected-tags {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.selected-tags-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
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

/* 动漫选择 */
.media-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.media-search-input {
  margin-bottom: 8px;
}

.media-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--text-secondary);
}

.media-loading .is-loading {
  animation: rotate 1s linear infinite;
}

/* MediaList 组件容器样式 */
.media-container :deep(.media-list) {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--text-tertiary) transparent;
}

.media-container :deep(.media-list)::-webkit-scrollbar {
  width: 8px;
}

.media-container :deep(.media-list)::-webkit-scrollbar-track {
  background: transparent;
}

.media-container :deep(.media-list)::-webkit-scrollbar-thumb {
  background: var(--text-tertiary);
  border-radius: 4px;
}

.selected-media {
  margin-top: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.selected-media-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.selected-media-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-media-tag {
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
  border-color: var(--primary, #0079d3);
  color: var(--primary, #0079d3);
}

.media-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.media-empty-text {
  font-size: 14px;
  text-align: center;
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

/* 头像上传 */
.avatar-upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-uploader {
  width: 120px;
  height: 120px;
  border: 2px dashed var(--card-border, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: var(--primary, #0079d3);
  background: var(--bg-hover, rgba(0, 121, 211, 0.05));
}

.avatar-uploader-icon {
  font-size: 32px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.avatar-uploader-icon.is-uploading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.avatar-upload-text {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  padding: 0 8px;
}

.upload-text-main {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.upload-text-hint {
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 6px;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 12px;
  gap: 4px;
}

.avatar-uploader:hover .avatar-overlay {
  opacity: 1;
}

.avatar-icon {
  font-size: 24px;
}

.avatar-actions {
  display: flex;
  gap: 8px;
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
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
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

