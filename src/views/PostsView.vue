<template>
  <MainContentLayout>
    <template #content>
      <div class="posts-page">
        <!-- 社区头部（如果是在特定社区） -->
        <div v-if="communityInfo" class="community-header">
          <div class="community-banner" :style="{ backgroundImage: `url(${communityInfo.banner})` }">
            <div class="community-info">
              <div class="community-avatar">
                <img :src="communityInfo.avatar" :alt="communityInfo.name">
              </div>
              <div class="community-details">
                <h1 class="community-name">
                  r/{{ communityInfo.name }}
                </h1>
                <p class="community-description">
                  {{ communityInfo.description }}
                </p>
                <div class="community-stats">
                  <span>{{ formatMemberCount(communityInfo.members) }} 位成员</span>
                  <span class="separator">·</span>
                  <span>{{ formatMemberCount(communityInfo.online) }} 在线</span>
                </div>
              </div>
              <el-button 
                v-if="!communityInfo.joined"
                type="primary" 
                class="join-button"
                @click="handleJoin"
              >
                加入
              </el-button>
              <el-button 
                v-else
                class="joined-button"
                @click="handleLeave"
              >
                已加入
              </el-button>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>

        <!-- 帖子列表 -->
        <PostList 
          v-else
          :posts="posts" 
          :show-recommendation="showRecommendation"
          @vote="handleVote"
          @comment="handleComment"
          @share="handleShare"
          @save="handleSave"
          @hide="handleHide"
          @report="handleReport"
          @click="handlePostClick"
        />

        <!-- 加载更多状态 -->
        <div v-if="loadingMore" class="loading-more">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>加载中...</span>
        </div>

        <!-- 没有更多数据提示 -->
        <div v-if="!hasMore && posts.length > 0 && !loading" class="no-more">
          没有更多帖子了
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 社区信息卡片 -->
        <div v-if="communityInfo" class="sidebar-card">
          <div class="community-sidebar-info">
            <div class="community-sidebar-avatar">
              <img :src="communityInfo.avatar" :alt="communityInfo.name">
            </div>
            <h2 class="community-sidebar-name">
              r/{{ communityInfo.name }}
            </h2>
            <p class="community-sidebar-description">
              {{ communityInfo.description }}
            </p>
            <div class="community-sidebar-stats">
              <div class="stat-item">
                <span class="stat-value">{{ formatMemberCount(communityInfo.members) }}</span>
                <span class="stat-label">成员</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ formatMemberCount(communityInfo.online) }}</span>
                <span class="stat-label">在线</span>
              </div>
            </div>
            <el-button 
              v-if="!communityInfo.joined"
              type="primary" 
              class="sidebar-join-button"
              @click="handleJoin"
            >
              加入
            </el-button>
            <el-button 
              v-else
              class="sidebar-joined-button"
              @click="handleLeave"
            >
              已加入
            </el-button>
          </div>
        </div>

        <!-- 关于社区 -->
        <div v-if="communityInfo" class="sidebar-card">
          <div class="sidebar-header">
            <h3 class="sidebar-title">
              关于社区
            </h3>
          </div>
          <div class="about-content">
            <p>{{ communityInfo.about }}</p>
            <div class="about-meta">
              <div class="meta-item">
                <span class="meta-label">创建于</span>
                <span class="meta-value">{{ formatDate(communityInfo.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近浏览 -->
        <RecentBrowsed 
          ref="recentBrowsedRef"
          @post-click="handlePostClick"
        />
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import PostList from '@/components/PostList.vue'
  import { ChatLineRound, Loading } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import { getAllPostsWithUser, getPostsBySubreddit } from '@/axios/post'
  import RecentBrowsed from '@/components/RecentBrowsed.vue'

  const route = useRoute()
  const router = useRouter()

  const communityInfo = ref(null)
  const posts = ref([])
  const showRecommendation = ref(true)
  const recentBrowsedRef = ref(null)
  
  // 分页相关
  const currentPage = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const hasMore = ref(true)
  const loadingMore = ref(false)
  let scrollTimer = null

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
      subreddit: 'nextfuckinglevel', // 可以根据实际情况设置
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
      userVote: 0, // 需要根据实际投票状态设置
      createdAt: new Date(apiPost.created_at).getTime(),
      recommended: false
    }
  }

  // 加载帖子数据
  const loadPosts = async (page = 1, append = false) => {
    if (loading.value || loadingMore.value) return
    if (!append && !hasMore.value) return

    try {
      if (append) {
        loadingMore.value = true
      } else {
        loading.value = true
      }

      const communityName = route.params.community
      let response

      if (communityName && communityName !== 'all') {
        // 加载特定社区的帖子（需要先获取 subreddit_id）
        // 这里暂时使用全部帖子接口，后续可以根据需要添加社区ID查询
        response = await getAllPostsWithUser({
          page,
          pageSize: pageSize.value
        })
      } else {
        // 加载全部帖子
        response = await getAllPostsWithUser({
          page,
          pageSize: pageSize.value
        })
      }

      if (response.success && Array.isArray(response.data)) {
        const transformedPosts = response.data.map(transformPostData)
        
        if (append) {
          posts.value = [...posts.value, ...transformedPosts]
        } else {
          posts.value = transformedPosts
        }

        // 判断是否还有更多数据
        hasMore.value = transformedPosts.length === pageSize.value
        currentPage.value = page
      } else {
        ElMessage.error(response.message || '加载帖子失败')
        hasMore.value = false
      }
    } catch (error) {
      console.error('加载帖子失败:', error)
      ElMessage.error(error.response?.data?.message || '加载帖子失败，请稍后重试')
      hasMore.value = false
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  // 滚动加载处理（使用节流优化性能）
  const handleScroll = () => {
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
    
    scrollTimer = setTimeout(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // 当滚动到距离底部 300px 时加载更多
      if (documentHeight - scrollTop - windowHeight < 300) {
        if (hasMore.value && !loadingMore.value && !loading.value) {
          loadPosts(currentPage.value + 1, true)
        }
      }
    }, 100)
  }

  onMounted(() => {
    // 初始加载帖子数据
    loadPosts(1, false)

    // 如果路由中有社区参数，加载社区信息
    const communityName = route.params.community
    if (communityName && communityName !== 'all') {
      loadCommunityInfo(communityName)
    }

    // 添加滚动监听
    window.addEventListener('scroll', handleScroll)
  })

  onUnmounted(() => {
    // 移除滚动监听
    window.removeEventListener('scroll', handleScroll)
    // 清理定时器
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
  })

  // 监听路由变化，重新加载数据
  watch(
    () => route.params.community,
    (newCommunity, oldCommunity) => {
      if (newCommunity !== oldCommunity) {
        // 重置状态
        currentPage.value = 1
        hasMore.value = true
        posts.value = []
        // 重新加载数据
        loadPosts(1, false)
        // 如果路由中有社区参数，加载社区信息
        if (newCommunity && newCommunity !== 'all') {
          loadCommunityInfo(newCommunity)
        } else {
          communityInfo.value = null
        }
      }
    }
  )

  // 监听路由路径变化，当返回页面时刷新最近浏览
  let previousPath = route.path
  watch(
    () => route.path,
    (newPath) => {
      // 如果从帖子详情页返回，刷新最近浏览
      if (previousPath && previousPath.startsWith('/post/') && !newPath.startsWith('/post/')) {
        if (recentBrowsedRef.value) {
          recentBrowsedRef.value.loadRecentBrowsedPosts()
        }
      }
      previousPath = newPath
    }
  )

  const loadCommunityInfo = (name) => {
    // 模拟加载社区信息
    communityInfo.value = {
      name: name,
      description: '这是一个关于' + name + '的社区',
      about: '欢迎来到 ' + name + ' 社区！这里是一个分享和讨论的地方。',
      members: 1000000,
      online: 5000,
      avatar: 'https://via.placeholder.com/64?text=' + name,
      banner: 'https://via.placeholder.com/1200x200?text=' + name,
      joined: false,
      createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000
    }
  }

  const handleVote = ({ post, direction }) => {
    const postIndex = posts.value.findIndex(p => p.id === post.id)
    if (postIndex !== -1) {
      const currentVote = posts.value[postIndex].userVote
      if (currentVote === direction) {
        // 取消投票
        posts.value[postIndex].userVote = 0
        posts.value[postIndex].score -= direction
      } else {
        // 改变投票
        posts.value[postIndex].score -= currentVote
        posts.value[postIndex].userVote = direction
        posts.value[postIndex].score += direction
      }
    }
  }

  const handleComment = (post) => {
    // 保存当前路由作为来源，以便返回时能正确导航
    router.push({
      path: `/post/${post.id}`,
      query: { from: route.path }
    })
  }

  const handleShare = (post) => {
    ElMessage.success('分享功能开发中')
  }

  const handleSave = (post) => {
    ElMessage.success('已保存')
  }

  const handleHide = (post) => {
    const index = posts.value.findIndex(p => p.id === post.id)
    if (index !== -1) {
      posts.value.splice(index, 1)
      ElMessage.success('已隐藏')
    }
  }

  const handleReport = (post) => {
    ElMessage.info('举报功能开发中')
  }

  const handlePostClick = (post) => {
    // 保存当前路由作为来源，以便返回时能正确导航
    router.push({
      path: `/post/${post.id}`,
      query: { from: route.path }
    })
  }

  const handleJoin = () => {
    if (communityInfo.value) {
      communityInfo.value.joined = true
      ElMessage.success('已加入社区')
    }
  }

  const handleLeave = () => {
    if (communityInfo.value) {
      communityInfo.value.joined = false
      ElMessage.success('已离开社区')
    }
  }


  const formatMemberCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k'
    }
    return count.toString()
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

</script>

<style scoped>
.posts-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 社区头部 */
.community-header {
  margin-bottom: 16px;
}

.community-banner {
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.community-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.7) 100%);
}

.community-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.community-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #ffffff;
  flex-shrink: 0;
}

.community-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.community-details {
  flex: 1;
  color: #ffffff;
}

.community-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #ffffff;
}

.community-description {
  font-size: 14px;
  margin: 0 0 8px 0;
  color: rgba(255, 255, 255, 0.9);
}

.community-stats {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
}

.separator {
  margin: 0 4px;
}

.join-button,
.joined-button {
  flex-shrink: 0;
}

.join-button {
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff;
}

.join-button:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.joined-button {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.5);
  color: #ffffff;
}

.joined-button:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 侧边栏 */
.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

/* 社区侧边栏信息 */
.community-sidebar-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.community-sidebar-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--card-border);
}

.community-sidebar-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.community-sidebar-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.community-sidebar-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  transition: color 0.3s ease;
}

.community-sidebar-stats {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.sidebar-join-button,
.sidebar-joined-button {
  width: 100%;
  margin-top: 8px;
}

.sidebar-join-button {
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff;
}

.sidebar-join-button:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.sidebar-joined-button {
  background: var(--bg-secondary);
  border-color: var(--card-border);
  color: var(--text-primary);
}

.sidebar-joined-button:hover {
  background: var(--bg-hover);
}

/* 关于内容 */
.about-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  transition: color 0.3s ease;
}

.about-meta {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.meta-value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  transition: color 0.3s ease;
}


/* 加载状态 */
.loading-container {
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  margin-bottom: 16px;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.no-more {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 960px) {
  .community-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-avatar {
    width: 64px;
    height: 64px;
  }

  .community-name {
    font-size: 24px;
  }
}
</style>

