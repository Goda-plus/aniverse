<template>
  <div class="draft-sidebar">
    <div class="draft-sidebar-header">
      <h3 class="draft-sidebar-title">
        我的草稿
      </h3>
      <el-button
        text
        :loading="loadingDrafts"
        @click="loadDrafts"
      >
        <el-icon>
          <Refresh />
        </el-icon>
      </el-button>
    </div>
    <div class="draft-list">
      <div v-if="loadingDrafts" class="draft-loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="drafts.length === 0" class="draft-empty">
        <p>暂无草稿</p>
      </div>
      <template v-else>
        <div
          v-for="draft in drafts"
          :key="draft.id"
          class="draft-item"
          @click="handleLoadDraft(draft)"
        >
          <div class="draft-item-header">
            <h4 class="draft-title">
              {{ draft.title || '无标题' }}
            </h4>
            <el-button
              class="draft-delete-btn"
              text
              size="small"
              @click.stop="handleDeleteDraft(draft.id)"
            >
              <el-icon>
                <Delete />
              </el-icon>
            </el-button>
          </div>
          <div class="draft-preview">
            {{ getDraftPreview(draft.content_text || draft.content_html) }}
          </div>
          <div class="draft-meta">
            <span class="draft-time">{{ formatTime(draft.created_at) }}</span>
            <span v-if="draft.subreddit_name" class="draft-community">
              r/{{ draft.subreddit_name }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, defineEmits, defineExpose } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Refresh, Loading, Delete } from '@element-plus/icons-vue'
  import { getDrafts, deletePost } from '@/axios/post'

  const emit = defineEmits(['load-draft'])

  // 草稿相关
  const drafts = ref([])
  const loadingDrafts = ref(false)
  const draftPage = ref(1)
  const draftPageSize = ref(20)
  const draftHasMore = ref(true)

  // 获取草稿列表
  const loadDrafts = async () => {
    if (loadingDrafts.value) {
      return
    }
    loadingDrafts.value = true
    try {
      const res = await getDrafts({ page: draftPage.value, pageSize: draftPageSize.value })
      if (res && res.data) {
        drafts.value = res.data.posts
        draftHasMore.value = res.data.hasMore !== false
      }
    } catch (error) {
      console.error('获取草稿列表失败:', error)
      ElMessage.error('获取草稿列表失败')
    } finally {
      loadingDrafts.value = false
    }
  }

  // 加载草稿到编辑器（通过事件传递给父组件）
  const handleLoadDraft = (draft) => {
    ElMessageBox.confirm('加载此草稿将覆盖当前编辑内容，是否继续？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      emit('load-draft', draft)
    }).catch(() => {
    // 用户取消
    })
  }

  // 删除草稿
  const handleDeleteDraft = (draftId) => {
    ElMessageBox.confirm('确定要删除这个草稿吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(async () => {
      try {
        await deletePost(draftId)
        ElMessage.success('草稿已删除')
        // 重新加载草稿列表
        loadDrafts()
      } catch (error) {
        console.error('删除草稿失败:', error)
        ElMessage.error('删除草稿失败')
      }
    }).catch(() => {
    // 用户取消
    })
  }

  // 获取草稿预览文本
  const getDraftPreview = (content) => {
    if (!content) return '无内容'
    // 移除HTML标签，只保留文本
    const text = content.replace(/<[^>]*>/g, '').trim()
    // 限制预览长度
    return text.length > 100 ? text.substring(0, 100) + '...' : text || '无内容'
  }

  // 格式化时间
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
  
    // 小于1分钟
    if (diff < 60000) {
      return '刚刚'
    }
    // 小于1小时
    if (diff < 3600000) {
      return Math.floor(diff / 60000) + '分钟前'
    }
    // 小于24小时
    if (diff < 86400000) {
      return Math.floor(diff / 3600000) + '小时前'
    }
    // 小于7天
    if (diff < 604800000) {
      return Math.floor(diff / 86400000) + '天前'
    }
    // 格式化日期
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  }

  // 组件挂载时加载草稿列表
  onMounted(() => {
    loadDrafts()
  })

  // 暴露方法供父组件调用
  defineExpose({
    loadDrafts
  })
</script>

<style scoped>
.draft-sidebar {
  width: 100%;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.draft-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
}

.draft-sidebar-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.draft-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-loading,
.draft-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.draft-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.draft-item {
  padding: 12px;
  border: 1px solid var(--card-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--bg-secondary);
}

.draft-item:hover {
  border-color: var(--text-secondary);
  background: var(--bg-hover);
}

.draft-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.draft-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.draft-delete-btn {
  flex-shrink: 0;
  opacity: 0.6;
}

.draft-delete-btn:hover {
  opacity: 1;
  color: #f56c6c;
}

.draft-preview {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.draft-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--text-secondary);
}

.draft-time {
  flex: 1;
}

.draft-community {
  color: #ff4500;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .draft-sidebar {
    padding: 12px;
    max-height: 400px;
  }
}
</style>

