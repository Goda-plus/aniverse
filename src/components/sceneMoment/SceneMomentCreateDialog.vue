<template>
  <el-dialog
    v-model="visible"
    title="创建名场面"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="step-container">
      <!-- 步骤指示器 -->
      <el-steps :active="activeStep" align-center class="mb-6">
        <el-step title="选择作品" description="选择或创建作品" />
        <el-step title="上传媒体" description="上传截图或GIF" />
        <el-step title="填写信息" description="标注详细信息" />
        <el-step title="预览确认" description="检查并提交" />
      </el-steps>

      <!-- 第一步：选择作品 -->
      <div v-if="activeStep === 0" class="step-content">
        <div class="work-selection">
          <p class="step-desc">
            请选择您要标注名场面的动漫或影视作品
          </p>

          <div class="work-search">
            <el-input
              v-model="workSearch"
              placeholder="搜索动漫..."
              clearable
              @keyup.enter="handleSearch"
              @clear="handleClearSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>

          <div class="work-list-container">
            <MediaList
              v-if="filteredWorks.length > 0"
              :items="filteredWorks"
              layout="grid"
              :selectable="true"
              :selected-ids="selectedWork ? [selectedWork.id] : []"
              @select="handleMediaSelect"
            />
            <div v-else-if="searchLoading" class="work-loading">
              <el-icon class="is-loading">
                <Loading />
              </el-icon>
              <span>加载中...</span>
            </div>
            <div v-else class="work-empty">
              <p>{{ workSearch ? '未找到相关动漫，请尝试其他关键词' : '暂无动漫数据' }}</p>
            </div>
            <el-pagination
              v-if="workPagination.total > 0"
              v-model:current-page="workPagination.page"
              v-model:page-size="workPagination.pageSize"
              :total="workPagination.total"
              :page-sizes="[12, 24, 48]"
              layout="total, sizes, prev, pager, next, jumper"
              class="work-pagination"
              background
              @size-change="handlePageSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </div>

      <!-- 第二步：上传媒体 -->
      <div v-if="activeStep === 1" class="step-content">
        <div class="media-upload">
          <p class="step-desc">
            上传名场面的截图或GIF动图
          </p>

          <div class="upload-area">
            <el-upload
              ref="uploadRef"
              class="upload-component"
              drag
              :show-file-list="false"
              :before-upload="handleBeforeUpload"
              :auto-upload="false"
              :on-change="handleFileChange"
              :multiple="true"
              :limit="9"
            >
              <div class="upload-placeholder">
                <el-icon class="upload-icon">
                  <Picture />
                </el-icon>
                <div class="upload-text">
                  <p>拖拽文件到此处，或 <em>点击上传</em></p>
                  <p class="upload-hint">
                    支持 JPEG、PNG、GIF 格式，图片最大 5MB，GIF 最大 10MB
                    <br>
                    最多可上传 9 张图片
                  </p>
                </div>
              </div>
            </el-upload>
          </div>

          <div v-if="form.image_files && form.image_files.length > 0" class="preview-section">
            <h4>预览 ({{ form.image_files.length }}/9)</h4>
            <div class="image-grid">
              <div
                v-for="(file, index) in form.image_files"
                :key="index"
                class="image-item"
              >
                <el-image
                  :src="form.image_urls[index]"
                  :preview-src-list="form.image_urls"
                  :initial-index="index"
                  fit="cover"
                  class="grid-image"
                  :preview-teleported="true"
                />
                <div class="image-overlay">
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="removeImage(index)"
                  />
                </div>
              </div>
            </div>
            <div v-if="form.image_files.length < 9" class="upload-hint-text">
              还可以上传 {{ 9 - form.image_files.length }} 张图片
            </div>
          </div>
        </div>
      </div>

      <!-- 第三步：填写信息 -->
      <div v-if="activeStep === 2" class="step-content">
        <div class="annotation-form">
          <p class="step-desc">
            为名场面添加详细的标注信息
          </p>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
            <el-form-item label="标题" prop="title">
              <el-input v-model="form.title" placeholder="例如：螺旋丸首秀" />
            </el-form-item>

            <el-form-item label="集数/章节">
              <el-input v-model="form.episode" placeholder="例如：第3话 / S01E05（可选）" />
            </el-form-item>

            <el-form-item label="时间点">
              <el-time-picker
                v-model="form.time_position"
                format="HH:mm:ss"
                value-format="HH:mm:ss"
                placeholder="选择时间点"
                clearable
              />
              <span class="hint">名场面出现的时间点（可选）</span>
            </el-form-item>

            <el-form-item label="经典台词">
              <el-input v-model="form.quote_text" type="textarea" :rows="2" placeholder="名场面的经典台词（可选）" />
            </el-form-item>

            <el-form-item label="场景描述" prop="description">
              <el-input v-model="form.description" type="textarea" :rows="3" placeholder="对名场面的简要描述（必填）" />
            </el-form-item>

            <el-form-item label="标签">
              <el-select
                v-model="form.tag_ids"
                multiple
                filterable
                remote
                :remote-method="remoteSearchTags"
                :loading="tagsLoading"
                placeholder="搜索并选择标签（可选）"
                style="width: 100%;"
              >
                <el-option v-for="t in tagOptions" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </el-form-item>

            <el-form-item label="相关角色">
              <el-select v-model="form.character_ids" multiple filterable placeholder="选择相关角色（可选）" style="width: 100%;">
                <el-option
                  v-for="c in characters"
                  :key="c.id"
                  :label="c.name_native || c.name_alternative || String(c.id)"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="主要角色">
              <el-select v-model="form.main_character_id" clearable filterable placeholder="可选" style="width: 100%;">
                <el-option
                  v-for="c in characters"
                  :key="c.id"
                  :label="c.name_native || c.name_alternative || String(c.id)"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="公开可见">
              <el-switch v-model="form.is_public" />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 第四步：预览确认 -->
      <div v-if="activeStep === 3" class="step-content">
        <div class="preview-confirm">
          <p class="step-desc">
            请检查标注信息是否正确
          </p>

          <div class="preview-card">
            <div class="preview-media">
              <div v-if="form.image_files && form.image_files.length > 0" class="preview-image-grid">
                <el-image
                  v-for="(file, index) in form.image_files"
                  :key="index"
                  :src="form.image_urls[index]"
                  :preview-src-list="form.image_urls"
                  :initial-index="index"
                  fit="cover"
                  class="preview-grid-image"
                  :preview-teleported="true"
                />
              </div>
              <div v-else class="preview-placeholder">
                暂无图片
              </div>
            </div>
            <div class="preview-info">
              <h4>{{ form.title }}</h4>
              <div class="preview-meta">
                <span class="work-name">{{ selectedWork?.title }}</span>
                <span v-if="form.episode"> · {{ form.episode }}</span>
                <span v-if="form.time_position"> · {{ formatTime(form.time_position) }}</span>
              </div>
              <div v-if="form.quote_text" class="preview-quote">
                "{{ form.quote_text }}"
              </div>
              <div class="preview-description">
                {{ form.description }}
              </div>
              <div v-if="form.tag_ids.length" class="preview-tags">
                <el-tag v-for="tagId in form.tag_ids" :key="tagId" size="small">
                  {{ getTagName(tagId) }}
                </el-tag>
              </div>
              <div class="preview-visibility">
                <el-tag :type="form.is_public ? 'success' : 'info'" size="small">
                  {{ form.is_public ? '公开' : '私密' }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="activeStep > 0 && !(activeStep === 1 && props.mediaId)" @click="handlePrev">
          上一步
        </el-button>
        <el-button @click="visible = false">
          取消
        </el-button>
        <el-button
          v-if="activeStep < 3"
          type="primary"
          :disabled="!canProceed"
          @click="handleNext"
        >
          下一步
        </el-button>
        <el-button
          v-if="activeStep === 3"
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          提交审核
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 创建作品对话框 -->
  <el-dialog
    v-model="showCreateWork"
    title="创建新作品"
    width="500px"
    append-to-body
  >
    <el-form ref="workFormRef" :model="workForm" :rules="workRules" label-width="80px">
      <el-form-item label="作品名" prop="name">
        <el-input v-model="workForm.name" placeholder="作品名称" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-select v-model="workForm.type" placeholder="选择类型">
          <el-option label="动漫" value="anime" />
          <el-option label="电影" value="movie" />
          <el-option label="电视剧" value="drama" />
        </el-select>
      </el-form-item>
      <el-form-item label="发布年份">
        <el-input-number v-model="workForm.release_year" :min="1900" :max="2030" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="workForm.description" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showCreateWork = false">
        取消
      </el-button>
      <el-button type="primary" @click="createWork">
        创建
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { computed, reactive, ref, watch, defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Search, Check, Plus, Picture, Loading, Delete } from '@element-plus/icons-vue'
  import { uploadSceneMedia, createSceneMoment } from '@/axios/sceneMoments'
  import { getTagsList } from '@/axios/tags'
  import { getMediaList, createMedia, getMediaDetail } from '@/axios/media'
  import MediaList from '@/components/MediaList.vue'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mediaId: { type: [String, Number], default: null },
    characters: { type: Array, default: () => [] }
  })
  const emit = defineEmits(['update:modelValue', 'created'])

  const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v)
  })

  const formRef = ref()
  const workFormRef = ref()
  const uploadRef = ref()
  const submitting = ref(false)

  // 步骤状态
  const activeStep = ref(0)

  // 作品相关状态
  const works = ref([])
  const filteredWorks = ref([])
  const selectedWork = ref(null)
  const workSearch = ref('')
  const showCreateWork = ref(false)
  const workPagination = reactive({
    page: 1,
    pageSize: 12,
    total: 0
  })
  const searchLoading = ref(false)

  const form = reactive({
    title: '',
    episode: '',
    time_position: null,
    image_files: [], // 存储 File 对象，替代 image_urls
    image_urls: [], // 存储预览 URL（base64 或 blob URL）
    quote_text: '',
    description: '',
    tag_ids: [],
    character_ids: [],
    main_character_id: null,
    is_public: true
  })

  const rules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    image_files: [{ required: true, message: '请至少上传一张图片', trigger: 'change', validator: (rule, value, callback) => {
      if (!value || value.length === 0) {
        callback(new Error('请至少上传一张图片'))
      } else {
        callback()
      }
    } }],
    description: [{ required: true, message: '请输入场景描述', trigger: 'blur' }]
  }

  // 创建作品表单
  const workForm = reactive({
    name: '',
    type: '',
    release_year: null,
    description: ''
  })

  const workRules = {
    name: [{ required: true, message: '请输入作品名', trigger: 'blur' }],
    type: [{ required: true, message: '请选择作品类型', trigger: 'change' }]
  }

  const tagOptions = ref([])
  const tagsLoading = ref(false)
  const tagKeyword = ref('')

  // 计算属性：判断当前步骤是否可以继续
  const canProceed = computed(() => {
    switch (activeStep.value) {
      case 0: return !!selectedWork.value
      case 1: return form.image_files && form.image_files.length > 0
      case 2: return form.title && form.description
      case 3: return true
      default: return false
    }
  })

  // 格式化时间显示
  const formatTime = (timeString) => {
    if (!timeString) return ''
    // 如果已经是时分秒格式，直接返回
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString
    }
    // 兼容旧的秒数格式
    const seconds = Number(timeString)
    if (isNaN(seconds)) return ''
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 获取标签名称
  const getTagName = (tagId) => {
    const tag = tagOptions.value.find(t => t.id === tagId)
    return tag?.name || `标签${tagId}`
  }

  // 搜索作品（回车触发）
  const handleSearch = async () => {
    if (!workSearch.value.trim()) {
      await loadWorks()
      return
    }
    workPagination.page = 1
    await searchWorks()
  }

  // 清除搜索
  const handleClearSearch = async () => {
    workPagination.page = 1
    await loadWorks()
  }

  // 搜索作品
  const searchWorks = async () => {
    if (!workSearch.value.trim()) {
      await loadWorks()
      return
    }

    searchLoading.value = true
    try {
      const resp = await getMediaList({
        search: workSearch.value,
        page: workPagination.page,
        pageSize: workPagination.pageSize
      })
      if (resp.success) {
        filteredWorks.value = resp.data?.list || []
        workPagination.total = resp.data?.pagination?.total || resp.data?.total || 0
      }
    } catch (e) {
      console.error('搜索作品失败:', e)
      ElMessage.error('搜索失败，请稍后重试')
      filteredWorks.value = []
      workPagination.total = 0
    } finally {
      searchLoading.value = false
    }
  }

  // 分页变化
  const handlePageChange = async (page) => {
    workPagination.page = page
    if (workSearch.value.trim()) {
      await searchWorks()
    } else {
      await loadWorks()
    }
  }

  // 每页数量变化
  const handlePageSizeChange = async (size) => {
    workPagination.pageSize = size
    workPagination.page = 1
    if (workSearch.value.trim()) {
      await searchWorks()
    } else {
      await loadWorks()
    }
  }


  // 选择作品（通过 MediaList 组件的 select 事件）
  const handleMediaSelect = (media) => {
    selectedWork.value = media
  }

  // 创建作品
  const createWork = async () => {
    if (!workFormRef.value) return
    await workFormRef.value.validate(async (ok) => {
      if (!ok) return

      try {
        const resp = await createMedia({
          title: workForm.name,
          type: workForm.type,
          release_year: workForm.release_year,
          description: workForm.description
        })

        if (resp.code === 200) {
          ElMessage.success('作品创建成功')
          showCreateWork.value = false

          // 重新加载作品列表
          await loadWorks()

          // 重置表单
          workForm.name = ''
          workForm.type = ''
          workForm.release_year = null
          workForm.description = ''
        } else {
          ElMessage.error(resp.message || '创建作品失败')
        }
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '创建作品失败')
      }
    })
  }

  // 步骤导航
  const handleNext = () => {
    if (activeStep.value < 3) {
      activeStep.value++
    }
  }

  const handlePrev = () => {
    if (activeStep.value > 0) {
      activeStep.value--
    }
  }

  // 移除图片
  const removeImage = (index) => {
    if (typeof index === 'number') {
      // 释放 blob URL
      if (form.image_urls[index]) {
        URL.revokeObjectURL(form.image_urls[index])
      }
      form.image_files.splice(index, 1)
      form.image_urls.splice(index, 1)
    } else {
      // 移除所有图片
      form.image_urls.forEach(url => {
        URL.revokeObjectURL(url)
      })
      form.image_files = []
      form.image_urls = []
    }
  }

  const remoteSearchTags = async (kw) => {
    tagKeyword.value = kw
    tagsLoading.value = true
    try {
      const resp = await getTagsList({ search: kw, page: 1, pageSize: 20 })
      if (resp.code === 200) {
        tagOptions.value = resp.data?.list || resp.data || []
      }
    } finally {
      tagsLoading.value = false
    }
  }

  // 加载作品列表
  const loadWorks = async () => {
    searchLoading.value = true
    try {
      const resp = await getMediaList({
        page: workPagination.page,
        pageSize: workPagination.pageSize
      })
      if (resp.code === 200) {
        filteredWorks.value = resp.data?.list || []
        workPagination.total = resp.data?.pagination?.total || 0
        works.value = filteredWorks.value
      }
    } catch (e) {
      console.error('加载作品列表失败:', e)
      ElMessage.error('加载作品列表失败')
      filteredWorks.value = []
      workPagination.total = 0
    } finally {
      searchLoading.value = false
    }
  }

  // 根据 mediaId 加载作品信息
  const loadMediaById = async (id) => {
    if (!id) return null
    try {
      const resp = await getMediaDetail(id)
      if (resp.code === 200 && resp.data) {
        return resp.data
      }
    } catch (e) {
      console.error('加载作品信息失败:', e)
      ElMessage.error('加载作品信息失败')
    }
    return null
  }

  watch(
    () => visible.value,
    async (v) => {
      if (v) {
        // 如果传入了 mediaId，说明是从动漫详情页进入，跳过步骤一
        if (props.mediaId) {
          // 加载作品信息
          const media = await loadMediaById(props.mediaId)
          if (media) {
            selectedWork.value = media
            // 跳过步骤一，直接进入步骤二（上传媒体）
            activeStep.value = 1
          } else {
            // 如果加载失败，仍然显示步骤一
            activeStep.value = 0
          }
        } else {
          activeStep.value = 0
        }
        
        workSearch.value = ''
        showCreateWork.value = false
        workPagination.page = 1
        workPagination.pageSize = 12
        workPagination.total = 0

        // 加载数据（如果不在详情页，才加载作品列表）
        if (!props.mediaId) {
          await loadWorks()
        }
        
        // 加载标签
        if (tagOptions.value.length === 0) {
          await remoteSearchTags('')
        }
      }

      if (!v) {
        // reset
        activeStep.value = 0
        selectedWork.value = null
        workSearch.value = ''
        // 清理 blob URLs
        form.image_urls.forEach(url => {
          URL.revokeObjectURL(url)
        })
        form.title = ''
        form.episode = ''
        form.time_position = null
        form.image_files = []
        form.image_urls = []
        form.quote_text = ''
        form.description = ''
        form.tag_ids = []
        form.character_ids = []
        form.main_character_id = null
        form.is_public = true
      }
    }
  )

  const handleBeforeUpload = (file) => {
    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/gif']
    const isImage = validTypes.includes(file.type)
    if (!isImage) {
      ElMessage.error('只支持 JPEG、PNG、GIF 格式的图片')
      return false
    }

    // 验证文件大小
    const isJPGOrPNG = file.type === 'image/jpeg' || file.type === 'image/png'
    const isGIF = file.type === 'image/gif'
    const maxSize = isGIF ? 10 * 1024 * 1024 : 5 * 1024 * 1024 // GIF 10MB，其他 5MB
    
    if (file.size > maxSize) {
      ElMessage.error(isGIF ? 'GIF 文件大小不能超过 10MB' : '图片大小不能超过 5MB')
      return false
    }

    return true
  }

  const handleFileChange = async (file, fileList) => {
    // 检查是否已达到上限
    if (form.image_files.length >= 9) {
      ElMessage.warning('最多只能上传 9 张图片')
      return
    }

    // 处理多个文件
    const filesToProcess = fileList.filter(f => f.raw && !f.processed).slice(0, 9 - form.image_files.length)

    for (const fileItem of filesToProcess) {
      if (!fileItem.raw) continue

      // 验证文件类型
      const validTypes = ['image/jpeg', 'image/png', 'image/gif']
      const isImage = validTypes.includes(fileItem.raw.type)
      if (!isImage) {
        ElMessage.error(`${fileItem.name}: 只支持 JPEG、PNG、GIF 格式的图片`)
        continue
      }

      // 验证文件大小
      const isGIF = fileItem.raw.type === 'image/gif'
      const maxSize = isGIF ? 10 * 1024 * 1024 : 5 * 1024 * 1024 // GIF 10MB，其他 5MB

      if (fileItem.raw.size > maxSize) {
        ElMessage.error(`${fileItem.name}: ${isGIF ? 'GIF 文件大小不能超过 10MB' : '图片大小不能超过 5MB'}`)
        continue
      }

      // 创建预览 URL
      const previewUrl = URL.createObjectURL(fileItem.raw)

      // 将文件和预览 URL 存储到表单中
      form.image_files.push(fileItem.raw)
      form.image_urls.push(previewUrl)

      fileItem.processed = true
    }

    if (filesToProcess.length > 0 && form.image_files.length > 0) {
      ElMessage.success(`成功添加 ${filesToProcess.length} 张图片到预览`)
    }
  }

  const handleSubmit = async () => {
    if (!selectedWork.value) {
      ElMessage.error('请选择作品')
      return
    }

    submitting.value = true
    try {
      // 先批量上传图片
      const uploadedUrls = []
      for (const file of form.image_files) {
        try {
          const resp = await uploadSceneMedia(file)
          if (resp.code === 200) {
            uploadedUrls.push(resp.data.url)
          } else {
            throw new Error(resp.message || '上传失败')
          }
        } catch (e) {
          ElMessage.error(`图片上传失败: ${e?.response?.data?.message || e.message}`)
          return
        }
      }

      // 上传成功后创建场景时刻
      const resp = await createSceneMoment({
        media_id: Number(selectedWork.value.id),
        title: form.title,
        episode: form.episode || null,
        time_position: form.time_position || null,
        image_url: uploadedUrls, // 使用上传后的 URL 数组
        quote_text: form.quote_text || null,
        description: form.description || null,
        tag_ids: form.tag_ids,
        character_ids: form.character_ids,
        main_character_id: form.main_character_id,
        is_public: form.is_public
      })
      if (resp.code === 200) {
        ElMessage.success(resp.message || '提交成功，等待审核')
        emit('created', resp.data)
        visible.value = false
      } else {
        ElMessage.error(resp.message || '提交失败')
      }
    } catch (e) {
      ElMessage.error(e?.response?.data?.message || '提交失败')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
.step-container {
  min-height: 500px;
}

.step-content {
  padding: 20px 0;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.step-desc {
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-size: 14px;
}

/* 第一步：作品选择 */
.work-selection {
  text-align: center;
}

.work-search {
  max-width: 500px;
  margin: 0 auto 20px;
}

.search-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: left;
}

.work-list-container {
  width: 100%;
  min-height: 400px;
}

.work-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  gap: 12px;
}

.work-loading .el-icon {
  font-size: 32px;
}

.work-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  text-align: center;
}

.work-empty p {
  margin: 0;
  font-size: 14px;
}

.work-pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  background: var(--bg-secondary);
}

.create-work-section {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
}

.create-work-section p {
  margin-bottom: 12px;
}

/* 第二步：媒体上传 */
.media-upload {
  text-align: center;
}

.upload-area {
  margin-bottom: 30px;
}

.upload-component {
  width: 100%;
}

.upload-placeholder {
  padding: 40px;
  border: 2px dashed var(--card-border);
  border-radius: 8px;
  transition: border-color 0.3s;
}

.upload-component:hover .upload-placeholder {
  border-color: var(--el-color-primary);
}

.upload-icon {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.upload-text p {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.upload-text em {
  color: var(--el-color-primary);
  font-style: normal;
}

.upload-hint {
  font-size: 12px !important;
  color: var(--text-secondary) !important;
}

.preview-section {
  text-align: left;
}

.preview-section h4 {
  margin-bottom: 12px;
  font-size: 16px;
}

.preview-container {
  position: relative;
  display: inline-block;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-actions {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* 图片网格布局 */
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.image-item:hover {
  transform: scale(1.02);
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.grid-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
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

.upload-hint-text {
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}

/* 第三步：标注表单 */
.annotation-form {
  max-width: 600px;
  margin: 0 auto;
}

.hint {
  margin-left: 10px;
  font-size: 12px;
  color: rgba(156, 163, 175, 0.95);
}

/* 第四步：预览确认 */
.preview-confirm {
  max-width: 700px;
  margin: 0 auto;
}

.preview-card {
  display: flex;
  gap: 20px;
  padding: 20px;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background: var(--card-bg);
}

.preview-media {
  flex-shrink: 0;
}

.preview-media {
  min-width: 200px;
}

.preview-image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 200px;
}

.preview-grid-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  cursor: pointer;
}

.preview-placeholder {
  width: 200px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.preview-info {
  flex: 1;
}

.preview-info h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.preview-meta {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.work-name {
  font-weight: 500;
  color: var(--el-color-primary);
}

.preview-quote {
  font-style: italic;
  color: var(--text-primary);
  margin: 12px 0;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
}

.preview-description {
  color: var(--text-primary);
  margin-bottom: 12px;
  line-height: 1.5;
}

.preview-tags {
  margin-bottom: 12px;
}

.preview-tags .el-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.dialog-footer .el-button {
  margin-left: 0 !important;
  margin-right: 10px !important;
}

.dialog-footer .el-button:last-child {
  margin-right: 0 !important;
}
</style>


