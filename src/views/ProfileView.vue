<template>
  <div class="profile-page setting-control">
    <div class="profile-container">
      <!-- 中央内容区 -->
      <div class="main-content setting-control">
        <!-- 用户头像和基本信息 -->
        <div class="profile-header">
          <div class="profile-avatar-wrapper">
            <el-avatar :size="80" :src="avatar" class="profile-avatar" @click="showAvatarEditor = true" />
            <div class="avatar-edit-overlay" @click="showAvatarEditor = true">
              <el-icon class="edit-icon">
                <Edit />
              </el-icon>
            </div>
          </div>
          <div class="profile-info">
            <div class="username">
              {{ userStore.username }}
            </div>
            <div class="user-handle">
              u/{{ userStore.username }}
            </div>
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

        <!-- 内容区域 -->
        <div class="content-area">
          <router-view />
        </div>
      </div>

      <!-- 右侧边栏 -->
      <div class="sidebar setting-control">
        <div class="card sidebar-container">
          <!-- 用户资料部分 -->
          <div class="sidebar-section">
            <div class="profile-banner" />
            <div class="profile-card-content">
              <div class="card-username">
                {{ userStore.username }}
              </div>
              <el-button size="small" class="share-btn">
                <el-icon>
                  <Share />
                </el-icon>
                共享
              </el-button>
              <div class="stats">
                <div class="stat-item">
                  <span class="stat-value">0</span>
                  <span class="stat-label">位粉丝</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">1</span>
                  <span class="stat-label">Karma</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">0</span>
                  <span class="stat-label">贡献</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">6 个月</span>
                  <span class="stat-label">资历</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">0</span>
                  <span class="stat-label">活跃于</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">0</span>
                  <span class="stat-label">已赚取金币</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <el-divider />

          <!-- 成就部分 -->
          <div class="sidebar-section achievements-section">
            <div class="card-header">
              <span class="card-title">成就</span>
              <span class="achievements-count">已解锁 {{ achievements.length }} 个</span>
            </div>
            <div class="achievements-list">
              <div
                v-for="(achievement, index) in achievements.slice(0, 3)"
                :key="index"
                class="achievement-icon"
              >
                {{ achievement.icon }}
              </div>
            </div>
            <div class="achievements-text">
              <div
                v-for="(achievement, index) in achievements.slice(0, 3)"
                :key="index"
                class="achievement-name"
              >
                {{ achievement.name }}
              </div>
              <div v-if="achievements.length > 3" class="achievement-more">
                +另外{{ achievements.length - 3 }}个
              </div>
            </div>
            <el-button text class="view-all-btn">
              全部查看
            </el-button>
          </div>

          <!-- 分隔线 -->
          <el-divider />

          <!-- 设置部分 -->
          <div class="sidebar-section settings-section">
            <div class="settings-item">
              <div class="settings-icon">
                👤
              </div>
              <div class="settings-content">
                <div class="settings-title">
                  个人资料
                </div>
                <div class="settings-desc">
                  自定义你的个人资料
                </div>
              </div>
              <el-button size="small" type="primary" class="update-btn">
                更新
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 头像编辑组件 -->
    <AvatarEditor v-model="showAvatarEditor" @success="handleAvatarUpdate" />
  </div>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { Share, Edit } from '@element-plus/icons-vue'
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

  const tabs = [
    { key: 'overview', label: '概述', route: 'profile-overview' },
    { key: 'posts', label: '帖子', route: 'profile-posts' },
    { key: 'comments', label: '评论', route: 'profile-comments' },
    { key: 'saved', label: '已保存', route: 'profile-saved' },
    { key: 'history', label: '历史记录', route: 'profile-history' },
    { key: 'upvoted', label: '已点赞', route: 'profile-upvoted' },
    { key: 'downvoted', label: '已点踩', route: 'profile-downvoted' }
  ]

  // 根据当前路由确定激活的标签
  const activeTab = computed({
    get: () => {
      const routeName = route.name
      const tab = tabs.find(t => t.route === routeName)
      return tab ? tab.key : 'posts'
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

  const achievements = [
    { icon: '🎉', name: '本地社区新人' },
    { icon: '👋', name: '新成员' },
    { icon: '🔍', name: '内容发现家' },
    { icon: '⭐', name: '活跃用户' },
    { icon: '🏆', name: '社区贡献者' }
  ]
</script>

<style scoped>
/* Reddit 风格的个人中心页面 - 支持主题切换 */

.profile-page {
  background: var(--bg-secondary);
  min-height: 100vh;
  padding: 20px;
  transition: background-color 0.3s ease;
}

.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 20px;
}

/* 中央内容区 */
.main-content {
  flex: 1;
  background: var(--card-bg);
  border-radius: 4px;
  overflow: hidden;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--card-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.profile-header {
  background: var(--card-bg);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.profile-avatar-wrapper {
  position: relative;
  cursor: pointer;
  display: inline-block;
}

.profile-avatar {
  border: 3px solid var(--card-bg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

.theme-dark .profile-avatar {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.profile-info {
  flex: 1;
}

.username {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.user-handle {
  font-size: 14px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

/* 标签导航 - Reddit 风格 */
.profile-tabs {
  padding: 0 10px;
  background: var(--card-bg);
  transition: background-color 0.3s ease;
}

/* Element Plus Tabs 样式定制 */
:deep(.el-tabs__header) {
  margin: 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-bg);
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

:deep(.el-tabs__nav-wrap) {
  overflow-x: auto;
}

:deep(.el-tabs__nav) {
  border: none;
}

:deep(.el-tabs__item) {
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  transition: all 0.2s ease;
  border-bottom: 2px solid transparent;
}

:deep(.el-tabs__item:hover) {
  color: var(--text-primary);
  background: var(--bg-hover);
}

:deep(.el-tabs__item.is-active) {
  color: var(--text-primary);
  font-weight: 600;
}

/* Reddit 蓝色链接 - 深色模式下使用浅蓝色 */
.theme-light :deep(.el-tabs__item.is-active) {
  border-bottom-color: #0079d3;
}

.theme-dark :deep(.el-tabs__item.is-active) {
  border-bottom-color: #4fbcff;
}

:deep(.el-tabs__active-bar) {
  display: none;
}

/* 内容区域 */
.content-area {
  background: var(--card-bg);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  transition: background-color 0.3s ease;
}

.posts-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.theme-light .section-header {
  color: #0079d3;
}

.theme-dark .section-header {
  color: #4fbcff;
}

.section-header:hover {
  text-decoration: underline;
}

.eye-icon,
.arrow-icon {
  font-size: 16px;
}

.create-post-btn {
  margin-bottom: 24px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.empty-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
  transition: color 0.3s ease;
}

.update-settings-btn {
  margin-top: 8px;
}

/* 右侧边栏 */
.sidebar {
  width: 320px;
}

.sidebar-container {
  background: var(--card-bg);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--card-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-section {
  position: relative;
}

/* 用户资料部分 */
.sidebar-section:first-child {
  position: relative;
}

.profile-banner {
  height: 100px;
  position: relative;
}

.theme-light .profile-banner {
  background: linear-gradient(135deg, #0079d3 0%, #005ba1 100%);
}

.theme-dark .profile-banner {
  background: linear-gradient(135deg, #1a1a1b 0%, #272729 100%);
}

.profile-banner::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>') no-repeat center;
  background-size: 16px;
  opacity: 0.6;
}

.profile-card-content {
  padding: 16px;
  padding-top: 8px;
}

.card-username {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.share-btn {
  width: 100%;
  margin-bottom: 16px;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.stat-label {
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

/* 成就部分 */
.achievements-section {
  padding: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.achievements-count {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.achievements-list {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.achievement-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: background-color 0.3s ease;
}

.achievements-text {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.6;
  transition: color 0.3s ease;
}

.achievement-name {
  margin-bottom: 4px;
}

.achievement-more {
  margin-top: 4px;
}

.view-all-btn {
  width: 100%;
  font-size: 14px;
  transition: color 0.3s ease, background-color 0.3s ease;
}

.theme-light .view-all-btn {
  color: #0079d3;
}

.theme-dark .view-all-btn {
  color: #4fbcff;
}

.view-all-btn:hover {
  background: var(--bg-hover);
}

/* Element Plus Divider 主题适配 */
:deep(.el-divider) {
  margin: 0;
  border-color: var(--border-color);
  transition: border-color 0.3s ease;
}

/* 设置部分 */
.settings-section {
  padding: 16px;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settings-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.settings-content {
  flex: 1;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  transition: color 0.3s ease;
}

.settings-desc {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.update-btn {
  margin-left: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .profile-container {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .profile-tabs :deep(.el-tabs__nav-wrap) {
    overflow-x: auto;
  }
}
</style>



