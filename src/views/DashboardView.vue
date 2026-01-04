<template>
  <MainContentLayout>
    <template #content>
      <div class="page">
        <!-- 顶部名场面滚动图 -->
        <div class="scenes-carousel-section">
          <div class="scenes-carousel-wrapper">
            <el-button 
              class="carousel-nav-btn prev-btn" 
              circle 
              :disabled="currentSceneIndex === 0"
              @click="prevScene"
            >
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <div class="scenes-carousel-container">
              <div 
                class="scenes-carousel-track" 
                :style="{ transform: `translateX(-${currentSceneIndex * 100}%)` }"
              >
                <div 
                  v-for="scene in scenes" 
                  :key="scene.id" 
                  class="scene-carousel-item"
                >
                  <div class="scene-carousel-image" :style="{ backgroundImage: `url(${scene.cover})` }">
                    <div class="scene-carousel-overlay">
                      <div class="scene-carousel-content">
                        <h2 class="scene-carousel-title">
                          {{ scene.title }}
                        </h2>
                        <p class="scene-carousel-work">
                          {{ scene.work }} · {{ scene.position }}
                        </p>
                        <p class="scene-carousel-dialog">
                          {{ scene.dialog }}
                        </p>
                        <div class="scene-carousel-tags">
                          <el-tag v-for="tag in scene.tags" :key="tag" size="small" type="info">
                            {{ tag }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <el-button 
              class="carousel-nav-btn next-btn" 
              circle 
              :disabled="currentSceneIndex >= scenes.length - 1"
              @click="nextScene"
            >
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="carousel-indicators">
            <div 
              v-for="(scene, index) in scenes" 
              :key="scene.id"
              class="indicator-dot"
              :class="{ active: index === currentSceneIndex }"
              @click="currentSceneIndex = index"
            />
          </div>
        </div>

        <!-- 主要内容区域 -->
        <div class="main-content">
          <!-- 主要模块 -->
          <div class="content-column">
            <!-- 名场面标注模块 -->
            <div class="module-card">
              <div class="module-header">
                <h2 class="module-title">
                  名场面标注
                </h2>
                <el-button link type="primary" @click="$router.push('/scenes')">
                  查看更多 >
                </el-button>
              </div>
              <div class="scenes-list">
                <div v-for="scene in scenes" :key="scene.id" class="scene-item">
                  <div class="scene-content">
                    <!-- 头部信息 -->
                    <div class="scene-header">
                      <span class="scene-subreddit">r/{{ scene.work }}</span>
                      <span class="scene-separator">·</span>
                      <span class="scene-time">{{ scene.time || '2小时前' }}</span>
                    </div>
                    
                    <!-- 标题 -->
                    <h3 class="scene-title">
                      {{ scene.title }}
                    </h3>
                    
                    <!-- 缩略图和内容 -->
                    <div class="scene-body">
                      <div class="scene-cover">
                        <img :src="scene.cover" :alt="scene.title">
                      </div>
                      <div class="scene-info">
                        <p class="scene-dialog">
                          {{ scene.dialog }}
                        </p>
                        <div class="scene-meta">
                          <span class="scene-work">{{ scene.work }}</span>
                          <span class="scene-separator">·</span>
                          <span class="scene-position">{{ scene.position }}</span>
                        </div>
                        <div class="scene-tags">
                          <el-tag v-for="tag in scene.tags" :key="tag" size="small" type="info">
                            {{ tag }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 周边商城模块 -->
            <div class="module-card">
              <div class="module-header">
                <h2 class="module-title">
                  周边商城
                </h2>
                <el-button link type="primary" @click="$router.push('/mall')">
                  去商城 >
                </el-button>
              </div>
              <div class="products-grid">
                <div v-for="product in products" :key="product.id" class="product-item">
                  <div class="product-cover">
                    <img :src="product.cover" :alt="product.name">
                  </div>
                  <div class="product-info">
                    <h3 class="product-name">
                      {{ product.name }}
                    </h3>
                    <div class="product-price">
                      ￥{{ product.price }}
                    </div>
                    <div class="product-rating">
                      评分 {{ product.rating }}
                    </div>
                    <div class="product-tags">
                      <el-tag v-for="tag in product.tags" :key="tag" size="small">
                        {{ tag }}
                      </el-tag>
                    </div>
                    <el-button size="small" type="primary" @click="store.addToCart(product)">
                      加入购物车
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 创意周边众筹模块（单独一行，但保持左右布局结构） -->
            <div class="two-column-layout">
              <div class="left-column-item full-width">
                <div class="module-card">
                  <div class="module-header">
                    <h2 class="module-title">
                      创意周边众筹
                    </h2>
                    <el-button link type="primary" @click="$router.push('/mall')">
                      查看更多 >
                    </el-button>
                  </div>
                  <div class="crowds-list">
                    <div v-for="crowd in crowds" :key="crowd.id" class="crowd-item">
                      <div class="crowd-cover">
                        <img :src="crowd.cover" :alt="crowd.title">
                      </div>
                      <div class="crowd-info">
                        <h3 class="crowd-title">
                          {{ crowd.title }}
                        </h3>
                        <div class="crowd-progress">
                          <el-progress 
                            :percentage="(crowd.raised / crowd.goal * 100).toFixed(0)" 
                            :stroke-width="8"
                            :show-text="false"
                          />
                          <div class="crowd-stats">
                            <span>已筹 ￥{{ formatNumber(crowd.raised) }} / 目标 ￥{{ formatNumber(crowd.goal) }}</span>
                            <span>{{ crowd.supporters }} 人支持 · 剩余 {{ crowd.daysLeft }} 天</span>
                          </div>
                        </div>
                        <div class="crowd-rewards">
                          <el-tag v-for="reward in crowd.rewards" :key="reward.name" size="small" class="reward-tag">
                            {{ reward.name }} ￥{{ reward.amount }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 最新动态 -->
        <div class="sidebar-card">
          <div class="sidebar-header">
            <h2 class="sidebar-title">
              最新动态
            </h2>
            <el-button link type="primary">
              查看更多 >
            </el-button>
          </div>
          <div class="activity-list">
            <div v-for="activity in activities" :key="activity.id" class="activity-item">
              <el-avatar :src="activity.avatar" :size="32" />
              <div class="activity-content">
                <div class="activity-text">
                  <span class="activity-user">{{ activity.user }}</span>
                  <span class="activity-action">{{ activity.action }}</span>
                </div>
                <div class="activity-meta">
                  <el-tag v-if="activity.tag" size="small" class="activity-tag">
                    {{ activity.tag }}
                  </el-tag>
                  <span class="activity-time">{{ activity.time }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 同好匹配 -->
        <div class="sidebar-card">
          <div class="sidebar-header">
            <h2 class="sidebar-title">
              同好匹配
            </h2>
            <el-button link type="primary" @click="$router.push('/match')">
              去结识 >
            </el-button>
          </div>
          <div class="matches-list">
            <div v-for="item in matches" :key="item.id" class="match-item">
              <el-avatar :src="item.avatar" :size="48" />
              <div class="match-info">
                <div class="match-name">
                  {{ item.name }}
                </div>
                <div class="match-reason">
                  {{ item.reason }}
                </div>
              </div>
              <el-tag type="success" class="match-tag">
                {{ (item.similarity * 100).toFixed(0) }}% 匹配
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 热门社区 -->
        <div class="sidebar-card">
          <div class="sidebar-header">
            <h2 class="sidebar-title">
              热门社区
            </h2>
          </div>
          <div class="community-item">
            <div class="community-icon">
              <el-icon><ChatLineRound /></el-icon>
            </div>
            <div class="community-info">
              <div class="community-name">
                r/社区动态
              </div>
              <div class="community-members">
                7,117,328 位成员
              </div>
            </div>
          </div>
          <div class="community-item">
            <div class="community-icon">
              <el-icon><PictureRounded /></el-icon>
            </div>
            <div class="community-info">
              <div class="community-name">
                r/名场面
              </div>
              <div class="community-members">
                5,598,208 位成员
              </div>
            </div>
          </div>
          <div class="community-item">
            <div class="community-icon">
              <el-icon><ShoppingCartFull /></el-icon>
            </div>
            <div class="community-info">
              <div class="community-name">
                r/周边商城
              </div>
              <div class="community-members">
                5,511,765 位成员
              </div>
            </div>
          </div>
          <el-button text class="view-more-btn">
            查看更多内容
          </el-button>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { computed, ref } from 'vue'
  import { useDataStore } from '@/stores/data'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { ChatLineRound, PictureRounded, ShoppingCartFull, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'

  const store = useDataStore()
  const scenes = computed(() => store.scenes)
  const matches = computed(() => store.matches)
  const products = computed(() => store.products)
  const crowds = computed(() => store.crowds)

  // 名场面滚动图控制
  const currentSceneIndex = ref(0)
  
  const prevScene = () => {
    if (currentSceneIndex.value > 0) {
      currentSceneIndex.value--
    }
  }
  
  const nextScene = () => {
    if (currentSceneIndex.value < scenes.value.length - 1) {
      currentSceneIndex.value++
    }
  }

  // 生成最新动态数据
  const activities = computed(() => [
    {
      id: 1,
      user: 'shshouse',
      avatar: 'https://i.pravatar.cc/80?img=11',
      action: '在《近月少女的礼仪》发布了下载资源',
      tag: 'Galgame 资源',
      time: '53 分钟前'
    },
    {
      id: 2,
      user: 'dqjj',
      avatar: 'https://i.pravatar.cc/80?img=16',
      action: '回复了话题',
      tag: null,
      time: '1 小时前'
    },
    {
      id: 3,
      user: 'shshouse',
      avatar: 'https://i.pravatar.cc/80?img=11',
      action: '在《幸运草的约定|四叶草的约定 | Clover Day\'s》发布了下载资源',
      tag: 'Galgame 资源',
      time: '1 小时前'
    },
    {
      id: 4,
      user: '大伊兜子',
      avatar: 'https://i.pravatar.cc/80?img=19',
      action: '回复了话题',
      tag: null,
      time: '2 小时前'
    }
  ])

  // 格式化数字
  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }
</script>

<style scoped>
.page {
  padding: 0;
  transition: background-color 0.3s ease;
}

/* 名场面滚动图区域 */
.scenes-carousel-section {
  margin-bottom: 24px;
}

.scenes-carousel-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.scenes-carousel-container {
  flex: 1;
  overflow: hidden;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.scenes-carousel-track {
  display: flex;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.scene-carousel-item {
  min-width: 100%;
  height: 400px;
  position: relative;
}

.scene-carousel-image {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

.scene-carousel-image::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.7) 100%);
}

.scene-carousel-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px;
  z-index: 1;
}

.scene-carousel-content {
  max-width: 800px;
}

.scene-carousel-title {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 12px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.scene-carousel-work {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 12px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.scene-carousel-dialog {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.6;
  margin-bottom: 16px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.scene-carousel-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.carousel-nav-btn {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.carousel-nav-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.carousel-nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator-dot.active {
  width: 24px;
  border-radius: 4px;
  background: var(--primary);
}

/* 主要内容区域 */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 左右布局 */
.two-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.left-column-item {
  display: flex;
  flex-direction: column;
}

.left-column-item.full-width {
  grid-column: 1 / -1;
}

/* 模块卡片 */
.module-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 20px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
  transition: border-color 0.3s ease;
}

.module-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

/* 名场面列表 */
.scenes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 通用样式 */
.scene-item {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  transition: border-color 0.2s ease;
  overflow: hidden;
}

.scene-item:hover {
  border-color: var(--text-secondary);
}

/* 内容区域 */
.scene-content {
  flex: 1;
  padding: 12px;
  min-width: 0;
}

.scenes-list .scene-content {
  padding: 16px;
}

/* 头部信息 */
.scene-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.scene-subreddit {
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
}

.scene-subreddit:hover {
  text-decoration: underline;
}

.scene-separator {
  color: var(--text-secondary);
}

.scene-time {
  color: var(--text-secondary);
}

/* 标题 */
.scene-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 4px 0 8px 0;
  line-height: 1.4;
  cursor: pointer;
}

.scene-title:hover {
  color: var(--primary);
}

.scenes-list .scene-title {
  font-size: 18px;
  margin: 4px 0 8px 0;
}

/* 内容主体 */
.scene-body {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.scene-cover {
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  width: 140px;
  height: 105px;
}

.scene-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.scene-info {
  flex: 1;
  min-width: 0;
}

.scene-dialog {
  font-size: 14px;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.scene-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.scene-work {
  font-weight: 500;
}

.scene-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 场景项样式 */
.scenes-list .scene-item {
  border-radius: 4px;
  margin-bottom: 8px;
}

/* 匹配列表 */
.matches-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.match-item:hover {
  background: var(--bg-hover);
}

.match-info {
  flex: 1;
}

.match-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.match-reason {
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.match-tag {
  flex-shrink: 0;
}

/* 商品网格 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.product-item {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.product-item:hover {
  background: var(--bg-hover);
  transform: translateY(-2px);
}

.product-cover {
  width: 100%;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.product-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.product-price {
  font-size: 20px;
  font-weight: 700;
  color: #ff6b6b;
}

.product-rating {
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.product-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 众筹列表 */
.crowds-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.crowd-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.crowd-item:hover {
  background: var(--bg-hover);
}

.crowd-cover {
  width: 140px;
  height: 100px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
}

.crowd-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.crowd-info {
  flex: 1;
}

.crowd-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
  transition: color 0.3s ease;
}

.crowd-progress {
  margin-bottom: 12px;
}

.crowd-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  transition: color 0.3s ease;
}

.crowd-rewards {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.reward-tag {
  margin: 0;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
  transition: border-color 0.3s ease;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

/* 活动列表 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.activity-item:hover {
  background: var(--bg-hover);
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 6px;
  transition: color 0.3s ease;
}

.activity-user {
  font-weight: 600;
  color: var(--primary);
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-tag {
  margin: 0;
}

.activity-time {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

/* 社区项 */
.community-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
}

.community-item:hover {
  background: var(--bg-hover);
}

.community-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 16px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.community-info {
  flex: 1;
}

.community-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.community-members {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.view-more-btn {
  width: 100%;
  margin-top: 8px;
  color: #ff4500;
  font-size: 12px;
  font-weight: 600;
}

.view-more-btn:hover {
  background: var(--bg-hover);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>



