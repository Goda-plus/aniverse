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

        <!-- 帖子列表 -->
        <PostList 
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

        <!-- 热门社区 -->
        <div class="sidebar-card">
          <div class="sidebar-header">
            <h3 class="sidebar-title">
              热门社区
            </h3>
          </div>
          <div class="popular-communities">
            <div 
              v-for="community in popularCommunities" 
              :key="community.id"
              class="popular-community-item"
              @click="goToCommunity(community)"
            >
              <div class="popular-community-icon">
                <img v-if="community.avatar" :src="community.avatar" :alt="community.name">
                <el-icon v-else>
                  <ChatLineRound />
                </el-icon>
              </div>
              <div class="popular-community-info">
                <div class="popular-community-name">
                  r/{{ community.name }}
                </div>
                <div class="popular-community-members">
                  {{ formatMemberCount(community.members) }} 位成员
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import PostList from '@/components/PostList.vue'
  import { ChatLineRound } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

  const route = useRoute()
  const router = useRouter()

  const communityInfo = ref(null)
  const posts = ref([])
  const showRecommendation = ref(true)
  const popularCommunities = ref([])

  // 模拟数据
  const mockPosts = [
    {
      id: 1,
      subreddit: 'halo',
      author: 'gamer123',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gamer123',
      title: 'My halo themed phone!',
      content: '',
      image: 'https://i2.hdslb.com/bfs/archive/2c5d66eec8112044f31319e5c7ad78e9200255b8.jpg@672w_378h_1c_!web-home-common-cover.avif',
      imageCount: 3,
      score: 5084,
      commentCount: 75,
      rewardCount: 2,
      userVote: 0,
      createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      recommended: false
    },
    {
      id: 2,
      subreddit: 'malegrooming',
      author: 'styleguy',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=styleguy',
      title: 'Clean shaven, stache only, or short beard?',
      content: '',
      image: 'https://via.placeholder.com/600x400?text=Grooming',
      imageCount: 1,
      score: 234,
      commentCount: 42,
      rewardCount: 0,
      userVote: 0,
      createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      recommended: true
    },
    {
      id: 3,
      subreddit: 'Onlyteenagersallowed',
      author: 'user456',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user456',
      title: 'Just curious how old do I look??',
      content: '',
      image: 'https://via.placeholder.com/600x400?text=Question',
      imageCount: 5,
      score: 507,
      commentCount: 647,
      rewardCount: 0,
      userVote: 0,
      createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      recommended: false
    },
    {
      id: 4,
      subreddit: 'DailyMix',
      author: 'puzzlemaster',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=puzzlemaster',
      title: 'Think you can find 4 hidden groups of 4 related words? Puzzle by u/NoPrint2868?',
      content: '',
      image: 'https://via.placeholder.com/600x400?text=Puzzle',
      imageCount: 0,
      score: 27,
      commentCount: 35,
      rewardCount: 0,
      userVote: 0,
      createdAt: Date.now() - 8 * 60 * 60 * 1000,
      recommended: true
    },
    {
      id: 5,
      subreddit: 'anime',
      author: 'animefan',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=animefan',
      title: 'What\'s your favorite anime of 2024?',
      content: 'I\'ve been watching a lot of anime this year and I\'m curious what everyone else thinks. Share your top picks!',
      image: null,
      imageCount: 0,
      score: 1234,
      commentCount: 256,
      rewardCount: 5,
      userVote: 0,
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      recommended: false
    }
  ]

  const mockPopularCommunities = [
    {
      id: 1,
      name: '社区动态',
      members: 7117328,
      avatar: null
    },
    {
      id: 2,
      name: '名场面',
      members: 5598208,
      avatar: null
    },
    {
      id: 3,
      name: '周边商城',
      members: 5511765,
      avatar: null
    }
  ]

  onMounted(() => {
    // 加载帖子数据
    posts.value = mockPosts

    // 加载热门社区
    popularCommunities.value = mockPopularCommunities

    // 如果路由中有社区参数，加载社区信息
    const communityName = route.params.community
    if (communityName && communityName !== 'all') {
      loadCommunityInfo(communityName)
    }
  })

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
    router.push(`/post/${post.id}`)
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
    router.push(`/post/${post.id}`)
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

  const goToCommunity = (community) => {
    router.push(`/r/${community.name}`)
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

/* 热门社区 */
.popular-communities {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.popular-community-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.popular-community-item:hover {
  background: var(--bg-hover);
}

.popular-community-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
}

.popular-community-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.popular-community-info {
  flex: 1;
  min-width: 0;
}

.popular-community-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  transition: color 0.3s ease;
}

.popular-community-members {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
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

