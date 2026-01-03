<template>
  <MainContentLayout>
    <template #content>
      <div class="page-content">
        <div class="post-header-section">
          <div class="subreddit-info">
            <div class="subreddit-icon">
              <el-icon><ChatLineRound /></el-icon>
            </div>
            <div class="subreddit-details">
              <div class="subreddit-name">
                r/社区动态
              </div>
              <div class="post-meta-info">
                <span>4小时前</span>
                <span class="dot-separator">·</span>
                <span>目前在 AniVerse 上很热门</span>
              </div>
            </div>
          </div>
          <el-button type="primary" class="join-btn">
            加入
          </el-button>
        </div>

        <div class="posts-list">
          <div v-for="post in store.feed" :key="post.id" class="post-card">
            <div class="post-voting">
              <el-button text class="vote-btn upvote">
                <el-icon><ArrowUp /></el-icon>
              </el-button>
              <span class="vote-count">{{ post.likes }}</span>
              <el-button text class="vote-btn downvote">
                <el-icon><ArrowDown /></el-icon>
              </el-button>
            </div>
            <div class="post-content">
              <div class="post-header">
                <el-avatar :src="post.avatar" size="small" />
                <div class="post-meta">
                  <span class="author-name">{{ post.author }}</span>
                  <span class="meta-text">{{ post.time }}</span>
                </div>
                <el-tag type="info" size="small" effect="plain" class="post-tag">
                  {{ post.tags[0] }}
                </el-tag>
              </div>

              <h3 class="post-title">
                {{ post.content }}
              </h3>

              <div v-if="post.images?.length" class="post-images">
                <img v-for="img in post.images" :key="img" :src="img" alt="">
              </div>

              <div class="post-actions">
                <el-button text size="small" class="action-btn">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>{{ post.comments }} 评论</span>
                </el-button>
                <el-button text size="small" class="action-btn">
                  <el-icon><Share /></el-icon>
                  <span>共享</span>
                </el-button>
                <el-button text size="small" class="action-btn" :type="post.starred ? 'warning' : 'default'" @click="store.toggleStar(post.id)">
                  <el-icon><Star /></el-icon>
                  <span>{{ post.starred ? '已收藏' : '收藏' }}</span>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <div class="sidebar-card">
          <div class="sidebar-title">
            热门社区
          </div>
          <div v-for="community in popularCommunities" :key="community.name" class="community-item">
            <div class="community-icon">
              <el-icon><component :is="community.icon" /></el-icon>
            </div>
            <div class="community-info">
              <div class="community-name">
                {{ community.name }}
              </div>
              <div class="community-members">
                {{ community.members }} 位成员
              </div>
            </div>
          </div>
          <el-button text class="view-more-btn">
            查看更多内容
          </el-button>
        </div>

        <div class="sidebar-card">
          <div class="sidebar-title">
            热点话题
          </div>
          <div class="tags-list">
            <el-tag v-for="tag in hotTags" :key="tag" class="tag-item" effect="dark">
              {{ tag }}
            </el-tag>
          </div>
        </div>

        <div class="sidebar-card">
          <div class="sidebar-title">
            我的收藏
          </div>
          <div v-if="store.likedPosts.length === 0" class="empty-state">
            暂无收藏
          </div>
          <div v-else class="favorites-list">
            <div v-for="item in store.likedPosts" :key="item.id" class="favorite-item">
              <div class="favorite-content">
                {{ item.content }}
              </div>
              <span class="meta-text">{{ item.author }} · {{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { useDataStore } from '@/stores/data'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { ArrowUp, ArrowDown, ChatDotRound, Share, Star, ChatLineRound, PictureRounded, ShoppingCartFull, Coin } from '@element-plus/icons-vue'

  const store = useDataStore()
  const hotTags = ['#热血机甲', '#夏日祭', '#冷门佳作安利', '#COS 情报', '#周边鉴定']
  
  const popularCommunities = [
    { name: 'r/社区动态', members: '7,117,328', icon: ChatLineRound },
    { name: 'r/名场面', members: '5,598,208', icon: PictureRounded },
    { name: 'r/周边商城', members: '5,511,765', icon: ShoppingCartFull },
    { name: 'r/众筹', members: '744,425', icon: Coin }
  ]
</script>

<style scoped>
.page-content {
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.post-header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.subreddit-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.subreddit-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4500, #ff6314);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 20px;
}

.subreddit-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.subreddit-name {
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.post-meta-info {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.3s ease;
}

.dot-separator {
  margin: 0 4px;
}

.join-btn {
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff;
  padding: 4px 16px;
  font-size: 14px;
  font-weight: 700;
}

.join-btn:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.posts-list {
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.post-card {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s, border-color 0.3s ease;
}

.post-card:hover {
  background: var(--bg-hover);
}

.post-voting {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
  gap: 4px;
}

.vote-btn {
  color: var(--text-secondary);
  padding: 2px;
  transition: color 0.3s ease;
}

.vote-btn:hover {
  color: #ff4500;
  background: var(--bg-hover);
}

.vote-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 24px;
  text-align: center;
  transition: color 0.3s ease;
}

.post-content {
  flex: 1;
  padding: 4px 8px;
}

.post-content * {
  font-weight: 400;
}

.post-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.post-meta {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

.author-name {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.post-tag {
  margin-left: auto;
}

.post-title {
  font-size: 18px;
  font-weight: 400;
  color: var(--text-primary);
  margin: 8px 0;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  margin: 12px 0;
}

.post-images img {
  width: 100%;
  border-radius: 4px;
  object-fit: cover;
  max-height: 400px;
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  color: var(--text-secondary);
  font-size: 12px;
  transition: color 0.3s ease, background-color 0.3s ease;
}

.action-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* 右侧栏样式 */
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
  padding: 8px 0;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
  padding-left: 8px;
  padding-right: 8px;
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

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  margin: 0;
  font-size: 12px;
}

.empty-state {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  padding: 16px 0;
  transition: color 0.3s ease;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-item {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-tertiary);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.favorite-content {
  font-size: 12px;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.meta-text {
  color: var(--text-secondary);
  font-size: 11px;
  transition: color 0.3s ease;
}
</style>



