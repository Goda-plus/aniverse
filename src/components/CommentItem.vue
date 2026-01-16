<template>
  <div class="comment-item" :class="{ 'is-collapsed': isCollapsed, 'highlight-comment': isHighlighted }" :data-comment-id="comment.id">
    <!-- 展开/折叠按钮和连接线 -->
    <div class="comment-line-container">
      <button 
        v-if="hasReplies"
        class="collapse-button"
        :aria-label="isCollapsed ? '展开评论' : '折叠评论'"
        @click="toggleCollapse"
      >
        <el-icon v-if="isCollapsed">
          <Plus />
        </el-icon>
        <el-icon v-else>
          <Minus />
        </el-icon>
      </button>
      <div v-else class="collapse-placeholder" />
      <div class="comment-line" :class="{ 'has-replies': hasReplies }" />
    </div>

    <!-- 评论内容 -->
    <div class="comment-content-wrapper">
      <div class="comment-content">
        <!-- 评论头部信息 -->
        <div class="comment-header">
          <div class="comment-author">
            <div class="author-avatar">
              <img 
                v-if="comment.avatar_url" 
                :src="comment.avatar_url" 
                :alt="comment.username"
              >
              <div v-else class="avatar-placeholder">
                {{ comment.username?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
            </div>
            <span class="author-name">u/{{ comment.username }}</span>
            <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
          </div>
        </div>

        <!-- 评论正文 -->
        <div v-if="!isCollapsed" class="comment-body">
          <p class="comment-text">
            {{ comment.content }}
          </p>
        </div>

        <!-- 评论操作栏 -->
        <div v-if="!isCollapsed" class="comment-actions">
          <el-button 
            text 
            class="action-btn"
            @click="handleReply"
          >
            <el-icon><ChatLineRound /></el-icon>
            <span>回复</span>
          </el-button>
          <div class="vote-section">
            <el-button 
              text 
              class="vote-button upvote"
              :class="{ active: currentVote === 'up' }"
              @click="handleVote('up')"
            >
              <el-icon><ArrowUp /></el-icon>
            </el-button>
            <span
              class="vote-count" :class="{ 
                positive: currentNetVotes > 0, 
                negative: currentNetVotes < 0 
              }"
              style="font-size: 12px;"
            >
              {{ formatVoteCount(currentNetVotes) }}
            </span>
            <el-button 
              text 
              class="vote-button downvote"
              :class="{ active: currentVote === 'down' }"
              @click="handleVote('down')"
            >
              <el-icon><ArrowDown /></el-icon>
            </el-button>
          </div>
          <div ref="menuContainerRef" class="comment-more-btn">
            <el-button 
              text 
              class="action-btn menu-btn"
              @click="toggleMenu"
            >
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <Transition name="menu-fade">
              <div v-if="showMenu" ref="menuRef" class="comment-menu">
                <div class="menu-item" @click="handleShare">
                  <el-icon><Share /></el-icon>
                  <span>共享</span>
                </div>
                <div 
                  class="menu-item danger" 
                  :class="{ disabled: !canDelete }"
                  @click="canDelete ? handleDelete() : null"
                >
                  <el-icon><Delete /></el-icon>
                  <span>删除</span>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <!-- 折叠时显示的占位符 -->
        <div v-if="isCollapsed" class="collapsed-placeholder">
          <span class="collapsed-text">评论已折叠</span>
          <span v-if="replyCount > 0" class="reply-count">{{ replyCount }} 条回复</span>
        </div>
      </div>

      <!-- 回复列表 -->
      <div v-if="!isCollapsed && (comment.replies && comment.replies.length > 0)" class="replies-container">
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :depth="depth + 1"
          :max-depth="maxDepth"
          :post-author-id="postAuthorId"
          @reply="handleChildReply"
          @delete="handleChildDelete"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch, defineProps, defineEmits } from 'vue'
  import { useRoute } from 'vue-router'
  import { useUserStore } from '@/stores/user'
  import { userVote } from '@/axios/vote'
  import { Plus, Minus, ChatLineRound, Share, Delete, MoreFilled, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'

  const props = defineProps({
    comment: {
      type: Object,
      required: true
    },
    depth: {
      type: Number,
      default: 0
    },
    maxDepth: {
      type: Number,
      default: 10
    },
    postAuthorId: {
      type: [Number, String],
      default: null
    }
  })

  const emit = defineEmits(['reply', 'delete', 'vote'])

  const userStore = useUserStore()
  const route = useRoute()
  const isCollapsed = ref(false)
  const isHighlighted = ref(false)
  
  // 菜单相关
  const showMenu = ref(false)
  const menuRef = ref(null)
  const menuContainerRef = ref(null)
  
  // 投票相关
  const isVoted = ref(null)

  // 检查是否是目标评论
  onMounted(() => {
    // 如果URL中有commentId参数且匹配当前评论，高亮显示
    const commentId = route.query.commentId
    if (commentId && String(commentId) === String(props.comment.id)) {
      isHighlighted.value = true
      setTimeout(() => {
        isHighlighted.value = false
      }, 2000)
    }

    // 添加点击外部关闭菜单的事件监听
    document.addEventListener('click', handleClickOutside)
    
    // 从接口返回的数据中直接获取投票状态
    if (props.comment.voted && props.comment.vote_type) {
      isVoted.value = props.comment.vote_type
      localVote.value = props.comment.vote_type
    }
  })

  // 组件卸载前清理
  onBeforeUnmount(() => {
    // 移除点击外部关闭菜单的事件监听
    document.removeEventListener('click', handleClickOutside)
  })

  // 计算是否有回复
  const hasReplies = computed(() => {
    return props.comment.replies && props.comment.replies.length > 0
  })

  // 计算回复数量
  const replyCount = computed(() => {
    return props.comment.reply_count || (props.comment.replies ? props.comment.replies.length : 0)
  })

  // 是否可以删除（评论作者或帖子发布者可以删除）
  const canDelete = computed(() => {
    if (!userStore.isLoggedIn || !userStore.user) {
      return false
    }
    // 确保 user_id 类型一致（都转为字符串或数字进行比较）
    const currentUserId = userStore.user?.id
    const commentUserId = props.comment?.user_id
    const postAuthorId = props.postAuthorId
    
    if (!currentUserId) {
      return false
    }
    
    // 检查是否是评论作者
    const isCommentAuthor = commentUserId && String(currentUserId) === String(commentUserId)
    
    // 检查是否是帖子发布者
    const isPostAuthor = postAuthorId && String(currentUserId) === String(postAuthorId)
    
    return isCommentAuthor || isPostAuthor
  })

  // 切换折叠状态
  const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value
  }

  // 处理回复
  const handleReply = () => {
    emit('reply', props.comment)
  }

  // 处理子评论的回复事件
  const handleChildReply = (comment) => {
    emit('reply', comment)
  }

  // 切换菜单显示
  const toggleMenu = () => {
    showMenu.value = !showMenu.value
  }

  // 关闭菜单
  const closeMenu = () => {
    showMenu.value = false
  }

  // 处理删除
  const handleDelete = () => {
    closeMenu()
    emit('delete', props.comment)
  }

  // 处理子评论的删除事件
  const handleChildDelete = (comment) => {
    emit('delete', comment)
  }

  // 本地投票状态
  // 优先使用接口返回的 vote_type（如果 voted 为 true）
  const localVote = ref(
    (props.comment.voted && props.comment.vote_type) 
      ? props.comment.vote_type 
      : (props.comment.userVote || null)
  )
  const localNetVotes = ref(props.comment.net_votes || 0)
  
  // 计算当前投票状态
  // 优先级：本地状态 > 接口返回的 vote_type > userVote
  const currentVote = computed(() => {
    if (isVoted.value) return isVoted.value
    if (localVote.value) return localVote.value
    if (props.comment.voted && props.comment.vote_type) return props.comment.vote_type
    if (props.comment.userVote) return props.comment.userVote
    return null
  })
  
  // 监听 comment 变化，更新投票状态
  watch(() => props.comment, (newComment) => {
    if (newComment.voted && newComment.vote_type) {
      isVoted.value = newComment.vote_type
      localVote.value = newComment.vote_type
    }
    if (newComment.net_votes !== undefined) {
      localNetVotes.value = newComment.net_votes
    }
  }, { deep: true })
  
  // 计算当前投票数
  const currentNetVotes = computed(() => {
    return localNetVotes.value !== 0 ? localNetVotes.value : (props.comment.net_votes || '投票')
  })

  // 处理投票
  const handleVote = async (type) => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }
    
    try {
      const prevVote = currentVote.value
      const prevScore = currentNetVotes.value
      
      // 乐观更新本地状态
      if (prevVote === type) {
        // 再次点击同一方向 -> 取消投票
        localVote.value = null
        localNetVotes.value = prevScore - (type === 'up' ? 1 : -1)
        isVoted.value = null
      } else {
        // 切换投票方向或首次投票
        const voteChange = type === 'up' ? 1 : -1
        let newScore = prevScore
        if (prevVote === 'up') {
          newScore = prevScore - 1 + voteChange
        } else if (prevVote === 'down') {
          newScore = prevScore + 1 + voteChange
        } else {
          newScore = prevScore + voteChange
        }
        localVote.value = type
        localNetVotes.value = newScore
        isVoted.value = type
      }
      
      // 调用后端投票接口
      const res = await userVote({
        comment_id: props.comment.id,
        vote_type: type
      })
      
      if (!res.success) {
        // 接口返回失败，回滚本地状态
        localVote.value = prevVote
        localNetVotes.value = prevScore
        isVoted.value = prevVote
        ElMessage.error(res.message || '投票失败，请稍后重试')
      } else {
        // 更新投票数
        if (res.data) {
          localNetVotes.value = res.data.upvotes - res.data.downvotes || localNetVotes.value
        }
        // 通知父组件更新
        emit('vote', { 
          type, 
          comment: props.comment,
          voteData: res.data
        })
      }
    } catch (error) {
      // 请求异常，回滚本地状态
      const prevVote = currentVote.value
      const prevScore = currentNetVotes.value
      localVote.value = prevVote
      localNetVotes.value = prevScore
      isVoted.value = prevVote
      ElMessage.error(error.response?.data?.message || '投票失败，请稍后重试')
    }
  }

  // 处理分享
  const handleShare = () => {
    closeMenu()
    ElMessage.info('分享功能开发中')
  }

  // 点击外部关闭菜单
  const handleClickOutside = (event) => {
    if (showMenu.value && menuContainerRef.value && !menuContainerRef.value.contains(event.target)) {
      closeMenu()
    }
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

  // 格式化投票数
  const formatVoteCount = (count) => {
    const num = count || 0
    if (num === 0) return '0'
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

</script>

<style scoped>
.comment-item {
  display: flex;
  position: relative;
  margin-bottom: 8px;
  transition: background-color 0.3s ease;
}

.comment-item.highlight-comment {
  background-color: rgba(255, 255, 0, 0.1);
  border-radius: 4px;
  padding: 4px;
  margin: -4px;
  animation: highlight-fade 2s ease-out;
}

@keyframes highlight-fade {
  0% {
    background-color: rgba(255, 255, 0, 0.3);
  }
  100% {
    background-color: rgba(255, 255, 0, 0);
  }
}

.comment-line-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 8px;
  min-width: 24px;
}

.collapse-button {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--card-border, #343536);
  background: var(--bg-secondary, #272729);
  color: var(--text-secondary, #818384);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
  flex-shrink: 0;
  z-index: 1;
}

.collapse-button:hover {
  background: var(--bg-hover, #343536);
  border-color: var(--text-primary, #d7dadc);
  color: var(--text-primary, #d7dadc);
}

.collapse-placeholder {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.comment-line {
  width: 2px;
  flex: 1;
  background: var(--card-border, #343536);
  margin-top: 4px;
  min-height: 20px;
  transition: background-color 0.2s ease;
}

.comment-line.has-replies {
  background: var(--card-border, #343536);
}

.comment-content-wrapper {
  flex: 1;
  min-width: 0;
}

.comment-content {
  background: transparent;
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

.author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  margin-bottom: 8px;
}

.comment-text {
  font-size: 14px;
  color: var(--text-primary, #d7dadc);
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.action-btn {
  padding: 4px 8px;
  color: var(--text-secondary, #818384);
  font-size: 12px;
  height: auto;
  min-height: auto;
}

.action-btn:hover {
  color: var(--text-primary, #d7dadc);
  background: var(--bg-hover, #343536);
}

.comment-more-btn {
  position: relative;
}

.menu-btn {
  color: var(--text-secondary, #818384);
  transition: color 0.2s ease;
}

.menu-btn:hover {
  color: var(--text-primary, #d7dadc);
}

.comment-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--card-bg, #1a1a1b);
  border: 1px solid var(--card-border, #343536);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 160px;
  z-index: 1000;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: var(--text-primary, #d7dadc);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background: var(--bg-hover, #343536);
}

.menu-item.danger {
  color: #ff6b6b;
}

.menu-item.danger:hover {
  background: rgba(255, 107, 107, 0.1);
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background: transparent;
}

.menu-item .el-icon {
  font-size: 16px;
}

/* 菜单过渡动画 */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.menu-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.collapsed-placeholder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  color: var(--text-secondary, #818384);
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.collapsed-placeholder:hover {
  background: var(--bg-hover, #343536);
}

.collapsed-text {
  font-style: italic;
}

.reply-count {
  color: var(--text-tertiary, #6c6e70);
}

.replies-container {
  margin-top: 8px;
  margin-left: 0;
  padding-left: 24px;
  position: relative;
}

.replies-container::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--card-border, #343536);
}

.load-more-replies {
  margin-top: 8px;
  padding-left: 32px;
}

.load-more-btn {
  color: var(--text-secondary, #818384);
  font-size: 12px;
  padding: 4px 8px;
}

.load-more-btn:hover {
  color: var(--text-primary, #d7dadc);
  background: var(--bg-hover, #343536);
}

.loading-replies {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 8px 32px;
  color: var(--text-secondary, #818384);
  font-size: 12px;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .comment-actions {
    flex-wrap: wrap;
  }

  .action-btn span {
    display: none;
  }

  .replies-container {
    padding-left: 16px;
  }
}
</style>

