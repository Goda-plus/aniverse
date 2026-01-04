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
          v-model="formData.subreddit"
          placeholder="请选择社区"
          filterable
          class="form-select"
          @change="handleSubredditChange"
        >
          <el-option
            v-for="subreddit in subreddits"
            :key="subreddit.id"
            :label="subreddit.name"
            :value="subreddit.name"
          >
            <div class="subreddit-option">
              <span class="subreddit-name">r/{{ subreddit.name }}</span>
              <span class="subreddit-members">{{ formatMemberCount(subreddit.members) }} 位成员</span>
            </div>
          </el-option>
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
            :editor="editorRef"
            :default-config="toolbarConfig"
            class="editor-toolbar"
          />
          <Editor
            v-model="formData.content"
            :default-config="editorConfig"
            style="height: 400px; overflow-y: hidden;"
            @on-created="handleEditorCreated"
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
  import { ref, reactive, onMounted, onBeforeUnmount, shallowRef, defineEmits } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Close } from '@element-plus/icons-vue'
  import '@wangeditor/editor/dist/css/style.css'
  import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
  import { getAllSubreddits, createPost, uploadPostImage } from '@/axios/api'

  const router = useRouter()
  const route = useRoute()

  const emit = defineEmits(['success', 'cancel'])

  // 表单数据
  const formData = reactive({
    subreddit: '',
    title: '',
    content: ''
  })

  // 编辑器实例
  const editorRef = shallowRef(null)

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
    MENU_CONF: {
      uploadImage: {
        server: '/api/post/upload-image',
        fieldName: 'image',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedFileTypes: ['image/*'],
        meta: {
          token: localStorage.getItem('token') || sessionStorage.getItem('token')
        },
        metaWithUrl: false,
        headers: {
          Authorization: localStorage.getItem('token') || sessionStorage.getItem('token') || ''
        },
        // 自定义上传
        async customUpload (file, insertFn) {
          try {
            const res = await uploadPostImage(file)
            if (res.status === 0 && res.data) {
              // 插入图片
              insertFn(res.data.url, res.data.alt || '', res.data.href || '')
            } else {
              ElMessage.error(res.message || '图片上传失败')
            }
          } catch (error) {
            console.error('上传图片失败:', error)
            ElMessage.error('图片上传失败，请重试')
          }
        }
      }
    }
  })

  // 社区列表
  const subreddits = ref([])

  // 提交状态
  const submitting = ref(false)

  // 初始化编辑器
  const handleEditorCreated = (editor) => {
    editorRef.value = editor
  }

  // 获取社区列表
  const loadSubreddits = async () => {
    try {
      const res = await getAllSubreddits()
      if (res.status === 0) {
        subreddits.value = res.data || []
      }
    } catch (error) {
      console.error('获取社区列表失败:', error)
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
    if (!formData.subreddit) {
      ElMessage.warning('请选择社区')
      return
    }

    if (!formData.title || formData.title.trim() === '') {
      ElMessage.warning('请输入帖子标题')
      return
    }

    // 检查编辑器内容（去除 HTML 标签后检查是否为空）
    const editorContent = editorRef.value ? editorRef.value.getHtml() : formData.content
    const textContent = editorContent.replace(/<[^>]*>/g, '').trim()
    if (!textContent) {
      ElMessage.warning('请输入帖子内容')
      return
    }

    submitting.value = true

    try {
      // 获取编辑器内容
      const editorContent = editorRef.value ? editorRef.value.getHtml() : formData.content
      
      // 创建帖子
      const postData = {
        subreddit: formData.subreddit,
        title: formData.title.trim(),
        content: editorContent
      }

      const res = await createPost(postData)

      if (res.status === 0) {
        ElMessage.success('帖子发布成功')
        emit('success', res.data)
      
        // 重置表单
        formData.subreddit = ''
        formData.title = ''
        formData.content = ''
      
        // 清空编辑器
        if (editorRef.value) {
          editorRef.value.clear()
        }

        // 如果是从路由进入的，返回上一页
        if (route.name === 'create-post') {
          router.back()
        }
      } else {
        ElMessage.error(res.message || '帖子发布失败')
      }
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
        if (route.name === 'create-post') {
          router.back()
        }
      }).catch(() => {
      // 用户取消
      })
    } else {
      emit('cancel')
      if (route.name === 'create-post') {
        router.back()
      }
    }
  }

  // 组件挂载
  onMounted(() => {
    loadSubreddits()
  
    // 如果路由中有社区参数，自动填充
    if (route.params.community) {
      formData.subreddit = route.params.community
    }
  })

  // 组件卸载前销毁编辑器
  onBeforeUnmount(() => {
    if (editorRef.value) {
      editorRef.value.destroy()
      editorRef.value = null
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
  justify-content: space-between;
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
  color: var(--text-primary) !important;
  min-height: 300px;
}

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

:deep(.w-e-text-container p) {
  color: var(--text-primary) !important;
  margin: 0;
  line-height: 1.6;
}

:deep(.w-e-text-container img) {
  max-width: 100%;
  height: auto;
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

