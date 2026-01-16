<template>
  <div class="profile-page setting-control">
    <!-- Banner背景横幅 - 占据40%高度 -->
    <div class="profile-banner">
      <div :style="{ backgroundImage: 'url(' + userStore.user?.banner + ')' }" class="banner-image" />
    </div>

    <!-- 主要内容容器 -->
    <div class="profile-container">
      <!-- 头像和用户名区域 -->
      <div class="profile-header-section">
        <div class="profile-avatar-wrapper">
          <el-avatar shape="square" :size="120" :src="avatar" class="profile-avatar" @click="showAvatarEditor = true" />
          <div class="avatar-edit-overlay" @click="showAvatarEditor = true">
            <el-icon class="edit-icon">
              <Edit />
            </el-icon>
          </div>
        </div>
        <div class="profile-username">
          {{ userStore.username }}
        </div>
      </div>

      <!-- 标签导航 -->
      <el-tabs 
        v-model="activeTab" 
        class="profile-tabs"
        @tab-change="handleTabChange"
      >
        <el-tab-pane
          v-for="tab in tabs"
          :key="tab.key"
          :label="tab.label"
          :name="tab.key"
        />
      </el-tabs>

      <div class="content-area">
        <div
          v-if="activeTab === 'overview'"
          class="overview-content"
        >
          <div class="user-bio-card">
            <div class="bio-text">
              {{ userBio }}
            </div>
            <div class="bio-decoration">
              {{ bioDecoration }}
            </div>
            <div
              v-if="hasSpoiler"
              class="spoiler-link"
            >
              <a href="#" @click.prevent="toggleSpoiler">Spoiler, click to view</a>
            </div>
          </div>
          <div class="activity-history">
            <h3 class="activity-title">
              Activity History
            </h3>
            <div class="activity-grid">
              <div 
                v-for="(day, index) in activityDays" 
                :key="index"
                class="activity-day"
                :class="{ active: day.active }"
              />
            </div>
          </div>
        </div>
        <router-view v-else />
      </div>
    </div>

    <!-- 头像编辑组件 -->
    <AvatarEditor v-model="showAvatarEditor" @success="handleAvatarUpdate" />
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { Edit } from '@element-plus/icons-vue'
  import { useUserStore } from '@/stores/user'
  import AvatarEditor from '@/components/AvatarEditor.vue'

  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  
  // 处理头像URL，确保相对路径转换为完整URL
  const avatar = computed(() => {
    const avatarUrl = userStore.avatar || 'https://i.pravatar.cc/120?img=7'
    // 如果是相对路径（以/uploads/开头），转换为完整URL
    if (avatarUrl && avatarUrl.startsWith('/uploads/')) {
      return `http://localhost:3000${avatarUrl}`
    }
    return avatarUrl
  })
  
  const showAvatarEditor = ref(false)
  // 头像更新成功后的处理
  const handleAvatarUpdate = (avatarUrl) => {
    // 头像已通过store更新，这里可以做一些额外处理
    console.log('头像更新成功:', avatarUrl)
  }

  // 标签导航 - 根据图片中的标签
  const tabs = [
    { key: 'overview', label: '概述', route: 'profile-overview' },
    { key: 'posts', label: '帖子', route: 'profile-posts' },
    { key: 'comments', label: '评论', route: 'profile-comments' },
    { key: 'saved', label: '已保存', route: 'profile-saved' },
    { key: 'history', label: '历史记录', route: 'profile-history' },
    { key: 'upvoted', label: '已点赞', route: 'profile-upvoted' },
    { key: 'downvoted', label: '已点踩', route: 'profile-downvoted' },
    { key: 'communities', label: '我的社区', route: 'profile-communities' }
  ]

  // 根据当前路由确定激活的标签
  const activeTab = computed({
    get: () => {
      const routeName = route.name
      const tab = tabs.find(t => t.route === routeName)
      return tab ? tab.key : 'overview'
    },
    set: (value) => {
      const tab = tabs.find(t => t.key === value)
      if (tab) {
        router.push({ name: tab.route })
      }
    }
  })

  const handleTabChange = (tabKey) => {
    const tab = tabs.find(t => t.key === tabKey)
    if (tab) {
      router.push({ name: tab.route })
    }
  }

  // 用户简介数据
  const userBio = ref('everythingoes')
  const bioDecoration = ref('°•.○.o°*')
  const hasSpoiler = ref(true)

  const toggleSpoiler = () => {
    // 处理spoiler点击
    console.log('Toggle spoiler')
  }

  // 活动历史数据 - 生成365天的活动网格
  const activityDays = ref(
    Array.from({ length: 365 }, (_, i) => ({
      active: Math.random() > 0.7 // 随机生成活动数据
    }))
  )

  // Anime统计数据
  const animeStats = ref({
    total: 150,
    daysWatched: 56.7,
    meanScore: 51.5,
    progress: 75 // 进度百分比，基于150/200
  })

  // Manga统计数据
  const mangaStats = ref({
    total: 17,
    chaptersRead: 3641,
    meanScore: 80.4,
    progress: 72.8 // 进度百分比，基于3641/5000
  })
</script>

<style scoped>
/* AniList风格的个人中心页面 - 深色主题，粉紫色高亮 */

.profile-page {
  background: #1a1a1b;
  min-height: 100vh;
  position: relative;
  padding: 0;
}

/* Banner背景横幅 - 占据40%页面高度 */
.profile-banner {
  position: relative;
  width: 100%;
  height: 40vh;
  min-height: 300px;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, 
    rgba(255, 182, 193, 0.4) 0%, 
    rgba(255, 105, 180, 0.3) 25%,
    rgba(138, 43, 226, 0.2) 50%,
    rgba(30, 144, 255, 0.3) 75%,
    rgba(176, 224, 230, 0.2) 100%);
  background-image: 
    radial-gradient(ellipse 60% 40% at 20% 20%, rgba(255, 182, 193, 0.6) 0%, transparent 60%),
    radial-gradient(ellipse 50% 30% at 80% 30%, rgba(255, 105, 180, 0.5) 0%, transparent 60%),
    radial-gradient(ellipse 40% 25% at 50% 60%, rgba(176, 224, 230, 0.4) 0%, transparent 70%),
    radial-gradient(ellipse 30% 20% at 70% 80%, rgba(138, 43, 226, 0.3) 0%, transparent 60%);
  position: relative;
  overflow: hidden;
}

.banner-image::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M50,50 Q100,30 150,50 T250,50" stroke="rgba(255,255,255,0.1)" fill="none" stroke-width="2"/><path d="M30,100 Q100,80 170,100 T310,100" stroke="rgba(255,255,255,0.08)" fill="none" stroke-width="1.5"/></svg>');
  opacity: 0.2;
  background-size: 400px 400px;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) translateX(0);
  }
  50% {
    transform: translateY(-20px) translateX(10px);
  }
}

/* 主要内容容器 */
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  padding: 0 20px;
}

/* 头像和用户名区域 */
.profile-header-section {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  padding-bottom: 20px;
  margin-top: -60px; /* 让头像部分重叠在banner上 */
  position: relative;
  z-index: 10;
}

.profile-avatar-wrapper {
  position: relative;
  cursor: pointer;
  display: inline-block;
}

.profile-avatar {
  border: 4px solid #1a1a1b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  transition: opacity 0.3s ease;
}

.profile-avatar-wrapper:hover .profile-avatar {
  opacity: 0.8;
}

.avatar-edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  cursor: pointer;
}

.profile-avatar-wrapper:hover .avatar-edit-overlay {
  opacity: 1;
}

.edit-icon {
  color: white;
  font-size: 24px;
}

.profile-username {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 标签导航 */
.profile-tabs {
  background: rgba(26, 26, 27, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px 8px 0 0;
  padding: 0 20px;
  margin-top: 20px;
}

/* Element Plus Tabs 样式定制 */
:deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
  background: transparent;
}

:deep(.el-tabs__nav-wrap) {
  overflow-x: auto;
}

:deep(.el-tabs__nav) {
  border: none;
}

:deep(.el-tabs__item) {
  padding: 16px 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

:deep(.el-tabs__item:hover) {
  color: rgba(255, 255, 255, 0.9);
}

:deep(.el-tabs__item.is-active) {
  color: #ffffff;
  font-weight: 600;
  border-bottom-color: #ff69b4;
}

:deep(.el-tabs__active-bar) {
  display: none;
}

/* 内容区域 - 左右两列布局 */
.content-area {
  background: var(--card-bg);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  transition: background-color 0.3s ease;
}

/* 左列：用户描述和活动历史 */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.user-bio-card {
  background: #252529;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.bio-text {
  font-size: 16px;
  color: #ff69b4;
  margin-bottom: 8px;
}

.bio-decoration {
  font-size: 14px;
  color: #ff69b4;
  margin-bottom: 12px;
}

.spoiler-link {
  margin-top: 8px;
}

.spoiler-link a {
  color: #ff69b4;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s ease;
}

.spoiler-link a:hover {
  color: #ff1493;
  text-decoration: underline;
}

.activity-history {
  background: #252529;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.activity-title {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 16px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(12px, 1fr));
  gap: 4px;
  max-width: 100%;
}

.activity-day {
  aspect-ratio: 1;
  background: #2a2a2e;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.activity-day.active {
  background: #ff69b4;
}

/* 右列：统计卡片 */
.right-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-card {
  background: #252529;
  border-radius: 8px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #ff69b4;
  margin-bottom: 4px;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-bar-container {
  margin-top: 20px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #2a2a2e;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff69b4 0%, #ff1493 50%, #ff69b4 100%);
  border-radius: 5px;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px rgba(255, 105, 180, 0.5);
}

.progress-markers {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

/* 响应式 */
@media (max-width: 968px) {
  .content-area {
    grid-template-columns: 1fr;
  }

  .right-column {
    order: -1;
  }

  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .profile-banner {
    height: 30vh;
    min-height: 200px;
  }

  .profile-header-section {
    margin-top: -50px;
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-username {
    font-size: 24px;
  }

  .profile-tabs {
    padding: 0 10px;
  }

  :deep(.el-tabs__item) {
    padding: 12px 12px;
    font-size: 12px;
  }

  .stats-row {
    gap: 12px;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>



