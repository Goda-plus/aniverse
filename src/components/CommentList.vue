<template>
  <div class="comment-list">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="error" class="error-container">
      <el-alert
        :title="error"
        type="error"
        :closable="false"
        show-icon
      />
    </div>

    <div v-else-if="comments.length === 0" class="empty-container">
      <div class="empty-message">
        <el-icon class="empty-icon">
          <ChatLineRound />
        </el-icon>
        <p>还没有评论，来发表第一条评论吧！</p>
      </div>
    </div>

    <div v-else class="comments-container">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :depth="0"
        :max-depth="maxDepth"
        :post-author-id="postAuthorId"
        @reply="handleReply"
        @delete="handleDelete"
      />
    </div>

    <!-- 加载更多按钮 -->
    <div v-if="hasMore && !loading" class="load-more-container">
      <el-button 
        text 
        class="load-more-btn"
        @click="loadMore"
      >
        加载更多评论
      </el-button>
    </div>

    <!-- 加载更多时的加载状态 -->
    <div v-if="loadingMore" class="loading-more">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch ,defineProps, defineEmits, defineExpose} from 'vue'
  import { getCommentTree, deleteComment } from '@/axios/comment'
  import CommentItem from './CommentItem.vue'
  import { ChatLineRound, Loading } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const props = defineProps({
    postId: {
      type: [Number, String],
      required: true
    },
    maxDepth: {
      type: Number,
      default: 10
    },
    autoLoad: {
      type: Boolean,
      default: true
    },
    postAuthorId: {
      type: [Number, String],
      default: null
    }
  })

  const emit = defineEmits(['reply', 'delete', 'comment-count-change'])

  const comments = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref(null)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const hasMore = ref(true)

  // 加载评论
  const loadComments = async (page = 1, append = false) => {
    if (loading.value || loadingMore.value) return

    try {
      if (page === 1) {
        loading.value = true
      } else {
        loadingMore.value = true
      }
      error.value = null
      console.log('props.postId', props.postId)
      const response = await getCommentTree({
        post_id: props.postId,
        page,
        pageSize: pageSize.value
      })

      if (response.success) {
        const newComments = response.data || []
      
        if (append) {
          comments.value = [...comments.value, ...newComments]
        } else {
          comments.value = newComments
        }

        // 检查是否还有更多评论
        hasMore.value = newComments.length === pageSize.value
        currentPage.value = page

        // 通知父组件评论数量变化
        emit('comment-count-change', comments.value.length)
      } else {
        error.value = response.message || '加载评论失败'
      }
    } catch (err) {
      console.error('加载评论失败:', err)
      error.value = err.response?.data?.message || err.message || '加载评论失败，请稍后重试'
      ElMessage.error(error.value)
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  // 加载更多
  const loadMore = () => {
    loadComments(currentPage.value + 1, true)
  }

  // 处理回复
  const handleReply = (comment) => {
    emit('reply', comment)
  }

  // 处理删除
  const handleDelete = async (comment) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除这条评论吗？',
        '确认删除',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      const response = await deleteComment(comment.id)
    
      if (response.success) {
        // 从列表中移除该评论（递归查找并删除）
        const removeComment = (list, id) => {
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === id) {
              list.splice(i, 1)
              return true
            }
            // 递归查找子评论
            if (list[i].replies && Array.isArray(list[i].replies)) {
              if (removeComment(list[i].replies, id)) {
                // 更新父评论的回复数和has_children状态
                list[i].reply_count = list[i].replies.length
                list[i].has_children = list[i].replies.length > 0
                return true
              }
            }
          }
          return false
        }

        if (removeComment(comments.value, comment.id)) {
          emit('delete', comment)
        
          // 计算总评论数（包括所有子评论）
          const countAllComments = (list) => {
            let count = 0
            list.forEach(comment => {
              count++
              if (comment.replies && Array.isArray(comment.replies)) {
                count += countAllComments(comment.replies)
              }
            })
            return count
          }
        
          const totalCount = countAllComments(comments.value)
          emit('comment-count-change', totalCount)
        }
      } else {
        ElMessage.error(response.message || '删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除评论失败:', error)
        ElMessage.error(error.response?.data?.message || error.message || '删除评论失败')
      }
    }
  }

  // 刷新评论列表
  const refresh = () => {
    currentPage.value = 1
    hasMore.value = true
    loadComments(1, false)
  }

  // 添加新评论到列表顶部
  const addComment = (comment) => {
    comments.value.unshift(comment)
  }

  // 监听postId变化
  watch(() => props.postId, (newId) => {
    if (newId && props.autoLoad) {
      refresh()
    }
  })

  // 组件挂载时加载评论
  onMounted(() => {
    if (props.postId && props.autoLoad) {
      loadComments(1, false)
    }
  })

  // 暴露方法供父组件调用
  defineExpose({
    refresh,
    addComment,
    loadComments
  })
</script>

<style scoped>
.comment-list {
  margin-top: 16px;
}

.loading-container,
.error-container,
.empty-container {
  padding: 20px;
  text-align: center;
}

.empty-container {
  padding: 40px 20px;
}

.empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary, #818384);
}

.empty-icon {
  font-size: 48px;
  color: var(--text-tertiary, #6c6e70);
}

.empty-message p {
  margin: 0;
  font-size: 14px;
}

.comments-container {
  display: flex;
  flex-direction: column;
}

.load-more-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  margin-top: 16px;
}

.load-more-btn {
  color: var(--text-secondary, #818384);
  font-size: 14px;
  padding: 8px 16px;
}

.load-more-btn:hover {
  color: var(--text-primary, #d7dadc);
  background: var(--bg-hover, #343536);
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--text-secondary, #818384);
  font-size: 14px;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

