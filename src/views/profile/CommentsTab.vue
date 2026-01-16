<template>
  <div class="comments-section">
    <div v-if="comments.length > 0" class="batch-actions">
      <el-checkbox 
        v-model="selectAll" 
        :indeterminate="isIndeterminate"
        @change="handleSelectAll"
      >
        全选
      </el-checkbox>
      <el-button 
        v-if="selectedCommentIds.length > 0" 
        type="danger"
        :icon="Delete"
        :disabled="selectedCommentIds.length === 0"
        @click="handleBatchDelete"
      >
        批量删除 ({{ selectedCommentIds.length }})
      </el-button>
    </div>
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>
    <div class="comments-container">
      <div class="comments-list-container">  
        <div v-if="comments.length > 0" class="comments-list">
          <div 
            v-for="comment in comments" 
            :key="comment.id" 
            class="comment-item-wrapper"
            @click="handleCommentClick(comment)"
          >
            <!-- 复选框 -->
            <div class="comment-checkbox" @click.stop>
              <el-checkbox 
                :model-value="selectedCommentIds.includes(comment.id)"
                @change="handleCheckboxChange(comment, $event)"
              />
            </div>
            <!-- 评论内容 -->
            <div class="comment-content">
              <div class="comment-header">
                <div class="comment-author">
                  <div class="author-avatar">
                    <div class="avatar-placeholder">
                      {{ userStore.user?.username?.charAt(0)?.toUpperCase() || 'U' }}
                    </div>
                  </div>
                  <span class="author-name">u/{{ userStore.user?.username }}</span>
                  <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
                </div>
              </div>
              <div class="comment-body">
                <p class="comment-text">
                  {{ comment.content }}
                </p>
              </div>
            </div>
            
            <!-- 所属帖子信息 -->
            <div class="post-info">
              <div class="post-header-info">
                <span class="post-label">在帖子中：</span>
                <span class="post-title">{{ comment.post_title }}</span>
              </div>
              <div class="post-meta">
                <span v-if="comment.subreddit_name" class="subreddit-name">r/{{ comment.subreddit_name }}</span>
                <span v-if="comment.subreddit_name" class="separator">·</span>
                <span class="post-author">u/{{ comment.post_author }}</span>
                <span class="separator">·</span>
                <span class="comment-count">{{ comment.post_comment_count }} 条评论</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="!loading" class="empty-state">
          <div class="empty-icon">
            💬
          </div>
          <div class="empty-title">
            评论
          </div>
          <div class="empty-description">
            暂无内容
          </div>
        </div>
      </div>
     
      <div v-if="comments.length > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100, 200]"
          :small="false"
          :disabled="loading"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { Delete } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { getUserComments, deleteComment } from '@/axios/comment'
  import { useUserStore } from '@/stores/user'

  const router = useRouter()
  const userStore = useUserStore()

  const comments = ref([])
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const selectedCommentIds = ref([])
  const selectAll = ref(false)

  // 加载用户评论
  const loadUserComments = async () => {
    if (loading.value) return
    if (!userStore.isLoggedIn) {
      comments.value = []
      return
    }

    try {
      loading.value = true
      const response = await getUserComments({
        page: currentPage.value,
        pageSize: pageSize.value
      })

      if (response.success) {
        comments.value = response.data.comments
        total.value = response.data.pagination.totalItems || 0
        // 重置选中状态
        selectedCommentIds.value = []
        selectAll.value = false
      } else {
        comments.value = []
        total.value = 0
        selectedCommentIds.value = []
        selectAll.value = false
      }
    } catch (error) {
      console.error('加载评论失败:', error)
      ElMessage.error(error.response?.data?.message || '加载评论失败，请稍后重试')
      comments.value = []
    } finally {
      loading.value = false
    }
  }

  // 处理评论点击 - 跳转到帖子页面的评论区域
  const handleCommentClick = (comment) => {
    router.push({
      path: `/post/${comment.post_id}`,
      query: { 
        commentId: comment.id,
        scrollToComment: 'true'
      }
    })
  }

  // 格式化时间
  const formatTime = (timeString) => {
    if (!timeString) return ''
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
  
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 处理分页大小变化
  const handleSizeChange = (newSize) => {
    pageSize.value = newSize
    currentPage.value = 1
    loadUserComments()
  }

  // 处理当前页变化
  const handleCurrentChange = (newPage) => {
    currentPage.value = newPage
    loadUserComments()
  }

  // 处理复选框变化
  const handleCheckboxChange = (comment, checked) => {
    if (checked) {
      if (!selectedCommentIds.value.includes(comment.id)) {
        selectedCommentIds.value.push(comment.id)
      }
    } else {
      const index = selectedCommentIds.value.indexOf(comment.id)
      if (index > -1) {
        selectedCommentIds.value.splice(index, 1)
      }
    }
    updateSelectAllState()
  }

  // 全选/取消全选
  const handleSelectAll = (checked) => {
    if (checked) {
      selectedCommentIds.value = comments.value.map(comment => comment.id)
    } else {
      selectedCommentIds.value = []
    }
    selectAll.value = checked
  }

  // 更新全选状态
  const updateSelectAllState = () => {
    if (comments.value.length === 0) {
      selectAll.value = false
      return
    }
    const allSelected = comments.value.every(comment => selectedCommentIds.value.includes(comment.id))
    const someSelected = comments.value.some(comment => selectedCommentIds.value.includes(comment.id))
    selectAll.value = allSelected
  }

  // 计算是否处于半选状态
  const isIndeterminate = computed(() => {
    if (comments.value.length === 0) return false
    const selectedCount = selectedCommentIds.value.length
    return selectedCount > 0 && selectedCount < comments.value.length
  })

  // 批量删除评论
  const handleBatchDelete = async () => {
    if (selectedCommentIds.value.length === 0) {
      ElMessage.warning('请先选择要删除的评论')
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedCommentIds.value.length} 条评论吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      loading.value = true
      const deletePromises = selectedCommentIds.value.map(commentId => 
        deleteComment(commentId).catch(error => {
          console.error(`删除评论 ${commentId} 失败:`, error)
          return { success: false, commentId, error }
        })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.success !== false).length
      const failCount = results.length - successCount

      // 从列表中移除已删除的评论
      comments.value = comments.value.filter(comment => !selectedCommentIds.value.includes(comment.id))
      selectedCommentIds.value = []
      selectAll.value = false
      
      // 更新总数
      total.value = Math.max(0, total.value - successCount)

      if (failCount === 0) {
        ElMessage.success(`成功删除 ${successCount} 条评论`)
      } else {
        ElMessage.warning(`成功删除 ${successCount} 条评论，${failCount} 条删除失败`)
      }

      // 如果当前页没有数据了，且不是第一页，则跳转到上一页
      if (comments.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
        loadUserComments()
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量删除失败:', error)
        ElMessage.error('删除失败，请稍后重试')
      }
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadUserComments()
  })
</script>

<style scoped>
.comments-section {
  width: 100%;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 10px;
}

.comment-item-wrapper {
  position: relative;
}

.comment-checkbox {
  position: absolute;
  left: 8px;
  top: 16px;
  z-index: 10;
}

.loading-container {
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.empty-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
  transition: color 0.3s ease;
}

.comments-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.pagination-container {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.comments-list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item-wrapper {
  background: var(--bg-secondary, #1a1a1b);
  border: 1px solid var(--card-border, #343536);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-item-wrapper:hover {
  border-color: var(--text-primary, #d7dadc);
  background: var(--bg-hover, #272729);
}

.comment-content {
  margin-bottom: 12px;
  margin-left: 32px;
}

.comment-header {
  margin-bottom: 8px;
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-tertiary, #272729);
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary, #272729);
  color: var(--text-primary, #d7dadc);
  font-weight: 600;
  font-size: 12px;
}

.author-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #d7dadc);
}

.comment-time {
  font-size: 12px;
  color: var(--text-secondary, #818384);
}

.comment-body {
  margin-left: 32px;
}

.comment-text {
  font-size: 14px;
  color: var(--text-primary, #d7dadc);
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.post-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--card-border, #343536);
  margin-left: 32px;
}

.post-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.post-label {
  font-size: 12px;
  color: var(--text-secondary, #818384);
}

.post-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #d7dadc);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #818384);
}

.subreddit-name {
  color: var(--text-primary, #d7dadc);
  font-weight: 500;
}

.post-author {
  color: var(--text-secondary, #818384);
}

.separator {
  color: var(--text-tertiary, #6c6e70);
}

.comment-count {
  color: var(--text-secondary, #818384);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .comment-item-wrapper {
    padding: 12px;
  }

  .comment-body,
  .post-info {
    margin-left: 0;
  }
}
</style>
