<template>
  <div class="profile-page setting-control">
    <div class="profile-container">
      <!-- 中央内容区 -->
      <div class="main-content setting-control">
        <!-- 用户头像和基本信息 -->
        <div class="profile-header">
          <div class="profile-avatar-wrapper">
            <el-avatar :size="80" :src="avatar" class="profile-avatar" />
          </div>
          <div class="profile-info">
            <div class="username">
              {{ store.user.name }}
            </div>
            <div class="user-handle">
              u/{{ store.user.name }}
            </div>
          </div>
        </div>

        <!-- 标签导航 -->
        <div class="profile-tabs">
          <div 
            v-for="tab in tabs" 
            :key="tab.key"
            :class="['tab-item', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="content-area">
          <div v-if="activeTab === 'posts'" class="posts-section">
            <div class="section-header">
              <el-icon class="eye-icon">
                <View />
              </el-icon>
              <span>显示所有帖子</span>
              <el-icon class="arrow-icon">
                <ArrowRight />
              </el-icon>
            </div>
            <div class="create-post-btn">
              <el-button type="primary" :icon="Plus">
                创建帖子
              </el-button>
            </div>
            <div class="empty-state">
              <div class="empty-icon">
                📝
              </div>
              <div class="empty-title">
                你还没有任何帖子
              </div>
              <div class="empty-description">
                在社区中发帖后，帖子将显示在此处。如果你想隐藏帖子，请更新设置。
              </div>
              <el-button type="primary" class="update-settings-btn">
                更新设置
              </el-button>
            </div>
          </div>

          <div v-else-if="activeTab === 'overview'" class="overview-section">
            <div class="empty-state">
              <div class="empty-icon">
                📊
              </div>
              <div class="empty-title">
                概述
              </div>
              <div class="empty-description">
                这里将显示你的活动概览
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">
              📋
            </div>
            <div class="empty-title">
              {{ tabs.find(t => t.key === activeTab)?.label }}
            </div>
            <div class="empty-description">
              暂无内容
            </div>
          </div>
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
                {{ store.user.name }}
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
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useDataStore } from '@/stores/data'
  import { View, ArrowRight, Plus, Share } from '@element-plus/icons-vue'

  const store = useDataStore()
  const avatar = 'https://i.pravatar.cc/120?img=7'
  const activeTab = ref('posts')

  const tabs = [
    { key: 'overview', label: '概述' },
    { key: 'posts', label: '帖子' },
    { key: 'comments', label: '评论' },
    { key: 'saved', label: '已保存' },
    { key: 'history', label: '历史记录' },
    { key: 'hidden', label: '已隐藏' },
    { key: 'upvoted', label: '已点赞' },
    { key: 'downvoted', label: '已点踩' }
  ]

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
}

.profile-avatar {
  border: 3px solid var(--card-bg);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-bg);
  overflow-x: auto;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.tab-item {
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all 0.2s ease;
  font-weight: 500;
}

.tab-item:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
  transition: color 0.3s ease, background-color 0.3s ease;
}

.tab-item.active {
  color: var(--text-primary);
  font-weight: 600;
}

/* Reddit 蓝色链接 - 深色模式下使用浅蓝色 */
.theme-light .tab-item.active {
  border-bottom-color: #0079d3;
}

.theme-dark .tab-item.active {
  border-bottom-color: #4fbcff;
}

/* 内容区域 */
.content-area {
  background: var(--card-bg);
  min-height: 400px;
  padding: 20px;
  transition: background-color 0.3s ease;
}

.posts-section {
  width: 100%;
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

  .profile-tabs {
    overflow-x: auto;
  }
}
</style>



