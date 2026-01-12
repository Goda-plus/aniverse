<template>
  <div v-if="recentBrowsedPosts.length > 0" class="sidebar-card">
    <div class="sidebar-header">
      <h3 class="sidebar-title">
        <el-icon><Clock /></el-icon>
        最近浏览
      </h3>
    </div>
    <div v-if="loading" class="loading-recent-browsed">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>加载中...</span>
    </div>
    <div v-else class="recent-browsed-posts">
      <div 
        v-for="post in recentBrowsedPosts" 
        :key="post.id"
        class="recent-browsed-item"
        @click="handlePostClick(post)"
      >
        <div class="recent-browsed-content">
          <div style="display: flex; align-items: center; gap: 8px;">
            <el-avatar size="small" :src="post.authorAvatar" class="recent-browsed-author-avatar" />
            <span class="recent-browsed-author-name">u/{{ post.author }}</span>
          </div>
          <div class="recent-browsed-title">
            {{ post.title }}
          </div>
          <div class="recent-browsed-meta">
            <span class="recent-browsed-time">{{ formatTime(post.lastVisitedAt ? new Date(post.lastVisitedAt).getTime() : post.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, defineExpose, defineEmits } from 'vue'
  import { Clock, Loading } from '@element-plus/icons-vue'
  import { getBrowseHistory } from '@/axios/browse'
  import { useUserStore } from '@/stores/user'

  const userStore = useUserStore()

  // 转换 API 数据格式为组件需要的格式
  const transformPostData = (apiPost) => {
    // 解析 image_url（可能是 JSON 字符串）
    let imageUrl = null
    let imageCount = 0
    if (apiPost.image_url) {
      try {
        const imageUrls = typeof apiPost.image_url === 'string' 
          ? JSON.parse(apiPost.image_url) 
          : apiPost.image_url
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
          imageUrl = imageUrls[0]
          imageCount = imageUrls.length
        }
      } catch (e) {
        // 如果不是 JSON，直接使用
        imageUrl = apiPost.image_url
        imageCount = 1
      }
    }

    return {
      id: apiPost.post_id,
      subreddit: apiPost.subreddit_name || 'nextfuckinglevel',
      author: apiPost.username,
      authorAvatar: apiPost.avatar_url,
      title: apiPost.title,
      content: apiPost.content_text,
      content_html: apiPost.content_html,
      image: imageUrl,
      imageCount: imageCount,
      score: apiPost.net_votes || (apiPost.upvotes - apiPost.downvotes) || 0,
      commentCount: apiPost.comment_count || 0,
      rewardCount: 0,
      userVote: apiPost.user_vote !== undefined ? apiPost.user_vote : 0,
      createdAt: new Date(apiPost.created_at).getTime(),
      recommended: false
    }
  }

  const recentBrowsedPosts = ref([])
  const loading = ref(false)

  // 加载最近浏览的帖子
  const loadRecentBrowsedPosts = async () => {
    try {
      loading.value = true
      const response = await getBrowseHistory({ pageSize: 10, page: 1 })
      
      if (response.success && response.data && Array.isArray(response.data.posts)) {
        // 后端已经返回了完整的帖子信息，直接转换即可
        recentBrowsedPosts.value = response.data.posts.map(post => ({
          ...transformPostData(post),
          lastVisitedAt: post.last_visited_at
        }))
      } else {
        recentBrowsedPosts.value = []
      }
    } catch (error) {
      console.error('加载最近浏览失败:', error)
      recentBrowsedPosts.value = []
    } finally {
      loading.value = false
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '未知时间'
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

  const emit = defineEmits(['post-click'])

  const handlePostClick = (post) => {
    emit('post-click', post)
  }

  // 暴露刷新方法供父组件调用
  defineExpose({
    loadRecentBrowsedPosts
  })

  onMounted(() => {
    if (userStore.isLoggedIn) {
      loadRecentBrowsedPosts()
    }
  })
</script>

<style scoped>
.sidebar-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-header {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-header .el-icon {
  font-size: 16px;
  color: var(--text-secondary);
}

/* 最近浏览 */
.loading-recent-browsed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.recent-browsed-posts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-browsed-item {
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border: 1px solid transparent;
}

.recent-browsed-item:hover {
  background: var(--bg-hover);
  border-color: var(--card-border);
}

.recent-browsed-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-browsed-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.recent-browsed-item:hover .recent-browsed-title {
  color: var(--primary);
}

.recent-browsed-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.recent-browsed-time {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}
</style>

