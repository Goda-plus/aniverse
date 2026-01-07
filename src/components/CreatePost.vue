<template>
  <div class="create-post">
    <div class="create-post-header">
      <h2 class="create-post-title">
        创建帖子
      </h2>
      <el-button text @click="handleCancel">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="create-post-form">
      <!-- 选择社区 -->
      <div class="form-item">
        <label class="form-label">选择社区</label>
        <el-select
          ref="subredditSelectRef"
          v-model="formData.subreddit"
          placeholder="请选择社区"
          filterable
          class="form-select"
          @change="handleSubredditChange"
          @visible-change="handleSelectVisibleChange"
        >
          <el-option
            v-for="subreddit in subreddits"
            :key="subreddit.id"
            :label="subreddit.name"
            :value="subreddit.id"
          >
            <div class="subreddit-option">
              <el-image
                style="width: 24px; height: 24px; border-radius: 50%"
                :src="subreddit.image_url"
                :fit="contain"
              />
              <span class="subreddit-name">r/{{ subreddit.name }}</span>
            </div>
          </el-option>
          <div v-if="loadingSubreddits">
            <el-icon><Loading />加载中</el-icon>
          </div>
        </el-select>
      </div>

      <!-- 帖子标题 -->
      <div class="form-item">
        <label class="form-label">标题</label>
        <el-input
          v-model="formData.title"
          placeholder="请输入帖子标题"
          maxlength="200"
          show-word-limit
          class="form-input"
        />
      </div>

      <!-- 富文本编辑器 -->
      <div class="form-item">
        <label class="form-label">内容</label>
        <div class="editor-wrapper">
          <Toolbar
            v-if="editorRef"
            :editor="editorRef"
            :default-config="toolbarConfig"
            class="editor-toolbar"
          />
          <Editor
            :key="editorKey"
            v-model="formData.content"
            :default-config="editorConfig"
            style="height: 400px; overflow-y: hidden;"
            @on-created="handleEditorCreated"
            @on-change="handleEditorChange"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <el-button @click="handleCancel">
          取消
        </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          发布
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, reactive, onMounted, onBeforeUnmount, shallowRef, defineEmits, nextTick } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Close } from '@element-plus/icons-vue'
  import '@wangeditor/editor/dist/css/style.css'
  import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
  import { getAllSubreddits, createPost, uploadPostImage, uploadPostVideo,searchSubreddits } from '@/axios/api'

  const router = useRouter()
  const route = useRoute()

  const emit = defineEmits(['success', 'cancel'])

  // 表单数据
  const formData = reactive({
    subreddit: '',
    title: '',
    content: ''
  })
  
  // 存储上传的图片 URL（数组）
  const imageUrl = ref([])
  // 下拉选择相关
  const subredditSelectRef = ref(null)
  const dropdownWrapEl = ref(null)
  const loadingSubreddits = ref(false)

  // 编辑器实例
  const editorRef = shallowRef(null)
  // 标记是否正在清空编辑器，避免触发onChange事件
  const isClearingEditor = ref(false)
  // 编辑器key，用于强制重新创建编辑器
  const editorKey = ref(0)
  // 组件挂载状态
  const isMounted = ref(true)
  // 存储定时器ID，用于清理
  const timers = ref([])
  const page = ref(1)
  const pageSize = ref(20)
  const hasMore = ref(true)

  // 工具栏配置
  const toolbarConfig = reactive({
    // 排除的菜单项，空数组表示显示所有菜单项
    excludeKeys: [
      // 可以根据需要排除某些菜单项
      // 'group-video', // 排除视频
      // 'group-more-style' // 排除更多样式
    ]
  })

  // 编辑器配置
  const editorConfig = reactive({
    placeholder: '请输入帖子内容...',
    readOnly: false,
    autoFocus: false,
    // 添加错误处理
    onError: (error) => {
      console.warn('编辑器错误:', error)
      // 不阻止编辑器继续工作
    },
    MENU_CONF: {
      uploadImage: {
        // 自定义上传函数
        async customUpload (file, insertFn) {
          try {
            // 验证文件大小
            const maxSize = 5 * 1024 * 1024 // 5MB
            if (file.size > maxSize) {
              ElMessage.error('图片大小不能超过 5MB')
              return
            }

            // 验证文件类型
            if (!file.type.startsWith('image/')) {
              ElMessage.error('只能上传图片文件')
              return
            }

            // 上传文件
            const res = await uploadPostImage(file)
            
            // 处理响应 - 根据实际后端返回格式调整
            let imageUrlValue = ''
            // 如果后端返回格式为 { success: true, code: 200, data: { url: 'xxx' } }
            if (res && res.success && res.code === 200 && res.data && res.data.url) {
              imageUrlValue = res.data.url
              // 插入图片到编辑器
              insertFn(res.data.url, res.data.alt || '', res.data.href || '')
            }
            // 如果后端直接返回 { url: 'xxx' }
            else if (res && res.url) {
              imageUrlValue = res.url
              insertFn(res.url, res.alt || '', res.href || '')
            }
            // 如果后端返回 { data: { url: 'xxx' } }
            else if (res && res.data && res.data.url) {
              imageUrlValue = res.data.url
              insertFn(res.data.url, res.data.alt || '', res.data.href || '')
            }
            else {
              console.error('上传响应格式不正确:', res)
              ElMessage.error('上传失败：服务器响应格式错误')
              return
            }

            // 收集上传的图片 URL（存储到数组中）
            if (imageUrlValue) {
              imageUrl.value.push(imageUrlValue)
            }
          } catch (error) {
            console.error('图片上传失败:', error)
            const errorMessage = error.response?.data?.message || error.message || '上传失败，请重试'
            ElMessage.error(errorMessage)
          }
        },
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedFileTypes: ['image/*']
      },
      uploadVideo: {
        // 自定义上传函数
        async customUpload (file, insertFn) {
          try {
            // 验证文件大小（视频通常更大，设置为 100MB）
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
              ElMessage.error('视频大小不能超过 100MB')
              return
            }

            // 验证文件类型
            const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
            if (!allowedTypes.includes(file.type)) {
              ElMessage.error('只支持 MP4、WebM、OGG、MOV、AVI 格式的视频')
              return
            }

            // 上传文件
            const res = await uploadPostVideo(file)
            
            // 处理响应 - 根据实际后端返回格式调整
            let videoUrlValue = ''
            // 如果后端返回格式为 { success: true, code: 200, data: { url: 'xxx' } }
            if (res && res.success && res.code === 200 && res.data && res.data.url) {
              videoUrlValue = res.data.url
              // 插入视频到编辑器
              insertFn(res.data.url, res.data.poster || '', res.data.width || '', res.data.height || '')
            }
            // 如果后端返回格式为 { status: 0, data: { url: 'xxx' } }
            else if (res && res.status === 0 && res.data && res.data.url) {
              videoUrlValue = res.data.url
              // 插入视频到编辑器
              insertFn(res.data.url, res.data.poster || '', res.data.width || '', res.data.height || '')
            } 
            // 如果后端直接返回 { url: 'xxx' }
            else if (res && res.url) {
              videoUrlValue = res.url
              insertFn(res.url, res.poster || '', res.width || '', res.height || '')
            }
            // 如果后端返回 { data: { url: 'xxx' } }
            else if (res && res.data && res.data.url) {
              videoUrlValue = res.data.url
              insertFn(res.data.url, res.data.poster || '', res.data.width || '', res.data.height || '')
            }
            else {
              console.error('上传响应格式不正确:', res)
              ElMessage.error('上传失败：服务器响应格式错误')
              return
            }

            // 收集上传的视频 URL（存储到 imageUrl 数组中）
            if (videoUrlValue) {
              imageUrl.value.push(videoUrlValue)
            }
          } catch (error) {
            console.error('视频上传失败:', error)
            const errorMessage = error.response?.data?.message || error.message || '上传失败，请重试'
            ElMessage.error(errorMessage)
          }
        },
        maxFileSize: 100 * 1024 * 1024, // 100MB
        allowedFileTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo']
      }
    }
  })

  // 社区列表
  const subreddits = ref([])

  // 提交状态
  const submitting = ref(false)

  // 初始化编辑器
  const handleEditorCreated = (editor) => {
    // 确保组件仍然挂载
    if (!isMounted.value) {
      // 如果组件已卸载，立即销毁编辑器
      try {
        editor.destroy()
      } catch (error) {
        console.warn('创建编辑器后立即销毁时出错:', error)
      }
      return
    }
    editorRef.value = editor
  }

  // 编辑器内容变化处理
  const handleEditorChange = () => {
    // 如果正在清空编辑器，不处理变化事件
    if (isClearingEditor.value) {
      return
    }
  }

  // 安全获取编辑器实例
  const getEditorInstance = () => {
    // 如果组件已卸载，不再访问编辑器
    if (!isMounted.value) {
      return null
    }
    if (!editorRef.value) {
      return null
    }
    try {
      if (editorRef.value.isDestroyed) {
        return null
      }
      return editorRef.value
    } catch (error) {
      console.warn('编辑器实例无效:', error)
      return null
    }
  }

  // 安全获取编辑器HTML内容
  const getEditorHtml = () => {
    const editor = getEditorInstance()
    if (!editor) {
      return formData.content || ''
    }
    try {
      return editor.getHtml() || formData.content || ''
    } catch (error) {
      console.warn('获取编辑器HTML失败:', error)
      return formData.content || ''
    }
  }

  // 安全获取编辑器文本内容
  const getEditorText = () => {
    const editor = getEditorInstance()
    if (!editor) {
      return ''
    }
    try {
      return editor.getText() || ''
    } catch (error) {
      console.warn('获取编辑器文本失败:', error)
      return ''
    }
  }

  // 获取社区列表
  const loadSubreddits = async () => {
    if (loadingSubreddits.value || !hasMore.value) {
      return
    }
    loadingSubreddits.value = true
    try {
      const res = await getAllSubreddits({ page: page.value, pageSize: pageSize.value })
      subreddits.value.push(...res.data.list)
      hasMore.value = res.data.hasMore
      if (hasMore.value) {
        page.value++
      }else{
        hasMore.value = false
        page.value = 1
      }
    } catch (error) {
      console.error('获取社区列表失败:', error)
    } finally {
      loadingSubreddits.value = false
    }
  }

  // 下拉滚动加载
  const handleDropdownScroll = (event) => {
    const target = event?.target
    if (!target || loadingSubreddits.value || !hasMore.value) {
      return
    }
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight
    if (distanceToBottom <= 80) {
      loadSubreddits()
    }
  }

  const bindDropdownScroll = () => {
    nextTick(() => {
      const dropdownEl =
        subredditSelectRef.value?.popperRef?.contentRef?.querySelector('.el-select-dropdown__wrap') ||
        document.querySelector('.el-select-dropdown__wrap')
      if (dropdownEl && dropdownEl !== dropdownWrapEl.value) {
        if (dropdownWrapEl.value) {
          dropdownWrapEl.value.removeEventListener('scroll', handleDropdownScroll)
        }
        dropdownWrapEl.value = dropdownEl
        dropdownWrapEl.value.addEventListener('scroll', handleDropdownScroll)
      }
    })
  }

  const unbindDropdownScroll = () => {
    if (dropdownWrapEl.value) {
      dropdownWrapEl.value.removeEventListener('scroll', handleDropdownScroll)
      dropdownWrapEl.value = null
    }
  }

  const handleSelectVisibleChange = (visible) => {
    if (visible) {
      bindDropdownScroll()
    } else {
      unbindDropdownScroll()
    }
  }

  // 社区选择变化
  const handleSubredditChange = (value) => {
    formData.subreddit = value
  }

  // 格式化成员数
  const formatMemberCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k'
    }
    return count.toString()
  }

  // 提交表单
  const handleSubmit = async () => {
    // 验证表单
    // if (!formData.subreddit) {
    //   ElMessage.warning('请选择社区')
    //   return
    // }

    if (!formData.title || formData.title.trim() === '') {
      ElMessage.warning('请输入帖子标题')
      return
    }

    // 检查编辑器内容（去除 HTML 标签后检查是否为空）
    const editorContent = getEditorHtml()
    const textContent = editorContent.replace(/<[^>]*>/g, '').trim()
    if (!textContent) {
      ElMessage.warning('请输入帖子内容')
      return
    }

    submitting.value = true

    try {
      // 获取编辑器内容
      const finalEditorContent = getEditorHtml()
      const finalTextContent = getEditorText()
      
      // 创建帖子
      const postData = {
        subreddit_id: formData.subreddit,
        title: formData.title,
        content_html: finalEditorContent,
        content_text: finalTextContent,
        image_url: imageUrl.value.length > 0 ? JSON.stringify(imageUrl.value) : null,
      }

      const res = await createPost(postData)
      ElMessage.success('帖子发布成功')
      
      // 发布成功后，先重置表单（在emit之前，避免组件卸载后访问）
      formData.subreddit = ''
      formData.title = ''
      formData.content = ''
      imageUrl.value = [] // 重置图片 URL 数组
      
      // 发出成功事件，父组件会处理导航
      // 注意：发出事件后，组件可能会立即卸载，所以不再执行清空编辑器的操作
      emit('success', res.data)
      
      // 导航逻辑由父组件 CreatePostView 的 handleSuccess 处理
      // 这里不再执行 router.back()，避免与父组件的导航冲突
      // 也不再清空编辑器，因为组件即将卸载，清空操作会导致访问已销毁的编辑器实例
    } catch (error) {
      console.error('发布帖子失败:', error)
      ElMessage.error('发布失败，请重试')
    } finally {
      submitting.value = false
    }
  }

  // 取消
  const handleCancel = () => {
    if (formData.title || formData.content) {
      ElMessageBox.confirm('确定要取消吗？未保存的内容将丢失', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        emit('cancel')
        // 导航逻辑由父组件 CreatePostView 的 handleCancel 处理
      }).catch(() => {
      // 用户取消
      })
    } else {
      emit('cancel')
      // 导航逻辑由父组件 CreatePostView 的 handleCancel 处理
    }
  }

  // 组件挂载
  onMounted(() => {
    isMounted.value = true
    loadSubreddits()
  
    // 如果路由中有社区参数，自动填充
    if (route.params.community) {
      formData.subreddit = route.params.community
    }
  })

  // 组件卸载前清理资源
  onBeforeUnmount(() => {
    isMounted.value = false
    unbindDropdownScroll()
    
    // 清理所有定时器
    timers.value.forEach(timerId => {
      if (timerId) {
        clearTimeout(timerId)
      }
    })
    timers.value = []
    
    // 销毁编辑器实例
    const editor = editorRef.value
    if (editor != null) {
      try {
        // 先检查编辑器是否已经被销毁
        if (editor.isDestroyed) {
          editorRef.value = null
          return
        }
        // 销毁编辑器
        editor.destroy()
      } catch (error) {
        // 忽略销毁时的错误
        console.warn('销毁编辑器时出错:', error)
      } finally {
        // 确保清空引用
        editorRef.value = null
      }
    }
  })
</script>

<style scoped>
.create-post {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 24px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.create-post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--card-border);
}

.create-post-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.create-post-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.form-select,
.form-input {
  width: 100%;
}

.subreddit-option {
  display: flex;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.subreddit-name {
  font-weight: 600;
  color: var(--text-primary);
}

.subreddit-members {
  font-size: 12px;
  color: var(--text-secondary);
}

.editor-wrapper {
  border: 1px solid var(--card-border);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.3s ease;
  display: flex;
  flex-direction: column;
}

.editor-wrapper:hover {
  border-color: var(--text-secondary);
}

.editor-toolbar {
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
}

/* 编辑器样式调整 */
:deep(.w-e-text-container) {
  background: var(--card-bg) !important;
  /* 不设置默认颜色，让内联样式自然生效 */
  min-height: 300px;
}

/* 只对没有内联样式的文本元素设置默认颜色 */
:deep(.w-e-text-container) {
  color: var(--text-primary);
}

/* 确保有内联样式的元素不受影响 - 内联样式优先级最高 */

:deep(.w-e-text-placeholder) {
  color: var(--text-secondary) !important;
}

:deep(.w-e-toolbar) {
  background: var(--bg-secondary) !important;
  border-bottom: 1px solid var(--card-border) !important;
  padding: 8px;
}

:deep(.w-e-toolbar .w-e-bar) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

:deep(.w-e-bar-item) {
  color: var(--text-primary) !important;
}

:deep(.w-e-bar-item button) {
  color: var(--text-primary) !important;
}

:deep(.w-e-bar-item button:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

:deep(.w-e-bar-item.is-active button) {
  background: var(--bg-hover) !important;
  color: #ff4500 !important;
}

/* 底部工具栏（代码块相关弹出层） */
:deep(.w-e-bar-bottom),
:deep(.w-e-hover-bar),
:deep(.w-e-bar.w-e-bar-bottom),
:deep(.w-e-bar.w-e-hover-bar.w-e-bar-bottom),
:deep(.w-e-bar.w-e-bar-show.w-e-bar-bottom) {
  background: var(--bg-secondary) !important;
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-bar-bottom button),
:deep(.w-e-hover-bar button),
:deep(.w-e-bar.w-e-bar-bottom button),
:deep(.w-e-bar.w-e-bar-bottom .w-e-bar-item) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-bar-bottom button:hover),
:deep(.w-e-hover-bar button:hover),
:deep(.w-e-bar.w-e-bar-bottom button:hover),
:deep(.w-e-bar.w-e-bar-bottom .w-e-bar-item:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

/* 覆盖编辑器默认的工具栏变量 */
:deep(.w-e-bar) {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}

/* 段落样式 - 只对没有内联样式的段落应用默认颜色 */
:deep(.w-e-text-container p:not([style*="color"])) {
  color: var(--text-primary) !important;
  margin: 0;
  line-height: 1.6;
}

/* 保留内联样式（颜色、加粗等） */
:deep(.w-e-text-container p[style*="color"]) {
  margin: 0;
  line-height: 1.6;
}

/* 确保加粗、斜体等样式生效 */
:deep(.w-e-text-container strong),
:deep(.w-e-text-container b) {
  font-weight: bold !important;
}

:deep(.w-e-text-container em),
:deep(.w-e-text-container i) {
  font-style: italic !important;
}

:deep(.w-e-text-container u) {
  text-decoration: underline !important;
}

/* 确保编辑器内容区域内的所有内联样式（颜色、背景色等）不被覆盖 - 内联样式优先级最高 */

/* 图片样式 - 确保正确显示 */
:deep(.w-e-text-container img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 12px 0;
  border-radius: 4px;
}

/* 视频样式 - 确保正确显示 */
:deep(.w-e-text-container video) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 12px 0;
  border-radius: 4px;
}

/* iframe 视频（如 YouTube） */
:deep(.w-e-text-container iframe) {
  max-width: 100%;
  display: block;
  margin: 12px 0;
  border-radius: 4px;
}

/* 代码块样式 - 深色主题 */
:deep(.w-e-text-container pre),
:deep(.w-e-text-container [data-slate-editor] pre),
:deep(.w-e-text-container [data-slate-editor] pre > code) {
  background: var(--bg-tertiary) !important;
  border: none !important;
  border-radius: 4px !important;
  padding: 12px 16px !important;
  margin: 12px 0 !important;
  overflow-x: auto !important;
  color: var(--text-primary) !important;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}

:deep(.w-e-text-container code) {
  background: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  font-size: 0.9em !important;
}

:deep(.w-e-text-container pre code) {
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;
  color: inherit !important;
  font-size: inherit !important;
}

/* 代码块内的语法高亮（如果有） */
:deep(.w-e-text-container pre .keyword) {
  color: #c792ea !important;
}

:deep(.w-e-text-container pre .string) {
  color: #c3e88d !important;
}

:deep(.w-e-text-container pre .comment) {
  color: var(--text-secondary) !important;
  font-style: italic !important;
}

:deep(.w-e-text-container pre .number) {
  color: #f78c6c !important;
}

:deep(.w-e-text-container pre .function) {
  color: #82aaff !important;
}

:deep(.w-e-text-container pre .variable) {
  color: #ffcb6b !important;
}

/* 工具栏下拉菜单样式 */
:deep(.w-e-dropdown-menu) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-dropdown-menu-item) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-dropdown-menu-item:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

:deep(.w-e-dropdown-menu-item.is-active) {
  background: var(--bg-hover) !important;
  color: #ff4500 !important;
}

:deep(.w-e-dropdown-panel) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-dropdown-panel-item) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-dropdown-panel-item:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

:deep(.w-e-dropdown-panel-item.is-active) {
  background: var(--bg-hover) !important;
  color: #ff4500 !important;
}

/* 颜色选择器下拉菜单 */
:deep(.w-e-color-picker-container) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-color-picker-item) {
  border: 1px solid var(--card-border) !important;
}

:deep(.w-e-color-picker-item:hover) {
  border-color: var(--text-primary) !important;
}

/* 颜色选择器面板内容 - 文字颜色和背景色选择器 */
:deep(.w-e-panel-content-color),
:deep(.w-e-panel-content-bgColor) {
  background: var(--card-bg) !important;
}

/* 颜色选择器中的色块（li元素） */
:deep(.w-e-panel-content-color li),
:deep(.w-e-panel-content-bgColor li) {
  border: 1px solid var(--card-border) !important;
}

:deep(.w-e-panel-content-color li:hover),
:deep(.w-e-panel-content-bgColor li:hover) {
  border-color: var(--text-primary) !important;
}

/* 颜色选择器标题和清除按钮 */
:deep(.w-e-color-picker-title) {
  color: var(--text-primary) !important;
  background: var(--card-bg) !important;
}

:deep(.w-e-color-picker-clear) {
  color: var(--text-primary) !important;
}

:deep(.w-e-color-picker-clear:hover) {
  background: var(--bg-hover) !important;
}

/* 颜色选择器网格容器 */
:deep(.w-e-color-picker-grid) {
  background: var(--card-bg) !important;
}

/* 字体大小、字体类型等下拉菜单 */
:deep(.w-e-select-list) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-select-list-item) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-select-list-item:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

:deep(.w-e-select-list-item.is-selected) {
  background: var(--bg-hover) !important;
  color: #ff4500 !important;
}

/* 表情选择器 */
:deep(.w-e-emoji-picker) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-emoji-picker-container) {
  background: var(--card-bg) !important;
}

:deep(.w-e-emoji-picker-tab) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-emoji-picker-tab:hover) {
  background: var(--bg-hover) !important;
}

:deep(.w-e-emoji-picker-tab.is-active) {
  background: var(--bg-hover) !important;
  color: #ff4500 !important;
}

/* 表格选择器 */
:deep(.w-e-table-picker) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-table-picker-container) {
  background: var(--card-bg) !important;
}

:deep(.w-e-table-picker-grid) {
  background: var(--card-bg) !important;
}

:deep(.w-e-table-picker-cell) {
  border-color: var(--card-border) !important;
  background: var(--bg-secondary) !important;
}

:deep(.w-e-table-picker-cell:hover) {
  background: var(--bg-hover) !important;
  border-color: var(--text-primary) !important;
}

:deep(.w-e-table-picker-size) {
  color: var(--text-primary) !important;
  background: var(--card-bg) !important;
}

/* 链接插入模态框 */
:deep(.w-e-link-modal) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-link-modal-header) {
  background: var(--card-bg) !important;
  border-bottom: 1px solid var(--card-border) !important;
  color: var(--text-primary) !important;
}

:deep(.w-e-link-modal-title) {
  color: var(--text-primary) !important;
}

:deep(.w-e-link-modal-close) {
  color: var(--text-primary) !important;
}

:deep(.w-e-link-modal-close:hover) {
  background: var(--bg-hover) !important;
}

:deep(.w-e-link-modal-body) {
  background: var(--card-bg) !important;
}

:deep(.w-e-link-modal-label) {
  color: var(--text-primary) !important;
}

:deep(.w-e-link-modal-input) {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--card-border) !important;
  color: var(--text-primary) !important;
}

:deep(.w-e-link-modal-input:focus) {
  border-color: #ff4500 !important;
}

:deep(.w-e-link-modal-footer) {
  background: var(--card-bg) !important;
  border-top: 1px solid var(--card-border) !important;
}

:deep(.w-e-link-modal-button) {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--card-border) !important;
  color: var(--text-primary) !important;
}

:deep(.w-e-link-modal-button:hover) {
  background: var(--bg-hover) !important;
}

:deep(.w-e-link-modal-button-primary) {
  background: #ff4500 !important;
  color: #ffffff !important;
  border-color: #ff4500 !important;
}

:deep(.w-e-link-modal-button-primary:hover) {
  background: #ff5722 !important;
}

/* 图片上传下拉菜单 */
:deep(.w-e-image-upload-panel) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-image-upload-item) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-image-upload-item:hover) {
  background: var(--bg-hover) !important;
}

/* 视频插入下拉菜单 */
:deep(.w-e-video-insert-panel) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-video-insert-item) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-video-insert-item:hover) {
  background: var(--bg-hover) !important;
}

/* 通用弹出层样式 - 覆盖所有可能的弹出层 */
:deep([class*="w-e-popup"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep([class*="w-e-popup"] [class*="item"]) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep([class*="w-e-popup"] [class*="item"]:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

/* 对齐方式下拉菜单 */
:deep(.w-e-bar-divider) {
  border-color: var(--card-border) !important;
}

/* 所有工具栏相关的弹出层 */
:deep(.w-e-toolbar [class*="popup"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

:deep(.w-e-toolbar [class*="popup"] [class*="item"]) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(.w-e-toolbar [class*="popup"] [class*="item"]:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

/* 通用样式 - 覆盖所有w-e开头的弹出层和模态框 */
:deep(div[class^="w-e-"][class*="popup"]),
:deep(div[class^="w-e-"][class*="modal"]),
:deep(div[class^="w-e-"][class*="panel"]),
:deep(div[class^="w-e-"][class*="picker"]),
:deep(div[class^="w-e-"][class*="dropdown"]),
:deep(div[class^="w-e-"][class*="menu"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  color: var(--text-primary) !important;
}

/* 覆盖所有弹出层内的文本和输入框 - 排除编辑器内容区域 */
:deep(div[class^="w-e-"] input),
:deep(div[class^="w-e-"] textarea),
:deep(div[class^="w-e-"] label) {
  color: var(--text-primary) !important;
}

/* 弹出层内的 span 和 div（排除编辑器内容区域和emoji） */
:deep(div[class^="w-e-"][class*="popup"] span:not([class*="emoji"]):not([style*="color"])),
:deep(div[class^="w-e-"][class*="modal"] span:not([class*="emoji"]):not([style*="color"])),
:deep(div[class^="w-e-"][class*="panel"] span:not([class*="emoji"]):not([style*="color"])),
:deep(div[class^="w-e-"][class*="popup"] div:not([class*="color"]):not([class*="emoji"]):not([style*="color"])),
:deep(div[class^="w-e-"][class*="modal"] div:not([class*="color"]):not([class*="emoji"]):not([style*="color"])),
:deep(div[class^="w-e-"][class*="panel"] div:not([class*="color"]):not([class*="emoji"]):not([style*="color"])) {
  color: var(--text-primary) !important;
}

/* 覆盖所有弹出层内的输入框背景 */
:deep(div[class^="w-e-"] input[type="text"]),
:deep(div[class^="w-e-"] input[type="url"]),
:deep(div[class^="w-e-"] textarea) {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--card-border) !important;
  color: var(--text-primary) !important;
}

:deep(div[class^="w-e-"] input:focus),
:deep(div[class^="w-e-"] textarea:focus) {
  border-color: #ff4500 !important;
  outline: none !important;
}

/* 覆盖所有弹出层内的按钮 */
:deep(div[class^="w-e-"] button) {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--card-border) !important;
  color: var(--text-primary) !important;
}

:deep(div[class^="w-e-"] button:hover) {
  background: var(--bg-hover) !important;
}

:deep(div[class^="w-e-"] button[class*="primary"]) {
  background: #ff4500 !important;
  color: #ffffff !important;
  border-color: #ff4500 !important;
}

:deep(div[class^="w-e-"] button[class*="primary"]:hover) {
  background: #ff5722 !important;
}

/* 覆盖所有弹出层内的列表项 */
:deep(div[class^="w-e-"] [class*="item"]),
:deep(div[class^="w-e-"] [class*="option"]),
:deep(div[class^="w-e-"] [class*="list-item"]) {
  color: var(--text-primary) !important;
  background: transparent !important;
}

:deep(div[class^="w-e-"] [class*="item"]:hover),
:deep(div[class^="w-e-"] [class*="option"]:hover),
:deep(div[class^="w-e-"] [class*="list-item"]:hover) {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

/* 覆盖所有弹出层内的选中项 */
:deep(div[class^="w-e-"] [class*="item"][class*="active"]),
:deep(div[class^="w-e-"] [class*="item"][class*="selected"]),
:deep(div[class^="w-e-"] [class*="option"][class*="active"]),
:deep(div[class^="w-e-"] [class*="option"][class*="selected"]) {
  background: var(--bg-hover) !important;
  color: #ff4500 !important;
}

/* 使用更通用的选择器覆盖所有可能的弹出层 - 包括body下的弹出层 */
:deep(body > div[class*="w-e-"]),
:deep(body > div[class*="w-e-"] > div) {
  background: var(--card-bg) !important;
  border-color: var(--card-border) !important;
  color: var(--text-primary) !important;
}

/* 确保所有弹出层都有正确的背景色 */
:deep(.editor-wrapper ~ div[class*="w-e-"]),
:deep(.editor-wrapper div[class*="w-e-"][style*="position"]),
:deep(div[class*="w-e-"][style*="position: absolute"],
div[class*="w-e-"][style*="position: fixed"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  color: var(--text-primary) !important;
}

/* 覆盖所有可能的表格选择器变体 */
:deep([class*="table"][class*="picker"]),
:deep([class*="table"][class*="select"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
}

:deep([class*="table"][class*="picker"] [class*="cell"],
[class*="table"][class*="select"] [class*="cell"]) {
  border-color: var(--card-border) !important;
  background: var(--bg-secondary) !important;
}

:deep([class*="table"][class*="picker"] [class*="cell"]:hover,
[class*="table"][class*="select"] [class*="cell"]:hover) {
  background: var(--bg-hover) !important;
  border-color: var(--text-primary) !important;
}

/* 覆盖所有可能的颜色选择器变体 */
:deep([class*="color"][class*="picker"]),
:deep([class*="color"][class*="panel"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
}

:deep([class*="color"][class*="picker"] [class*="grid"],
[class*="color"][class*="panel"] [class*="grid"]) {
  background: var(--card-bg) !important;
}

/* 颜色选择器中的所有色块边框 */
:deep([class*="color"][class*="picker"] li),
:deep([class*="color"][class*="panel"] li),
:deep([class*="panel-content-color"] li),
:deep([class*="panel-content-bgColor"] li) {
  border: 1px solid var(--card-border) !important;
}

:deep([class*="color"][class*="picker"] li:hover),
:deep([class*="color"][class*="panel"] li:hover),
:deep([class*="panel-content-color"] li:hover),
:deep([class*="panel-content-bgColor"] li:hover) {
  border-color: var(--text-primary) !important;
}

/* 覆盖所有可能的链接模态框变体 */
:deep([class*="link"][class*="modal"]),
:deep([class*="link"][class*="dialog"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
}

/* 覆盖所有可能的图片上传面板变体 */
:deep([class*="image"][class*="upload"]),
:deep([class*="image"][class*="panel"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
}

/* 覆盖所有可能的视频插入面板变体 */
:deep([class*="video"][class*="insert"]),
:deep([class*="video"][class*="panel"]) {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .create-post {
    padding: 16px;
  }

  .create-post-title {
    font-size: 20px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .el-button {
    width: 100%;
  }
}
</style>

<!-- 全局样式 - 用于覆盖body下的弹出层 -->
<style>
/* 覆盖所有w-e开头的弹出层 - 这些可能被添加到body下 */
body > div[class*="w-e-"],
body > div[class*="w-e-"] > div {
  background: var(--card-bg) !important;
  border-color: var(--card-border) !important;
  color: var(--text-primary) !important;
}

/* 所有弹出层容器 */
div[class*="w-e-"][class*="popup"],
div[class*="w-e-"][class*="modal"],
div[class*="w-e-"][class*="panel"],
div[class*="w-e-"][class*="picker"],
div[class*="w-e-"][class*="dropdown"],
div[class*="w-e-"][class*="menu"],
div[class*="w-e-"][class*="select"] {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  color: var(--text-primary) !important;
}

/* 弹出层内的所有文本元素 - 但不覆盖编辑器内容区域的内联样式 */
div[class*="w-e-"] input,
div[class*="w-e-"] textarea,
div[class*="w-e-"] label {
  color: var(--text-primary) !important;
}

/* 弹出层内的 span 和 div（排除编辑器内容区域和emoji） */
div[class*="w-e-"][class*="popup"] span:not([class*="emoji"]):not([style*="color"]),
div[class*="w-e-"][class*="modal"] span:not([class*="emoji"]):not([style*="color"]),
div[class*="w-e-"][class*="panel"] span:not([class*="emoji"]):not([style*="color"]),
div[class*="w-e-"][class*="popup"] div:not([class*="color"]):not([class*="emoji"]):not([style*="color"]),
div[class*="w-e-"][class*="modal"] div:not([class*="color"]):not([class*="emoji"]):not([style*="color"]),
div[class*="w-e-"][class*="panel"] div:not([class*="color"]):not([class*="emoji"]):not([style*="color"]) {
  color: var(--text-primary) !important;
}

/* 弹出层内的输入框 */
div[class*="w-e-"] input[type="text"],
div[class*="w-e-"] input[type="url"],
div[class*="w-e-"] textarea {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--card-border) !important;
  color: var(--text-primary) !important;
}

div[class*="w-e-"] input:focus,
div[class*="w-e-"] textarea:focus {
  border-color: #ff4500 !important;
  outline: none !important;
}

/* 弹出层内的按钮 */
div[class*="w-e-"] button {
  background: var(--bg-secondary) !important;
  border: 1px solid var(--card-border) !important;
  color: var(--text-primary) !important;
}

div[class*="w-e-"] button:hover {
  background: var(--bg-hover) !important;
}

div[class*="w-e-"] button[class*="primary"],
div[class*="w-e-"] button[type="submit"] {
  background: #ff4500 !important;
  color: #ffffff !important;
  border-color: #ff4500 !important;
}

div[class*="w-e-"] button[class*="primary"]:hover,
div[class*="w-e-"] button[type="submit"]:hover {
  background: #ff5722 !important;
}

/* 弹出层内的列表项 */
div[class*="w-e-"] [class*="item"],
div[class*="w-e-"] [class*="option"],
div[class*="w-e-"] [class*="list-item"] {
  color: var(--text-primary) !important;
  background: transparent !important;
}

div[class*="w-e-"] [class*="item"]:hover,
div[class*="w-e-"] [class*="option"]:hover,
div[class*="w-e-"] [class*="list-item"]:hover {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

/* 选中项 */
div[class*="w-e-"] [class*="item"][class*="active"],
div[class*="w-e-"] [class*="item"][class*="selected"],
div[class*="w-e-"] [class*="option"][class*="active"],
div[class*="w-e-"] [class*="option"][class*="selected"] {
  background: var(--bg-hover) !important;
  color: #ff4500 !important;
}

/* 颜色选择器面板 - 文字颜色和背景色 */
ul.w-e-panel-content-color,
ul.w-e-panel-content-bgColor {
  background: var(--card-bg) !important;
}

/* 颜色选择器中的色块边框 - 使用主题色 */
ul.w-e-panel-content-color li,
ul.w-e-panel-content-bgColor li {
  border: 1px solid var(--card-border) !important;
}

ul.w-e-panel-content-color li:hover,
ul.w-e-panel-content-bgColor li:hover {
  border-color: var(--text-primary) !important;
}

/* 通用颜色选择器色块样式 */
[class*="w-e-panel-content-color"] li,
[class*="w-e-panel-content-bgColor"] li,
[class*="w-e-panel-content"][class*="color"] li {
  border: 1px solid var(--card-border) !important;
}

[class*="w-e-panel-content-color"] li:hover,
[class*="w-e-panel-content-bgColor"] li:hover,
[class*="w-e-panel-content"][class*="color"] li:hover {
  border-color: var(--text-primary) !important;
}

/* 编辑器内容区域的图片和视频样式（全局） */
.w-e-text-container img,
.w-e-text-container [data-slate-editor] img {
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
  margin: 12px 0 !important;
  border-radius: 4px !important;
}

.w-e-text-container video,
.w-e-text-container [data-slate-editor] video {
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
  margin: 12px 0 !important;
  border-radius: 4px !important;
}

.w-e-text-container iframe,
.w-e-text-container [data-slate-editor] iframe {
  max-width: 100% !important;
  display: block !important;
  margin: 12px 0 !important;
  border-radius: 4px !important;
}

/* 确保编辑器内容区域内的内联样式（颜色、加粗等）不被覆盖 - 内联样式优先级最高 */

.w-e-text-container strong,
.w-e-text-container b,
.w-e-text-container [data-slate-editor] strong,
.w-e-text-container [data-slate-editor] b {
  font-weight: bold !important;
}

.w-e-text-container em,
.w-e-text-container i,
.w-e-text-container [data-slate-editor] em,
.w-e-text-container [data-slate-editor] i {
  font-style: italic !important;
}

.w-e-text-container u,
.w-e-text-container [data-slate-editor] u {
  text-decoration: underline !important;
}

/* 代码块样式 - 深色主题（全局） */
div[class*="w-e-"] pre,
.w-e-text-container pre,
.w-e-text-container [data-slate-editor] pre,
.w-e-text-container [data-slate-editor] pre > code {
  background: var(--bg-tertiary) !important;
  border: none !important;
  border-radius: 4px !important;
  padding: 12px 16px !important;
  margin: 12px 0 !important;
  overflow-x: auto !important;
  color: var(--text-primary) !important;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
}

div[class*="w-e-"] code,
.w-e-text-container code {
  background: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  padding: 2px 6px !important;
  border-radius: 3px !important;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
  font-size: 0.9em !important;
}

div[class*="w-e-"] pre code,
.w-e-text-container pre code {
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;
  color: inherit !important;
  font-size: inherit !important;
}

/* 底部工具栏（代码块相关弹出层）- 全局样式 */
div[class*="w-e-bar-bottom"],
div[class*="w-e-hover-bar"],
div[class*="w-e-bar"][class*="bar-bottom"],
div.w-e-bar.w-e-bar-bottom,
div.w-e-bar.w-e-hover-bar.w-e-bar-bottom,
div.w-e-bar.w-e-bar-show.w-e-bar-bottom {
  background: var(--bg-secondary) !important;
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

div[class*="w-e-bar-bottom"] button,
div[class*="w-e-hover-bar"] button,
div[class*="w-e-bar"][class*="bar-bottom"] button,
div.w-e-bar.w-e-bar-bottom button,
div.w-e-bar.w-e-bar-bottom .w-e-bar-item {
  color: var(--text-primary) !important;
  background: transparent !important;
}

div[class*="w-e-bar-bottom"] button:hover,
div[class*="w-e-hover-bar"] button:hover,
div[class*="w-e-bar"][class*="bar-bottom"] button:hover,
div.w-e-bar.w-e-bar-bottom button:hover,
div.w-e-bar.w-e-bar-bottom .w-e-bar-item:hover {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

/* 覆盖编辑器默认的工具栏变量 - 全局 */
div[class*="w-e-bar"] {
  background-color: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
}

/* 代码块相关的下拉菜单和弹出层 */
div[class*="w-e-"][class*="code"] [class*="popup"],
div[class*="w-e-"][class*="code"] [class*="menu"],
div[class*="w-e-"][class*="code"] [class*="panel"],
div[class*="w-e-"][class*="code"] [class*="dropdown"] {
  background: var(--card-bg) !important;
  border: 1px solid var(--card-border) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  color: var(--text-primary) !important;
}
</style>

