<template>
  <MainContentLayout :show-bottom-bar="showPagination">
    <template #content>
      <div class="favorite-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">
            收藏夹
          </h1>
        </div>

        <!-- 搜索栏 -->
        <div class="search-section">
          <el-input
            v-model="searchKeyword"
            placeholder="过滤你的收藏"
            class="search-input"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <!-- 内容列表 -->
        <div class="content-section">
          <transition name="fade" mode="out-in">
            <div v-if="loading" key="loading" class="loading-wrapper">
              <el-skeleton :rows="5" animated />
            </div>
            <!-- 帖子列表 -->
            <div v-else-if="activeCategory === 'post'" key="post" class="posts-list">
              <div v-if="filteredPosts.length === 0" class="empty-state">
                <el-empty description="暂无收藏的帖子" />
              </div>
              <div v-else class="favorite-items-list">
                <div
                  v-for="post in filteredPosts"
                  :key="post.id"
                  class="favorite-item-card"
                  @click="goToPost(post)"
                >
                  <div class="favorite-item-thumbnail">
                    <img
                      v-if="post.image"
                      :src="post.image"
                      :alt="post.title"
                    >
                    <div v-else class="favorite-item-placeholder">
                      <el-icon><Document /></el-icon>
                    </div>
                  </div>
                  <div class="favorite-item-content">
                    <h3 class="favorite-item-title">
                      {{ post.title }}
                    </h3>
                    <div class="favorite-item-tags">
                      <span class="favorite-tag">帖子</span>
                      <span v-if="post.subreddit" class="favorite-tag">r/{{ post.subreddit }}</span>
                    </div>
                  </div>
                  <div class="favorite-item-right">
                    <div class="favorite-item-score">
                      {{ formatVoteCount(post.score || 0) }}
                    </div>
                    <div class="favorite-item-meta">
                      <span>帖子</span>
                      <span>已收藏</span>
                    </div>
                    <el-button
                      text
                      class="favorite-item-btn"
                      @click.stop="handleUnfavorite(post, 'post')"
                    >
                      <el-icon><Star /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 社区列表 -->
            <div v-else-if="activeCategory === 'subreddit'" key="subreddit" class="communities-list">
              <div v-if="filteredCommunities.length === 0" class="empty-state">
                <el-empty description="暂无收藏的社区" />
              </div>
              <div v-else class="favorite-items-list">
                <div
                  v-for="community in filteredCommunities"
                  :key="community.id"
                  class="favorite-item-card"
                  @click="goToCommunity(community)"
                >
                  <div class="favorite-item-thumbnail">
                    <img
                      v-if="community.image_url"
                      :src="community.image_url"
                      :alt="community.name"
                    >
                    <div v-else class="favorite-item-placeholder">
                      <el-icon><ChatLineRound /></el-icon>
                    </div>
                  </div>
                  <div class="favorite-item-content">
                    <h3 class="favorite-item-title">
                      r/{{ community.name }}
                    </h3>
                    <div class="favorite-item-tags">
                      <span class="favorite-tag">社区</span>
                      <span class="favorite-tag">{{ formatMemberCount(community.member_count) }} 成员</span>
                    </div>
                  </div>
                  <div class="favorite-item-right">
                    <div class="favorite-item-score">
                      {{ formatMemberCount(community.member_count) }}
                    </div>
                    <div class="favorite-item-meta">
                      <span>社区</span>
                      <span>已收藏</span>
                    </div>
                    <el-button
                      text
                      class="favorite-item-btn"
                      @click.stop="handleUnfavorite(community, 'subreddit')"
                    >
                      <el-icon><Star /></el-icon>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 动漫列表 -->
            <div v-else-if="activeCategory === 'media'" key="media" class="media-list">
              <div v-if="filteredMedia.length === 0" class="empty-state">
                <el-empty description="暂无收藏的动漫" />
              </div>
              <MediaList
                v-else
                :items="filteredMedia"
                layout="grid"
              />
            </div>
          </transition>
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <div class="sidebar-card">
          <div class="sidebar-title">
            分类
          </div>
          <div class="category-list">
            <div
              v-for="category in categories"
              :key="category.key"
              class="category-item"
              :class="{ active: activeCategory === category.key }"
              @click="switchCategory(category.key)"
            >
              <el-icon><component :is="category.icon" /></el-icon>
              <span>{{ category.label }}</span>
              <span class="count">({{ getCategoryCount(category.key) }})</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #bottom>
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          :small="false"
          :disabled="loading"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Search, Star, ChatLineRound, Document, VideoPlay } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import MediaList from '@/components/MediaList.vue'
  import { getFavorite } from '@/axios/favorite'
  import { toggleFavorite } from '@/axios/favorite'

  const router = useRouter()

  // 分类列表
  const categories = [
    { key: 'post', label: '帖子', icon: Document },
    { key: 'subreddit', label: '社区', icon: ChatLineRound },
    { key: 'media', label: '动漫', icon: VideoPlay }
  ]

  // 当前激活的分类
  const activeCategory = ref('post')

  // 数据列表
  const posts = ref([])
  const communities = ref([])
  const media = ref([])

  // 搜索关键词
  const searchKeyword = ref('')

  // 加载状态
  const loading = ref(false)

  // 分页相关
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)
  const showPagination = ref(true)

  // 切换分类
  const switchCategory = async (category) => {
    if (activeCategory.value === category) return
    // 先设置 loading，然后切换分类，最后加载数据
    loading.value = true
    // 使用 nextTick 确保 DOM 更新后再切换，让过渡动画更流畅
    await new Promise(resolve => setTimeout(resolve, 50))
    activeCategory.value = category
    searchKeyword.value = ''
    currentPage.value = 1
    await loadFavorites()
  }

  // 加载收藏数据
  const loadFavorites = async () => {
    if (!loading.value) {
      loading.value = true
    }
    try {
      const response = await getFavorite({ 
        target_type: activeCategory.value,
        page: currentPage.value,
        page_size: pageSize.value
      })
      console.log('收藏数据响应:', response) // 调试日志
      if (response.code === 200) {
        const items = response.data?.items || []
        const pagination = response.data?.pagination || {}
        console.log('收藏项目:', items) // 调试日志
        if (activeCategory.value === 'post') {
          posts.value = items
        } else if (activeCategory.value === 'subreddit') {
          communities.value = items
        } else if (activeCategory.value === 'media') {
          media.value = items
        }
        // 更新分页信息
        total.value = pagination.total || items.length
        // 根据总数决定是否显示分页器（只有当总数大于每页大小时才显示）
        showPagination.value = total.value > pageSize.value
      } else {
        console.error('API返回错误:', response)
        ElMessage.error(response.message || '加载收藏失败')
        total.value = 0
        showPagination.value = false
      }
    } catch (error) {
      console.error('加载收藏失败:', error)
      console.error('错误详情:', error.response)
      ElMessage.error(error.response?.message || '加载收藏失败')
      total.value = 0
      showPagination.value = false
    } finally {
      loading.value = false
    }
  }

  // 获取分类数量
  const getCategoryCount = (category) => {
    // 返回总数而不是当前页的数量
    if (category === activeCategory.value) {
      return total.value
    }
    // 如果当前分类没有加载，返回0
    return 0
  }

  // 处理分页大小变化
  const handleSizeChange = (newSize) => {
    pageSize.value = newSize
    currentPage.value = 1
    loadFavorites()
  }

  // 处理当前页变化
  const handleCurrentChange = (newPage) => {
    currentPage.value = newPage
    loadFavorites()
  }

  // 过滤后的数据
  const filteredPosts = computed(() => {
    if (!searchKeyword.value) return posts.value
    const keyword = searchKeyword.value.toLowerCase()
    return posts.value.filter(post => {
      const title = (post.title || post.content_text || '').toLowerCase()
      const content = (post.content_text || post.content_html || '').toLowerCase()
      return title.includes(keyword) || content.includes(keyword)
    })
  })

  const filteredCommunities = computed(() => {
    if (!searchKeyword.value) return communities.value
    const keyword = searchKeyword.value.toLowerCase()
    return communities.value.filter(community => {
      const name = (community.name || '').toLowerCase()
      const desc = (community.description || '').toLowerCase()
      return name.includes(keyword) || desc.includes(keyword)
    })
  })

  const filteredMedia = computed(() => {
    if (!searchKeyword.value) return media.value
    const keyword = searchKeyword.value.toLowerCase()
    return media.value.filter(item => {
      const title = (item.title || item.title_native || item.title_english || '').toLowerCase()
      const desc = (item.description || '').toLowerCase()
      return title.includes(keyword) || desc.includes(keyword)
    })
  })

  // 搜索处理
  const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
  }

  // 取消收藏
  const handleUnfavorite = async (item, type) => {
    try {
      const response = await toggleFavorite({
        target_type: type,
        target_id: item.id
      })
      if (response.code === 200) {
        ElMessage.success('取消收藏成功')
        await loadFavorites()
      }
    } catch (error) {
      console.error('取消收藏失败:', error)
      ElMessage.error('取消收藏失败')
    }
  }

  // 跳转到社区
  const goToCommunity = (community) => {
    router.push(`/r/${community.name}`)
  }

  // 跳转到帖子
  const goToPost = (post) => {
    if (post.subreddit) {
      router.push(`/r/${post.subreddit}/post/${post.id}`)
    } else {
      router.push(`/post/${post.id}`)
    }
  }

  // 格式化成员数
  const formatMemberCount = (count) => {
    if (!count) return '0'
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万'
    }
    return count.toString()
  }

  // 格式化投票数
  const formatVoteCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k'
    }
    return count.toString()
  }

  // 初始化
  onMounted(() => {
    loadFavorites()
  })
</script>

<style scoped>
.favorite-page {
  width: 100%;
  max-height:100vh ;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.search-section {
  margin-bottom: 24px;
}

.search-input {
  max-width: 600px;
}

.content-section {
  min-height: 400px;
  position: relative;
}

.loading-wrapper {
  padding: 20px;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 帖子列表样式 */
.posts-list {
  width: 100%;
}

/* 社区列表样式 */
.communities-list {
  width: 100%;
}

/* 收藏项目列表 */
.favorite-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.favorite-item-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.favorite-item-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.favorite-item-thumbnail {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.favorite-item-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.favorite-item-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 32px;
  background: var(--bg-secondary);
}

.favorite-item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.favorite-item-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.favorite-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.favorite-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #0ea5e9;
  color: #e0f2fe;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.favorite-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 100px;
  flex-shrink: 0;
}

.favorite-item-score {
  font-size: 16px;
  font-weight: 700;
  color: #4ade80;
}

.favorite-item-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 12px;
  color: var(--text-secondary);
}

.favorite-item-btn {
  color: #fbbf24;
  padding: 4px;
  margin-top: 4px;
}

.favorite-item-btn:hover {
  color: #f59e0b;
}

/* 动漫列表样式 */
.media-list {
  width: 100%;
}

/* 空状态 */
.empty-state {
  padding: 60px 20px;
  text-align: center;
}

/* 侧边栏样式 */
.sidebar-content {
  position: sticky;
  top: 20px;
}

.sidebar-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
  height: calc(95vh - 68px);
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  font-size: 14px;
}

.category-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.category-item.active {
  background: var(--primary);
  color: white;
}

.category-item .count {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.7;
}

.category-item.active .count {
  opacity: 1;
}

/* 分页器样式 */
.pagination-container {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}
</style>

