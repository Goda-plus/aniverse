<template>
  <div class="comment-item" :class="{ 'is-collapsed': isCollapsed }">
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
          <el-button 
            text 
            class="action-btn"
            @click="handleAward"
          >
            <el-icon><Trophy /></el-icon>
            <span>奖励</span>
          </el-button>
          <el-button 
            text 
            class="action-btn"
            @click="handleShare"
          >
            <el-icon><Share /></el-icon>
            <span>共享</span>
          </el-button>
          <el-button 
            v-if="canDelete"
            text 
            class="action-btn delete-btn"
            @click="handleDelete"
          >
            <el-icon><Delete /></el-icon>
            <span>删除</span>
          </el-button>
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
          @reply="handleChildReply"
          @delete="handleChildDelete"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed,defineProps, defineEmits } from 'vue'
  import { useUserStore } from '@/stores/user'
  import { Plus, Minus, ChatLineRound, Trophy, Share, Delete } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

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
    }
  })

  const emit = defineEmits(['reply', 'delete'])

  const userStore = useUserStore()
  const isCollapsed = ref(false)

  // 计算是否有回复
  const hasReplies = computed(() => {
    return props.comment.replies && props.comment.replies.length > 0
  })

  // 计算回复数量
  const replyCount = computed(() => {
    return props.comment.reply_count || (props.comment.replies ? props.comment.replies.length : 0)
  })

  // 是否可以删除（只有评论作者可以删除）
  const canDelete = computed(() => {
    return userStore.isLoggedIn && userStore.userId === props.comment.user_id
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

  // 处理删除
  const handleDelete = () => {
    emit('delete', props.comment)
  }

  // 处理子评论的删除事件
  const handleChildDelete = (comment) => {
    emit('delete', comment)
  }

  // 处理奖励
  const handleAward = () => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }
    ElMessage.info('奖励功能开发中')
  }

  // 处理分享
  const handleShare = () => {
    ElMessage.info('分享功能开发中')
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

</script>

<style scoped>
.comment-item {
  display: flex;
  position: relative;
  margin-bottom: 8px;
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

.action-btn.delete-btn:hover {
  color: #ff4444;
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

