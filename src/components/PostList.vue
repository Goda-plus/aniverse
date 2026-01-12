<template>
  <div class="post-list">
    <!-- 排序选项栏 -->
    <div class="sort-bar">
      <div class="sort-options">
        <el-dropdown trigger="click" @command="handleSortChange">
          <el-button text class="sort-button">
            <el-icon><ArrowDown /></el-icon>
            <span>{{ currentSort }}</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="best" :class="{ active: currentSort === '最佳' }">
                最佳
              </el-dropdown-item>
              <el-dropdown-item command="hot" :class="{ active: currentSort === '热门' }">
                热门
              </el-dropdown-item>
              <el-dropdown-item command="new" :class="{ active: currentSort === '最新' }">
                最新
              </el-dropdown-item>
              <el-dropdown-item command="top" :class="{ active: currentSort === '最热' }">
                最热
              </el-dropdown-item>
              <el-dropdown-item command="rising" :class="{ active: currentSort === '上升' }">
                上升
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown trigger="click" @command="handleViewModeChange">
          <el-button text class="view-button">
            <el-icon v-if="viewMode === 'compact'">
              <List />
            </el-icon>
            <el-icon v-else-if="viewMode === 'card'">
              <Grid />
            </el-icon>
            <el-icon v-else>
              <Menu />
            </el-icon>
            <span class="view-mode-text">{{ viewModeText }}</span>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="compact" :class="{ active: viewMode === 'compact' }">
                <el-icon><List /></el-icon>
                <span>紧凑</span>
              </el-dropdown-item>
              <el-dropdown-item command="card" :class="{ active: viewMode === 'card' }">
                <el-icon><Grid /></el-icon>
                <span>卡片</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 推荐提示 -->


    <!-- 帖子列表 -->
    <div class="posts-container" :class="viewMode">
      <div 
        v-for="post in posts" 
        :key="post.id" 
        class="post-item"
        :class="viewMode"
        @click="handlePostClick(post)"
      >
        <!-- 投票区域 -->
        <div class="post-vote-section">
          <el-button 
            text 
            class="vote-button upvote"
            :class="{ active: post.userVote === 1 }"
            @click.stop="handleVote(post, 1)"
          >
            <el-icon><ArrowUp /></el-icon>
          </el-button>
          <span class="vote-count" :class="{ positive: post.score > 0, negative: post.score < 0 }">
            {{ formatVoteCount(post.score) }}
          </span>
          <el-button 
            text 
            class="vote-button downvote"
            :class="{ active: post.userVote === -1 }"
            @click.stop="handleVote(post, -1)"
          >
            <el-icon><ArrowDown /></el-icon>
          </el-button>
        </div>

        <!-- 帖子内容区域 -->
        <div class="post-content">
          <!-- 帖子头部信息 -->
          <div class="post-header">
            <div class="post-author-info">
              <div v-if="post.authorAvatar" class="post-author-avatar">
                <img :src="post.authorAvatar" :alt="post.author">
              </div>
              <div v-else class="post-author-avatar-placeholder">
                <el-icon><User /></el-icon>
              </div>
            </div>
            <div class="post-header-text">
              <span class="post-author">u/{{ post.author }}</span>
              <span class="post-separator">·</span>
              <span v-if="post.subreddit" class="post-subreddit">r/{{ post.subreddit }}</span>
              <span v-if="post.subreddit" class="post-separator">·</span>
              <span class="post-time">{{ formatTime(post.createdAt) }}</span>
              <span v-if="post.recommended" class="post-recommended">为你推荐</span>
            </div>
          </div>

          <!-- 帖子标题 -->
          <h3 class="post-title">
            {{ post.title }}
          </h3>

          <!-- 帖子内容/图片（紧凑模式） -->
          <div v-if="viewMode === 'compact' && (post.content_text || post.content_html || post.image)" class="post-body">
            <p v-if="(post.content_text || post.content_html) && !post.image" class="post-text">
              {{ post.content_text || (post.content_html ? post.content_html.replace(/<[^>]*>/g, '').substring(0, 200) : '') }}
            </p>
            <div v-if="post.image" class="post-image-container">
              <img 
                :src="post.image" 
                :alt="post.title"
                class="post-image"
                @click.stop="handleImageClick(post)"
              >
              <div v-if="post.imageCount && post.imageCount > 1" class="image-count-badge">
                {{ post.imageCount }}
              </div>
            </div>
          </div>
          
          <!-- 卡片模式下图片（在标题下方） -->
          <div v-if="viewMode === 'card' && post.image" class="post-image-card-container">
            <img 
              :src="post.image" 
              :alt="post.title"
              class="post-image-card"
              @click.stop="handleImageClick(post)"
            >
            <div v-if="post.imageCount && post.imageCount > 1" class="image-count-badge">
              {{ post.imageCount }}
            </div>
          </div>
          
          <!-- 卡片模式下文本内容 -->
          <div v-if="viewMode === 'card' && (post.content_text || post.content_html) && !post.image" class="post-body">
            <p class="post-text">
              {{ post.content_text || (post.content_html ? post.content_html.replace(/<[^>]*>/g, '').substring(0, 200) : '') }}
            </p>
          </div>

          <!-- 帖子操作栏 -->
          <div class="post-actions">
            <!-- 卡片模式下的投票按钮 -->
            <div v-if="viewMode === 'card'" class="card-vote-section">
              <el-button 
                text 
                class="card-vote-button upvote"
                :class="{ active: post.userVote === 1 }"
                @click.stop="handleVote(post, 1)"
              >
                <el-icon><ArrowUp /></el-icon>
              </el-button>
              <span class="card-vote-count" :class="{ positive: post.score > 0, negative: post.score < 0 }">
                {{ formatVoteCount(post.score) }}
              </span>
              <el-button 
                text 
                class="card-vote-button downvote"
                :class="{ active: post.userVote === -1 }"
                @click.stop="handleVote(post, -1)"
              >
                <el-icon><ArrowDown /></el-icon>
              </el-button>
            </div>
            <el-button text class="action-button" @click.stop="handleComment(post)">
              <el-icon><ChatLineRound /></el-icon>
              <span>{{ formatCount(post.commentCount) }} 条评论</span>
            </el-button>
            <el-button text class="action-button" @click.stop="handleReward(post)">
              <el-icon><Star /></el-icon>
              <span>奖励</span>
            </el-button>
            <el-button text class="action-button" @click.stop="handleShare(post)">
              <el-icon><Share /></el-icon>
              <span>共享</span>
            </el-button>
            <el-button text class="action-button" @click.stop="handleSave(post)">
              <el-icon><Collection /></el-icon>
              <span>保存</span>
            </el-button>
            <el-button v-if="viewMode === 'compact'" text class="action-button" @click.stop="handleHide(post)">
              <el-icon><View /></el-icon>
              <span>隐藏</span>
            </el-button>
            <el-button v-if="viewMode === 'compact'" text class="action-button" @click.stop="handleReport(post)">
              <el-icon><Warning /></el-icon>
              <span>举报</span>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, defineProps, defineEmits } from 'vue'
  import {
    ArrowUp,
    ArrowDown,
    List,
    Grid,
    Menu,
    User,
    ChatLineRound,
    Star,
    Share,
    Collection,
    View,
    Warning
  } from '@element-plus/icons-vue'
  import { useUserStore } from '@/stores/user'
  import { addBrowse } from '@/axios/browse'

  const props = defineProps({
    posts: {
      type: Array,
      default: () => []
    },
    showRecommendation: {
      type: Boolean,
      default: false
    }
  })
  const userStore = useUserStore()


  const emit = defineEmits(['vote', 'comment', 'reward', 'share', 'save', 'hide', 'report', 'click'])

  const currentSort = ref('最佳')
  const viewMode = ref('compact') // 'compact' 紧凑模式 或 'card' 卡片模式

  const sortMap = {
    best: '最佳',
    hot: '热门',
    new: '最新',
    top: '最热',
    rising: '上升'
  }

  const viewModeMap = {
    compact: '紧凑',
    card: '卡片'
  }

  const viewModeText = computed(() => {
    return viewModeMap[viewMode.value] || '紧凑'
  })

  const handleSortChange = (command) => {
    currentSort.value = sortMap[command] || '最佳'
  }

  const handleViewModeChange = (command) => {
    viewMode.value = command
  }

  const handleVote = (post, direction) => {
    emit('vote', { post, direction })
  }

  const handleComment = (post) => {
    emit('comment', post)
  }

  const handleReward = (post) => {
    emit('reward', post)
  }

  const handleShare = (post) => {
    emit('share', post)
  }

  const handleSave = (post) => {
    emit('save', post)
  }

  const handleHide = (post) => {
    emit('hide', post)
  }

  const handleReport = (post) => {
    emit('report', post)
  }

  const handlePostClick = async (post) => {
    // 添加浏览记录
    if(userStore.isLoggedIn){
      try {
        await addBrowse({
          target_type: 'post',
          target_id: post.id
        })
      } catch (error) {
        console.error('添加浏览记录失败:', error)
      // 不阻止用户操作，即使记录失败也继续跳转
      }
    }
    emit('click', post)
  }

  const handleImageClick = (post) => {
    // 可以在这里实现图片预览功能
    console.log('Image clicked:', post)
  }

  const formatVoteCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k'
    }
    return count.toString()
  }

  const formatCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k'
    }
    return count.toString()
  }

  const formatTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }
</script>

<style scoped>
.post-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 排序栏 */
.sort-bar {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  padding: 8px 16px;
  margin-bottom: 8px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sort-options {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-button {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  transition: color 0.3s ease, background-color 0.3s ease;
}

.sort-button:hover {
  background: var(--bg-hover);
}

.view-button {
  color: var(--text-secondary);
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.3s ease, background-color 0.3s ease;
}

.view-button:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.view-mode-text {
  font-size: 14px;
  font-weight: 600;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
}

:deep(.el-dropdown-menu__item.active) {
  color: var(--primary);
  font-weight: 600;
}

/* 推荐横幅 */
.recommendation-banner {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 帖子容器 */
.posts-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 卡片模式布局 */
.posts-container.card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: none;
  border: none;
} 

/* 帖子项 */
.post-item {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  overflow: hidden;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.post-item:hover {
  border-color: var(--text-secondary);
}

/* 卡片模式样式 */
.post-item.card {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  padding: 0;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
}

.post-item.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: var(--text-secondary);
}

.post-item.card .post-vote-section {
  display: none;
}

.post-item.card .post-content {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
}

.post-item.card .post-header {
  margin-bottom: 8px;
}

.post-item.card .post-author-avatar {
  width: 20px;
  height: 20px;
}

.post-item.card .post-author-avatar-placeholder {
  width: 20px;
  height: 20px;
  font-size: 12px;
}

.post-item.card .post-title {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 12px 0;
  line-height: 1.4;
  color: var(--text-primary);
  cursor: pointer;
}

.post-item.card .post-title:hover {
  color: var(--primary);
}

.post-item.card .post-body {
  margin-bottom: 12px;
}

.post-item.card .post-text {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.post-item.card .post-image-container {
  display: none;
}

.post-image-card-container {
  display: none;
  position: relative;
  width: 100%;
  margin: 0 0 12px 0;
  overflow: hidden;
  background: var(--bg-secondary);
}

.post-item.card .post-image-card-container {
  display: block;
  margin-left: -16px;
  margin-right: -16px;
  width: calc(100% + 32px);
  margin-top: 0;
  margin-bottom: 12px;
}

.post-image-card {
  width: 100%;
  height: auto;
  max-height: 512px;
  min-height: 200px;
  object-fit: cover;
  display: block;
  cursor: pointer;
  background: var(--bg-secondary);
}

.post-item.card .post-actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  padding-left: 0;
  padding-right: 0;
}

/* 卡片模式下的投票区域 */
.card-vote-section {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
  padding-right: 8px;
  border-right: 1px solid var(--card-border);
}

.card-vote-button {
  color: var(--text-secondary);
  padding: 4px;
  min-height: auto;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.card-vote-button:hover {
  color: var(--primary);
  background: var(--bg-hover);
}

.card-vote-button.upvote.active {
  color: #ff4500;
}

.card-vote-button.downvote.active {
  color: #7193ff;
}

.card-vote-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 32px;
  text-align: center;
  transition: color 0.3s ease;
}

.card-vote-count.positive {
  color: #ff4500;
}

.card-vote-count.negative {
  color: #7193ff;
}

/* 投票区域 */
.post-vote-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  background: var(--bg-secondary);
  min-width: 40px;
  gap: 4px;
  transition: background-color 0.3s ease;
}

.vote-button {
  color: var(--text-secondary);
  padding: 2px 4px;
  min-height: 24px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.vote-button:hover {
  color: var(--primary);
  background: var(--bg-hover);
}

.vote-button.upvote.active {
  color: #ff4500;
}

.vote-button.downvote.active {
  color: #7193ff;
}

.vote-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  min-height: 20px;
  display: flex;
  align-items: center;
  transition: color 0.3s ease;
}

.vote-count.positive {
  color: #ff4500;
}

.vote-count.negative {
  color: #7193ff;
}

/* 帖子内容区域 */
.post-content {
  flex: 1;
  padding: 8px 16px;
  min-width: 0;
}

/* 帖子头部 */
.post-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.post-author-info {
  flex-shrink: 0;
}

.post-author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
}

.post-author-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-author-avatar-placeholder {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 12px;
}

.post-header-text {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.post-subreddit {
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.post-subreddit:hover {
  text-decoration: underline;
  color: var(--primary);
}

.post-author {
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.post-author:hover {
  text-decoration: underline;
  color: var(--text-primary);
}

.post-separator {
  color: var(--text-secondary);
}

.post-time {
  color: var(--text-secondary);
}

.post-recommended {
  color: var(--primary);
  font-weight: 500;
}

/* 帖子标题 */
.post-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 4px 0 8px 0;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.post-item:hover .post-title {
  color: var(--primary);
}

/* 帖子内容主体 */
.post-body {
  margin-bottom: 8px;
}

.post-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
  transition: color 0.3s ease;
}

.post-image-container {
  position: relative;
    margin-top: 8px;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    max-height: 100%;
    width: 20%;
}

.post-image {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.image-count-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* 帖子操作栏 */
.post-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.action-button {
  color: var(--text-secondary);
  font-size: 12px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.action-button:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.action-button .el-icon {
  font-size: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .post-vote-section {
    min-width: 32px;
    padding: 4px 2px;
  }

  .post-content {
    padding: 8px 12px;
  }

  .post-title {
    font-size: 16px;
  }

  .post-actions {
    gap: 2px;
  }

  .action-button {
    font-size: 11px;
    padding: 4px 6px;
  }

  .action-button span {
    display: none;
  }
}
</style>

