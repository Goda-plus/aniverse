<template>
  <MainContentLayout>
    <template #content>
      <div class="page">
        <div class="header">
          <div>
            <div class="eyebrow">
              AniVerse 预览
            </div>
            <h1>社交 + 电商 一站式体验</h1>
            <p class="meta">
              结合社区动态、名场面标注、同好匹配与周边交易的前端原型，数据来自本地模拟。
            </p>
          </div>
          <el-tag effect="dark" type="success">
            前端演示版
          </el-tag>
        </div>

        <el-row :gutter="16" class="cards">
          <el-col v-for="stat in stats" :key="stat.title" :md="6" :sm="12" :xs="24">
            <div class="stat card">
              <div class="stat-title">
                {{ stat.title }}
              </div>
              <div class="stat-value">
                {{ stat.value }}
              </div>
              <div class="meta-text">
                {{ stat.desc }}
              </div>
            </div>
          </el-col>
        </el-row>

        <div class="panel card">
          <div class="panel-header">
            <div class="section-title">
              社区动态
            </div>
            <el-button link type="primary" @click="$router.push('/community')">
              查看全部
            </el-button>
          </div>
          <el-row :gutter="12">
            <el-col v-for="post in feed" :key="post.id" :md="12">
              <el-card shadow="hover" class="post">
                <div class="post-header">
                  <el-avatar :src="post.avatar" size="small" />
                  <div class="post-meta">
                    <div>{{ post.author }}</div>
                    <span class="meta-text">{{ post.time }}</span>
                  </div>
                </div>
                <p class="content">
                  {{ post.content }}
                </p>
                <div class="tags">
                  <el-tag v-for="tag in post.tags" :key="tag" size="small">
                    {{ tag }}
                  </el-tag>
                </div>
                <div class="post-actions">
                  <el-button size="small" text :type="post.liked ? 'primary' : 'default'" @click="store.toggleLike(post.id)">
                    <el-icon><Pointer /></el-icon>{{ post.likes }}
                  </el-button>
                  <el-button size="small" text @click="store.toggleStar(post.id)">
                    <el-icon><Star /></el-icon>收藏
                  </el-button>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <div class="panel-grid">
          <div class="panel card">
            <div class="panel-header">
              <div class="section-title">
                名场面标注
              </div>
              <el-button link type="primary" @click="$router.push('/scenes')">
                查看更多
              </el-button>
            </div>
            <el-timeline>
              <el-timeline-item
                v-for="scene in scenes"
                :key="scene.id"
                type="primary"
                :timestamp="scene.position"
              >
                <div class="scene-title">
                  {{ scene.title }}
                </div>
                <div class="meta-text">
                  {{ scene.work }} · {{ scene.dialog }}
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>

          <div class="panel card">
            <div class="panel-header">
              <div class="section-title">
                同好匹配
              </div>
              <el-button link type="primary" @click="$router.push('/match')">
                去结识
              </el-button>
            </div>
            <div class="match-list">
              <div v-for="item in matches" :key="item.id" class="match">
                <el-avatar :src="item.avatar" />
                <div class="match-info">
                  <div>{{ item.name }}</div>
                  <div class="meta-text">
                    {{ item.reason }}
                  </div>
                </div>
                <el-tag type="success">
                  {{ (item.similarity * 100).toFixed(0) }}% 匹配
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <div class="panel card">
          <div class="panel-header">
            <div class="section-title">
              周边 & 众筹
            </div>
            <el-button link type="primary" @click="$router.push('/mall')">
              去商城
            </el-button>
          </div>
          <el-row :gutter="12">
            <el-col v-for="product in products" :key="product.id" :md="12">
              <el-card shadow="hover">
                <div class="product">
                  <img :src="product.cover" alt="" class="cover">
                  <div>
                    <div class="product-name">
                      {{ product.name }}
                    </div>
                    <div class="meta-text">
                      ￥{{ product.price }} · 评分 {{ product.rating }}
                    </div>
                    <div class="tags">
                      <el-tag v-for="tag in product.tags" :key="tag" size="small">
                        {{ tag }}
                      </el-tag>
                    </div>
                    <el-button size="small" type="primary" @click="store.addToCart(product)">
                      加入购物车
                    </el-button>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <div class="sidebar-card">
          <div class="sidebar-title">
            热门社区
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
  import { computed } from 'vue'
  import { useDataStore } from '@/stores/data'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { Pointer, Star, ChatLineRound, PictureRounded, ShoppingCartFull } from '@element-plus/icons-vue'

  const store = useDataStore()
  const feed = computed(() => store.feed.slice(0, 2))
  const scenes = computed(() => store.scenes.slice(0, 3))
  const matches = computed(() => store.matches)
  const products = computed(() => store.products)

  const stats = computed(() => [
    { title: '社区互动', value: `${store.feed.reduce((sum, p) => sum + p.likes, 0)} 喜欢`, desc: '点赞、收藏、评论实时反馈' },
    { title: '名场面条目', value: `${store.scenes.length}`, desc: '结构化标注与检索' },
    { title: '匹配成功率', value: '87%', desc: '标签 + 行为相似度' },
    { title: '商城转化', value: `￥${store.cartTotal.toFixed(2)}`, desc: '购物车与订单闭环' }
  ])
</script>

<style scoped>
.page {
  padding: 0;
  transition: background-color 0.3s ease;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  padding: 12px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

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

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.header h1 {
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.header .meta {
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.eyebrow {
  color: #8b5cf6;
  font-weight: 600;
  font-size: 13px;
}

.cards {
  margin-bottom: 16px;
}

.stat {
  padding: 16px;
}

.stat-title {
  color: var(--text-secondary);
  margin-bottom: 6px;
  transition: color 0.3s ease;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.panel {
  padding: 16px;
  margin-bottom: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.post {
  margin-bottom: 10px;
}

.post-header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}

.post-meta {
  display: flex;
  flex-direction: column;
}

.post-meta > div {
  font-weight: 400;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.content {
  margin: 4px 0 8px;
  color: var(--text-primary);
  font-weight: 400;
  transition: color 0.3s ease;
}

.tags {
  display: flex;
  gap: 6px;
  margin: 6px 0 10px;
  flex-wrap: wrap;
}

.post-actions {
  display: flex;
  gap: 10px;
}

.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.scene-title {
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.product-name {
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match {
  display: flex;
  align-items: center;
  gap: 10px;
}

.match-info {
  flex: 1;
}

.product {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  align-items: center;
}

.cover {
  width: 100%;
  border-radius: 8px;
  object-fit: cover;
}

.product-name {
  font-weight: 600;
}
</style>



