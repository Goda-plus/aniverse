<template>
  <div class="post-detail">
    <!-- 返回按钮和帖子头部 -->
    <div class="post-header-section">
      <el-button 
        text 
        class="back-button"
        @click="handleBack"
      >
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      
      <div class="post-meta">
        <div class="post-author-info">
          <div class="author-avatar">
            <img 
              v-if="post.avatar_url" 
              :src="post.avatar_url" 
              :alt="post.username"
            >
            <div v-else class="avatar-placeholder">
              {{ post.username?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
          </div>
          <div class="author-details">
            <span class="author-name">u/{{ post.username }}</span>
            <span class="separator">·</span>
            <span v-if="post.subreddit_name" class="subreddit-name">r/{{ post.subreddit_name }}</span>
            <span v-if="post.subreddit_name" class="separator">·</span>
            <span class="post-time">{{ formatTime(post.created_at) }}</span>
          </div>
          <div v-if="userStore.isLoggedIn && post.user_id === userStore.user.id" ref="menuContainerRef" class="post-more-btn">
            <el-button text class="menu-btn" @click="toggleMenu">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <Transition name="menu-fade">
              <div v-if="showMenu" ref="menuRef" class="post-menu">
                <div class="menu-item" @click="handleEdit">
                  <el-icon><Edit /></el-icon>
                  <span>编辑</span>
                </div>
                <div class="menu-item danger" @click="handleDelete">
                  <el-icon><Delete /></el-icon>
                  <span>删除</span>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- 帖子标题 -->
    <div class="post-title-section">
      <h1 class="post-title">
        {{ post.title }}
      </h1>

      <!-- 话题标签 -->
      <div v-if="post.tags && post.tags.length > 0" class="post-tags">
        <span
          v-for="tag in post.tags"
          :key="tag"
          class="tag-item"
        >
          #{{ tag.name }}
        </span>
      </div>
    </div>

    <!-- 帖子内容区域 - 使用 wangeditor 只读编辑器渲染 content_html -->
    <div class="post-content-wrapper">
      <Editor
        v-model="postContentHtml"
        :default-config="editorConfig"
        style="height: auto; overflow-y: hidden;"
        @on-created="handleEditorCreated"
      />
    </div>

    <!-- 用户操作栏 -->
    <div class="post-actions">
      <div class="vote-section">
        <el-button 
          text 
          class="vote-button upvote"
          :class="{ active: isVoted === 'up' || post.userVote === 'up' }"
          @click="handleVote('up')"
        >
          <el-icon><ArrowUp /></el-icon>
        </el-button>
        <span
          class="vote-count" :class="{ 
            positive: (post.net_votes || 0) > 0, 
            negative: (post.net_votes || 0) < 0 
          }"
        >
          {{ formatVoteCount(post.net_votes || 0) }}
        </span>
        <el-button 
          text 
          class="vote-button downvote"
          :class="{ active: isVoted === 'down' || post.userVote === 'down' }"
          @click="handleVote('down')"
        >
          <el-icon><ArrowDown /></el-icon>
        </el-button>
      </div>

      <el-button 
        text 
        class="action-button"
        @click="handleComment"
      >
        <el-icon><ChatLineRound /></el-icon>
        <span>{{ post.comment_count ?? 0 }}</span>
      </el-button>

      <el-button 
        text 
        class="action-button"
        @click="handleAward"
      >
        <el-icon><Trophy /></el-icon>
        <span>奖励</span>
      </el-button>

      <el-button 
        text 
        class="action-button"
        @click="handleShare"
      >
        <el-icon><Share /></el-icon>
        <span>共享</span>
      </el-button>
    </div>

    <!-- 评论输入区域 -->
    <div class="comment-input-section">
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

      <div class="comment-input-wrapper">
        <div class="comment-avatar">
          <img 
            v-if="userStore.avatar" 
            :src="userStore.avatar" 
            alt="avatar"
          >
          <div v-else class="avatar-placeholder">
            {{ userStore.username?.charAt(0)?.toUpperCase() || 'U' }}
          </div>
        </div>
        <div class="comment-input-container">
          <textarea
            v-if="userStore.isLoggedIn"
            v-model="commentContent"
            class="comment-input" 
            :placeholder="replyingTo ? '写下你的回复...' : '加入对话'"
            rows="3"
            @keydown.ctrl.enter="handleSubmitComment"
            @keydown.meta.enter="handleSubmitComment"
          />
          <div v-else class="comment-login-prompt">
            <span>登录以加入对话</span>
          </div>
          <div v-if="userStore.isLoggedIn" class="comment-actions-bar">
            <div class="comment-tips">
              <span>按 Ctrl+Enter 或 Cmd+Enter 发送</span>
            </div>
            <el-button 
              type="primary" 
              size="small"
              :loading="submitting"
              :disabled="!commentContent.trim()"
              @click="handleSubmitComment"
            >
              发布
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 评论列表 -->
    <CommentList
      ref="commentListRef"
      :post-id="post.post_id"
      :post-author-id="post.user_id"
      @reply="handleCommentReply"
      @delete="handleCommentDelete"
      @comment-count-change="handleCommentCountChange"
    />
  </div>
</template>

<script setup>
  import { defineProps, defineEmits, ref, defineExpose, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useUserStore } from '@/stores/user'
  import { ArrowLeft, ArrowUp, ArrowDown, ChatLineRound, Trophy, Share, Close, MoreFilled, Edit, Delete } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import CommentList from './CommentList.vue'
  import '@wangeditor/editor/dist/css/style.css'
  import { Editor } from '@wangeditor/editor-for-vue'
  import { createComment } from '@/axios/comment'
  import { getUserVoteStatus, getPostVoteStatus } from '@/axios/vote'
  import { deletePost } from '@/axios/post'

  const props = defineProps({
    post: {
      type: Object,
      required: true
    }
  })
  let isVoted = ref(null)
  const emit = defineEmits(['vote', 'comment', 'share', 'back', 'edit', 'delete'])

  const router = useRouter()
  const userStore = useUserStore()
  const commentListRef = ref(null)
  const commentContent = ref('')
  const submitting = ref(false)
  const replyingTo = ref(null)
  
  // 菜单相关
  const showMenu = ref(false)
  const menuRef = ref(null)
  const menuContainerRef = ref(null)

  // wangeditor 相关
  const editorRef = shallowRef(null)
  const postContentHtml = ref('')
  
  // 编辑器配置（只读模式）
  const editorConfig = {
    placeholder: '',
    readOnly: true,
    autoFocus: false,
    // 禁用自动调整高度，避免 ResizeObserver 循环
    autoHeight: false,
    // 禁用滚动同步
    scroll: false
  }

  // 初始化编辑器
  const handleEditorCreated = (editor) => {
    editorRef.value = editor
    // 设置编辑器内容
    if (props.post?.content_html) {
      editor.setHtml(props.post.content_html)
    }
  }

  // 监听 post.content_html 变化
  watch(() => props.post?.content_html, (newHtml) => {
    if (newHtml && editorRef.value) {
      editorRef.value.setHtml(newHtml)
    }
  }, { immediate: true })

  const handleBack = () => {
    emit('back')
    // 不在这里调用 router.back()，让父组件处理返回逻辑
  }

  const handleVote = async (type) => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }
    emit('vote', { type, post: props.post })
    isVoted.value = false
  }

  const handleComment = () => {
    emit('comment', props.post)
  }

  const handleAward = () => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }
    ElMessage.info('奖励功能开发中')
  }

  const handleShare = () => {
    emit('share', props.post)
  }

  // 切换菜单显示
  const toggleMenu = () => {
    showMenu.value = !showMenu.value
  }

  // 关闭菜单
  const closeMenu = () => {
    showMenu.value = false
  }

  // 处理编辑
  const handleEdit = () => {
    closeMenu()
    // 将帖子数据存储到 sessionStorage，供编辑页面使用
    const editData = {
      post_id: props.post.post_id,
      title: props.post.title,
      content_html: props.post.content_html,
      subreddit_id: props.post.subreddit_id,
      subreddit_name: props.post.subreddit_name,
      tags: props.post.tags,
      image_url: props.post.image_url
    }
    sessionStorage.setItem('editingPost', JSON.stringify(editData))
    
    // 导航到创建帖子页面
    router.push({
      path: '/create-post',
      query: {
        edit: 'true'
      }
    })
  }

  // 处理删除
  const handleDelete = async () => {
    closeMenu()
    try {
      await ElMessageBox.confirm(
        '确定要删除这条帖子吗？此操作不可恢复。',
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        }
      )

      // 用户确认删除
      try {
        const response = await deletePost(props.post.post_id)
        if (response.success) {
          ElMessage.success('帖子已删除')
          emit('delete', props.post)
          // 延迟一下再返回，让用户看到成功消息
          setTimeout(() => {
            handleBack()
          }, 500)
        } else {
          ElMessage.error(response.message || '删除失败')
        }
      } catch (error) {
        console.error('删除帖子失败:', error)
        ElMessage.error(error.response?.data?.message || error.message || '删除失败，请稍后重试')
      }
    } catch (error) {
      // 用户取消删除，不需要处理
      if (error !== 'cancel') {
        console.error('删除确认失败:', error)
      }
    }
  }

  // 处理评论回复
  const handleCommentReply = (comment) => {
    replyingTo.value = comment
    // 滚动到输入框
    setTimeout(() => {
      const inputSection = document.querySelector('.comment-input-section')
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
  const handleSubmitComment = async () => {
    if (!commentContent.value.trim()) {
      ElMessage.warning('评论内容不能为空')
      return
    }

    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }

    try {
      submitting.value = true

      const response = await createComment({
        post_id: props.post.post_id,
        user_id: userStore.userId,
        content: commentContent.value.trim(),
        parent_comment_id: replyingTo.value?.id || null
      })
      
      if (response.success) {
        ElMessage.success(replyingTo.value ? '回复成功' : '评论发布成功')
        commentContent.value = ''
        replyingTo.value = null
        
        // 刷新评论列表
        if (commentListRef.value) {
          commentListRef.value.refresh()
        }
        
        // 通知父组件更新评论数
        emit('comment', props.post)
      } else {
        ElMessage.error(response.message || '发布失败')
      }
    } catch (error) {
      console.error('发布评论失败:', error)
      ElMessage.error(error.response?.data?.message || error.message || '发布评论失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  // 处理评论删除
  const handleCommentDelete = (comment) => {
    // 可以在这里处理删除后的逻辑，比如更新评论数
    ElMessage.success('评论已删除')
  }

  // 处理评论数量变化
  const handleCommentCountChange = (count) => {
    // 可以在这里更新帖子的评论数
    // props.post.comment_count = count
  }

  // 暴露方法供父组件调用
  defineExpose({
    commentListRef
  })

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

  const formatVoteCount = (count) => {
    const num = count || 0
    if (num === 0) return '投票'
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }
  // 点击外部关闭菜单
  const handleClickOutside = (event) => {
    if (showMenu.value && menuContainerRef.value && !menuContainerRef.value.contains(event.target)) {
      closeMenu()
    }
  }

  onMounted(async () => {
    // 初始化编辑器内容
    if (props.post?.content_html) {
      postContentHtml.value = props.post.content_html
    }
    
    // 只有登录用户才需要获取投票状态
    if (userStore.isLoggedIn) {
      try {
        const response = await getUserVoteStatus({ post_id: props.post.post_id })
        if (response.success) {
          isVoted.value = response.data.vote_type
          console.log('isVoted onMounted', isVoted.value)
        }
      } catch (error) {
        // 如果获取投票状态失败，不影响页面显示
        console.warn('获取投票状态失败:', error)
      }
    }else{
      try {
        const response = await getPostVoteStatus({ post_id: props.post.post_id })
        if (response.success) {
          isVoted.value = response.data.vote_type
        }
      } catch (error) {
        // 如果获取投票状态失败，不影响页面显示
        console.warn('获取投票状态失败:', error)
      }
    }

    // 添加点击外部关闭菜单的事件监听
    document.addEventListener('click', handleClickOutside)
  })

  // 组件卸载前清理编辑器
  onBeforeUnmount(() => {
    // 移除点击外部关闭菜单的事件监听
    document.removeEventListener('click', handleClickOutside)
    
    const editor = editorRef.value
    if (editor != null) {
      try {
        if (editor.isDestroyed) {
          editorRef.value = null
          return
        }
        editor.destroy()
      } catch (error) {
        console.warn('销毁编辑器时出错:', error)
      } finally {
        editorRef.value = null
      }
    }
  })
</script>

<style scoped>
.post-detail {
  background: var(--card-bg, #1a1a1b);
  border: 1px solid var(--card-border, #343536);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

/* 帖子头部区域 */
.post-header-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.back-button {
  color: var(--text-secondary, #818384);
  padding: 4px 8px;
  transition: color 0.2s ease;
}

.back-button:hover {
  color: var(--text-primary, #d7dadc);
}

.post-meta {
  flex: 1;
}

.post-author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 32px;
  height: 32px;
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
  font-size: 14px;
}

.author-details {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #818384);
}

.subreddit-name {
  font-weight: 600;
  color: var(--text-primary, #d7dadc);
}

.separator {
  color: var(--text-tertiary, #6c6e70);
}

.post-time {
  color: var(--text-secondary, #818384);
}

.author-name {
  color: var(--text-secondary, #818384);
}

/* 帖子标题区域 */
.post-title-section {
  margin-bottom: 16px;
}

.post-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #d7dadc);
  margin: 0 0 8px 0;
  line-height: 1.4;
  transition: color 0.3s ease;
}

/* 话题标签 */
.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  background: var(--bg-secondary, #272729);
  border: 1px solid var(--card-border, #343536);
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #818384);
  transition: all 0.2s ease;
  cursor: default;
}

.tag-item:hover {
  background: var(--bg-hover, #343536);
  color: var(--text-primary, #d7dadc);
  border-color: var(--text-primary, #d7dadc);
}

/* 帖子内容区域 */
.post-content-wrapper {
  margin-bottom: 16px;
}

/* wangeditor 只读编辑器样式 */
.post-content-wrapper :deep(.w-e-text-container) {
  background: transparent !important;
  color: var(--text-primary, #d7dadc);
  line-height: 1.6;
  word-wrap: break-word;
  transition: color 0.3s ease;
  border: none !important;
  padding: 0 !important;
}

.post-content-wrapper :deep(.w-e-text-container) {
  min-height: auto !important;
}

/* 处理嵌入的视频和图片 */
.post-content-wrapper :deep(.w-e-text-container video) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  background: #000;
}

.post-content-wrapper :deep(.w-e-text-container img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  display: block;
}

.post-content-wrapper :deep(.w-e-text-container div[data-w-e-type="video"]) {
  margin: 16px 0;
}

.post-content-wrapper :deep(.w-e-text-container p) {
  margin: 8px 0;
}

/* 用户操作栏 */
.post-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-top: 1px solid var(--card-border, #343536);
  border-bottom: 1px solid var(--card-border, #343536);
  margin: 16px 0;
}

.vote-section {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--bg-secondary, #272729);
}

.vote-button {
  padding: 4px;
  color: var(--text-secondary, #818384);
  transition: color 0.2s ease, background-color 0.2s ease;
}

.vote-button:hover {
  color: var(--text-primary, #d7dadc);
  background: var(--bg-hover, #343536);
}

.vote-button.upvote.active {
  color: #ff4500;
}

.vote-button.downvote.active {
  color: #7193ff;
}

.vote-count {
  min-width: 24px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #818384);
  padding: 0 4px;
}

.vote-count.positive {
  color: #ff4500;
}

.vote-count.negative {
  color: #7193ff;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  color: var(--text-secondary, #818384);
  font-size: 12px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.action-button:hover {
  color: var(--text-primary, #d7dadc);
  background: var(--bg-hover, #343536);
}

/* 评论输入区域 */
.comment-input-section {
  margin-top: 16px;
}

.comment-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-tertiary, #272729);
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-input-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--bg-secondary, #272729);
  border: 1px solid var(--card-border, #343536);
  border-radius: 4px;
  color: var(--text-primary, #d7dadc);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  resize: vertical;
  min-height: 60px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.comment-input:focus {
  outline: none;
  border-color: var(--text-primary, #d7dadc);
  background: var(--bg-primary, #1a1a1b);
}

.comment-input::placeholder {
  color: var(--text-secondary, #818384);
}

.comment-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-tips {
  font-size: 12px;
  color: var(--text-secondary, #818384);
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

.comment-login-prompt {
  flex: 1;
  padding: 12px 16px;
  background: var(--bg-secondary, #272729);
  border: 1px solid var(--card-border, #343536);
  border-radius: 4px;
  color: var(--text-secondary, #818384);
  font-size: 14px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.comment-login-prompt:hover {
  border-color: var(--text-primary, #d7dadc);
  background: var(--bg-hover, #343536);
}

.post-more-btn {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  color: var(--text-primary);
}

.menu-btn {
  color: var(--text-secondary, #818384);
  transition: color 0.2s ease;
}

.menu-btn:hover {
  color: var(--text-primary, #d7dadc);
}

.post-menu {
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

/* 响应式设计 */
@media (max-width: 768px) {
  .post-detail {
    padding: 12px;
  }

  .post-title {
    font-size: 18px;
  }

  .post-actions {
    flex-wrap: wrap;
  }

  .action-button span {
    display: none;
  }
}
</style>

