<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="browse-communities-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">
            浏览社区
          </h1>
        </div>

        <!-- 分类筛选 -->
        <div class="categories-section">
          <div class="categories-label">
            分类
          </div>
          <div class="categories-scroll-wrapper">
            <el-button
              :disabled="!canScrollLeft"
              class="scroll-btn scroll-btn-left"
              circle
              @click="scrollCategories('left')"
            >
              <el-icon><ArrowLeft /></el-icon>
            </el-button>
            <div ref="categoriesScrollRef" class="categories-scroll">
              <div class="categories-list">
                <el-button
                  v-for="genre in genres"
                  :key="genre.id"
                  :type="selectedGenreId === genre.id ? 'primary' : 'default'"
                  :plain="selectedGenreId !== genre.id"
                  class="category-btn"
                  @click="selectGenre(genre.id)"
                >
                  {{ genre.ch_name }}
                </el-button>
              </div>
            </div>
            <el-button
              :disabled="!canScrollRight"
              class="scroll-btn scroll-btn-right"
              circle
              @click="scrollCategories('right')"
            >
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 为你推荐 -->
        <div v-if="!selectedGenreId && recommendedCommunities.length > 0" class="section">
          <h2 class="section-title">
            为你推荐
          </h2>
          <div v-loading="recommendedLoading" class="communities-grid">
            <div
              v-for="community in recommendedCommunities"
              :key="community.id"
              class="community-card"
            >
              <div class="community-icon-wrapper">
                <div class="community-icon">
                  <el-avatar
                    :size="48"
                    :src="community.image_url"
                  />
                </div>
                <div class="community-info-wrapper">
                  <h3 class="community-name" @click="goToCommunity(community)">
                    r/{{ community.name }}
                  </h3>
                  <div class="community-meta">
                    <span class="community-visitors">
                      {{ formatMemberCount(community.member_count) }} 位成员
                    </span>
                  </div>
                </div>
                <div class="community-actions">
                  <el-button
                    :type="community.is_joined ? 'default' : 'primary'"
                    size="small"
                    @click="toggleJoin(community)"
                  >
                    {{ community.is_joined ? '已加入' : '加入' }}
                  </el-button>
                </div>
              </div>
              <div class="community-info">
                <p class="community-description">
                  {{ community.description || '暂无描述' }}
                </p>
              </div>
            </div>
          </div>
          <el-button
            v-if="recommendedCommunities.length > 0"
            link
            type="primary"
            class="show-more-btn"
            @click="loadMoreRecommended"
          >
            显示更多推荐
          </el-button>
        </div>

        <!-- 分类推荐 -->
        <div v-if="selectedGenreId && genreCommunities.length > 0" class="section">
          <h2 class="section-title">
            {{ selectedGenreName }} 推荐
          </h2>
          <div v-loading="genreLoading" class="communities-grid">
            <div
              v-for="community in genreCommunities"
              :key="community.id"
              class="community-card"
            >
              <div class="community-icon-wrapper">
                <div class="community-icon">
                  <el-image
                    style="width: 48px; height: 48px; border-radius: 50%"
                    :src="community.image_url"
                    :fit="contain"
                  />
                </div>
                <div class="community-info-wrapper">
                  <h3 class="community-name" @click="goToCommunity(community)">
                    r/{{ community.name }}
                  </h3>
                  <div class="community-meta">
                    <span class="community-visitors">
                      {{ formatMemberCount(community.member_count) }} 位成员
                    </span>
                  </div>
                </div>
                <div class="community-actions">
                  <el-button
                    :type="community.is_joined ? 'default' : 'primary'"
                    size="small"
                    @click="toggleJoin(community)"
                  >
                    {{ community.is_joined ? '已加入' : '加入' }}
                  </el-button>
                </div>
              </div>
              <div class="community-info">
                <p class="community-description">
                  {{ community.description || '暂无描述' }}
                </p>
              </div>
            </div>
          </div>
          <el-button
            v-if="genreCommunities.length > 0 && hasMoreGenreCommunities"
            link
            type="primary"
            class="show-more-btn"
            @click="loadMoreGenreCommunities"
          >
            显示更多
          </el-button>
        </div>

        <!-- 最受欢迎 -->
        <div v-if="!selectedGenreId && popularCommunities.length > 0" class="section">
          <h2 class="section-title">
            最受欢迎
          </h2>
          <div v-loading="popularLoading" class="communities-grid">
            <div
              v-for="community in popularCommunities"
              :key="community.id"
              class="community-card"
            >
              <div class="community-icon-wrapper">
                <div class="community-icon">
                  <el-avatar
                    :size="48"
                    :src="community.image_url"
                  />
                </div>
                <div class="community-info-wrapper">
                  <h3 class="community-name" @click="goToCommunity(community)">
                    r/{{ community.name }}
                  </h3>
                  <div class="community-meta">
                    <span class="community-visitors">
                      {{ formatMemberCount(community.member_count) }} 位成员
                    </span>
                  </div>
                </div>
                <div class="community-actions">
                  <el-button
                    :type="community.is_joined ? 'default' : 'primary'"
                    size="small"
                    @click="toggleJoin(community)"
                  >
                    {{ community.is_joined ? '已加入' : '加入' }}
                  </el-button>
                </div>
              </div>
              <div class="community-info">
                <p class="community-description">
                  {{ community.description || '暂无描述' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #sidebar>
      <div class="sidebar-container">
        <div class="sidebar-title">
          <h2>分类</h2>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, computed, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { ChatLineRound, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { getAllGenres, getRecommendedSubreddits, getPopularSubreddits, getSubredditsByGenre } from '@/axios/genre'
  import { toggleMember } from '@/axios/subredditMember'
  import { useUserStore } from '@/stores/user'

  const router = useRouter()
  const userStore = useUserStore()

  // 数据
  const genres = ref([])
  const selectedGenreId = ref(null)
  const recommendedCommunities = ref([])
  const popularCommunities = ref([])
  const genreCommunities = ref([])
  const recommendedLoading = ref(false)
  const popularLoading = ref(false)
  const genreLoading = ref(false)
  const genrePage = ref(1)
  const hasMoreGenreCommunities = ref(false)
  
  // 分类滚动相关
  const categoriesScrollRef = ref(null)
  const canScrollLeft = ref(false)
  const canScrollRight = ref(false)

  // 获取选中分类的名称
  const selectedGenreName = computed(() => {
    if (!selectedGenreId.value) return ''
    const genre = genres.value.find(g => g.id === selectedGenreId.value)
    return genre?.ch_name || ''
  })

  // 格式化成员数
  const formatMemberCount = (count) => {
    if (!count) return '0'
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + '万'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k'
    }
    return count.toString()
  }

  // 选择分类
  const selectGenre = (genreId) => {
    if (selectedGenreId.value === genreId) {
      selectedGenreId.value = null
    } else {
      selectedGenreId.value = genreId
    }
    loadCommunities()
  }

  // 加载分类列表
  const loadGenres = async () => {
    try {
      const res = await getAllGenres()
      if (res.success) {
        genres.value = res.data || []
      }
    } catch (error) {
      console.error('加载分类失败:', error)
      ElMessage.error('加载分类失败')
    }
  }

  // 加载推荐社区
  const loadRecommended = async () => {
    recommendedLoading.value = true
    try {
      const res = await getRecommendedSubreddits({ limit: 6 })
      if (res.success) {
        recommendedCommunities.value = res.data || []
      }
    } catch (error) {
      console.error('加载推荐社区失败:', error)
      ElMessage.error('加载推荐社区失败')
    } finally {
      recommendedLoading.value = false
    }
  }

  // 加载更多推荐
  const loadMoreRecommended = async () => {
    try {
      const res = await getRecommendedSubreddits({ limit: recommendedCommunities.value.length + 6 })
      if (res.success) {
        recommendedCommunities.value = res.data || []
      }
    } catch (error) {
      console.error('加载更多推荐失败:', error)
    }
  }

  // 加载最受欢迎社区
  const loadPopular = async () => {
    popularLoading.value = true
    try {
      const res = await getPopularSubreddits({ limit: 6 })
      if (res.success) {
        popularCommunities.value = res.data || []
      }
    } catch (error) {
      console.error('加载最受欢迎社区失败:', error)
      ElMessage.error('加载最受欢迎社区失败')
    } finally {
      popularLoading.value = false
    }
  }

  // 加载社区数据
  const loadCommunities = async () => {
    if (selectedGenreId.value) {
      // 如果选择了分类，清空推荐和最受欢迎数据，加载该分类下的社区
      recommendedCommunities.value = []
      popularCommunities.value = []
      genrePage.value = 1
      await loadCommunitiesByGenre(selectedGenreId.value)
    } else {
      // 如果取消选择分类，清空分类数据，加载推荐和最受欢迎
      genreCommunities.value = []
      hasMoreGenreCommunities.value = false
      loadRecommended()
      loadPopular()
    }
  }

  // 根据分类加载社区
  const loadCommunitiesByGenre = async (genreId, page = 1) => {
    genreLoading.value = true
    try {
      const res = await getSubredditsByGenre({ genre_id: genreId, page, pageSize: 12 })
      if (res.success) {
        const communities = res.data?.list || []
        if (page === 1) {
          genreCommunities.value = communities
        } else {
          genreCommunities.value = [...genreCommunities.value, ...communities]
        }
        hasMoreGenreCommunities.value = res.data?.hasMore || false
      }
    } catch (error) {
      console.error('加载分类社区失败:', error)
      ElMessage.error('加载分类社区失败')
    } finally {
      genreLoading.value = false
    }
  }

  // 加载更多分类社区
  const loadMoreGenreCommunities = async () => {
    if (!selectedGenreId.value || !hasMoreGenreCommunities.value) return
    genrePage.value += 1
    await loadCommunitiesByGenre(selectedGenreId.value, genrePage.value)
  }

  // 切换加入状态
  const toggleJoin = async (community) => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      router.push('/login')
      return
    }

    try {
      const res = await toggleMember({ subreddit_id: community.id })
      if (res.success) {
        community.is_joined = !community.is_joined
        community.member_count = res.data?.member_count || 0
        ElMessage.success(community.is_joined ? '加入成功' : '已退出')
      }
    } catch (error) {
      console.error('操作失败:', error)
      ElMessage.error('操作失败')
    }
  }

  // 跳转到社区帖子列表：
  // - 路由参数 community 使用社区名称
  // - 查询参数携带 subredditId，供帖子列表通过社区 ID 获取帖子
  const goToCommunity = (community) => {
    if (!community) return
    router.push({
      name: 'community-posts',
      params: {
        community: community.name
      },
      query: {
        subredditId: community.id
      }
    })
  }

  // 滚动分类条
  const scrollCategories = (direction) => {
    if (!categoriesScrollRef.value) return
    
    const scrollContainer = categoriesScrollRef.value
    const scrollAmount = 200 // 每次滚动200px
    
    if (direction === 'left') {
      scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    } else {
      scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
    
    // 延迟更新按钮状态，等待滚动完成
    setTimeout(updateScrollButtons, 300)
  }
  
  // 更新滚动按钮状态
  const updateScrollButtons = () => {
    if (!categoriesScrollRef.value) return
    
    const scrollContainer = categoriesScrollRef.value
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer
    
    canScrollLeft.value = scrollLeft > 0
    canScrollRight.value = scrollLeft < scrollWidth - clientWidth - 1
  }
  
  // 初始化
  onMounted(async () => {
    await loadGenres()
    loadCommunities()
    
    // 等待DOM更新后检查滚动状态
    await nextTick()
    updateScrollButtons()
    
    // 监听滚动事件
    if (categoriesScrollRef.value) {
      categoriesScrollRef.value.addEventListener('scroll', updateScrollButtons)
      
      // 监听窗口大小变化
      window.addEventListener('resize', updateScrollButtons)
    }
  })
</script>

<style scoped>
.browse-communities-page {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

/* 分类筛选区域 */
.categories-section {
  margin-bottom: 32px;
}

.categories-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.categories-scroll-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  width: 100%;
  max-width: 100%;
}

.scroll-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  padding: 0;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.scroll-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.scroll-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.categories-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  max-width: 100%;
}

.categories-scroll::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.categories-list {
  display: flex;
  gap: 8px;
  white-space: nowrap;
  width: max-content;
}

.category-btn {
  flex-shrink: 0;
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.category-btn:hover {
  transform: translateY(-1px);
}

/* 内容区域 */
.section {
  margin-bottom: 48px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 20px 0;
  transition: color 0.3s ease;
}

/* 社区网格 */
.communities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 16px;
}

.community-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.community-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.community-icon-wrapper {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.community-icon {
  flex: 1;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff4500, #ff6314);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 24px;
}

.community-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.community-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  cursor: pointer;
  transition: color 0.3s ease;
}

.community-name:hover {
  color: var(--primary);
}

.community-info-wrapper {
  flex: 6;
}

.community-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.community-visitors {
  font-weight: 500;
}

.community-description {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s ease;
}

.community-actions {
  margin-top: 8px;
  flex: 1;
}

.show-more-btn {
  margin-top: 16px;
  font-size: 14px;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .communities-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 24px;
  }

  .section-title {
    font-size: 18px;
  }
}
</style>

