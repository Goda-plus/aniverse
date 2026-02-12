<template>
  <div class="comment-list">
    <!-- 评论输入框 -->
    <div class="comment-editor">
      <!-- 回复目标评论显示 -->
      <div v-if="replyingTo" class="reply-target-info">
        <div class="reply-target-content">
          <span class="reply-label">回复给</span>
          <span class="reply-author">u/{{ replyingTo.username }}</span>
          <el-button 
            text 
            class="cancel-reply-btn"
            @click="cancelReply"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <div class="reply-target-text">
          {{ replyingTo.content }}
        </div>
      </div>

      <el-input
        v-model="newCommentContent"
        type="textarea"
        :rows="3"
        :placeholder="replyingTo ? '写下你的回复...' : '写下你的想法...'"
        :disabled="submittingComment"
        maxlength="1000"
        show-word-limit
      />
      <div class="editor-actions">
        <el-button
          type="primary"
          size="small"
          :loading="submittingComment"
          :disabled="!newCommentContent.trim()"
          @click="submitComment"
        >
          {{ replyingTo ? '发表回复' : '发表评论' }}
        </el-button>
      </div>
    </div>

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
        :comment-type="commentType"
        @reply="handleReply"
        @delete="handleDelete"
      />
    </div>

    <!-- 加载更多按钮 -->
    <div v-if="hasMore && !loading && supportPagination" class="load-more-container">
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
  import { ChatLineRound, Loading, Close } from '@element-plus/icons-vue'
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
    },
    // Custom API functions for different comment systems
    getCommentsApi: {
      type: Function,
      default: null
    },
    createCommentApi: {
      type: Function,
      default: null
    },
    deleteCommentApi: {
      type: Function,
      default: null
    },
    // API parameter mapping
    apiParamName: {
      type: String,
      default: 'post_id' // or 'scene_id' for scene moments
    },
    // Whether to support pagination
    supportPagination: {
      type: Boolean,
      default: true
    },
    // Comment type: 'post' or 'scene_moment'
    commentType: {
      type: String,
      default: 'post'
    }
  })

  const emit = defineEmits(['reply', 'delete', 'comment-count-change', 'create-comment'])

  const comments = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref(null)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const hasMore = ref(true)

  // 评论输入相关
  const newCommentContent = ref('')
  const submittingComment = ref(false)
  const replyingTo = ref(null)

  // 是否支持分页
  const supportPagination = computed(() => props.supportPagination && !props.getCommentsApi)

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

      // Use custom API if provided, otherwise use default
      const apiFunction = props.getCommentsApi || getCommentTree

      let response
      if (props.getCommentsApi) {
        // For custom APIs like sceneMoments that don't support pagination, pass the ID directly
        console.log('Loading comments with custom API, postId:', props.postId)
        response = await apiFunction(props.postId)
      } else {
        // For default getCommentTree API
        const apiParams = {
          [props.apiParamName]: props.postId,
          page,
          pageSize: pageSize.value
        }
        console.log('Loading comments with params:', apiParams)
        response = await apiFunction(apiParams)
      }

      if (response.success || response.code === 200) {
        // Handle different response formats
        const newComments = response.data?.list || response.data || []

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
    replyingTo.value = comment
    emit('reply', comment)
    // 滚动到输入框
    setTimeout(() => {
      const inputSection = document.querySelector('.comment-editor')
      if (inputSection) {
        inputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 100)
  }

  // 取消回复
  const cancelReply = () => {
    replyingTo.value = null
  }

  // 提交评论
  const submitComment = async () => {
    const content = newCommentContent.value.trim()
    if (!content) return

    submittingComment.value = true
    try {
      // 根据 commentType 使用不同的参数名称
      const parentId = replyingTo.value?.id || null
      const commentData = {
        content,
        onSuccess: () => {
          newCommentContent.value = ''
          replyingTo.value = null
          refresh()
        }
      }
      
      // 根据评论类型使用不同的参数名称
      if (props.commentType === 'scene_moment') {
        commentData.parent_id = parentId
      } else {
        commentData.parent_comment_id = parentId
      }
      
      emit('create-comment', commentData)
    } finally {
      submittingComment.value = false
    }
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

      // Use custom API if provided, otherwise use default
      const deleteApi = props.deleteCommentApi || deleteComment
      const response = await deleteApi(comment.id)
    
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

.comment-editor {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--card-bg, #1a1a1b);
  border: 1px solid var(--card-border, #343536);
  border-radius: 8px;
}

.reply-target-info {
  margin-bottom: 12px;
  padding: 12px;
  background: var(--bg-secondary, #272729);
  border: 1px solid var(--card-border, #343536);
  border-radius: 4px;
}

.reply-target-content {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary, #818384);
}

.reply-label {
  color: var(--text-secondary, #818384);
}

.reply-author {
  font-weight: 600;
  color: var(--text-primary, #d7dadc);
}

.cancel-reply-btn {
  margin-left: auto;
  padding: 4px;
  color: var(--text-secondary, #818384);
}

.cancel-reply-btn:hover {
  color: var(--text-primary, #d7dadc);
}

.reply-target-text {
  font-size: 13px;
  color: var(--text-primary, #d7dadc);
  line-height: 1.5;
  word-wrap: break-word;
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.editor-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
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

