<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="media-library-page">
        <!-- 搜索和过滤栏 -->
        <div class="filter-section setting-control">
          <div class="filter-row">
            <div class="filter-item">
              <label class="filter-label">Search</label>
              <el-input
                v-model="filters.search"
                placeholder="Any"
                clearable
                @keyup.enter="handleSearch"
                @clear="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            
            <div class="filter-item">
              <label class="filter-label">Genres</label>
              <el-select
                v-model="filters.genre"
                multiple
                collapse-tags
                placeholder="Any"
                clearable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="genre in genres"
                  :key="genre.id"
                  :label="genre.name"
                  :value="genre.id"
                />
              </el-select>
            </div>
            
            <div class="filter-item">
              <label class="filter-label">Year</label>
              <el-select
                v-model="filters.year"
                placeholder="Any"
                clearable
                @change="handleFilterChange"
              >
                <el-option
                  v-for="year in years"
                  :key="year"
                  :label="year"
                  :value="year"
                />
              </el-select>
            </div>
            
            <div class="filter-item">
              <label class="filter-label">Season</label>
              <el-select
                v-model="filters.season"
                placeholder="Any"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="Spring" value="SPRING" />
                <el-option label="Summer" value="SUMMER" />
                <el-option label="Fall" value="FALL" />
                <el-option label="Winter" value="WINTER" />
              </el-select>
            </div>
            
            <div class="filter-item">
              <label class="filter-label">Format</label>
              <el-select
                v-model="filters.format"
                placeholder="Any"
                clearable
                @change="handleFilterChange"
              >
                <el-option label="TV" value="TV" />
                <el-option label="Movie" value="MOVIE" />
                <el-option label="OVA" value="OVA" />
                <el-option label="ONA" value="ONA" />
                <el-option label="Special" value="SPECIAL" />
              </el-select>
            </div>
            
            <div class="filter-actions">
              <el-button :icon="Filter" circle @click="showAdvancedFilters = !showAdvancedFilters" />
            </div>
          </div>
          
          <!-- 已选过滤标签 + 操作栏 -->
          <div
            v-if="hasActiveFilters"
            class="active-filters"
          >
            <div class="active-filters-left">
              <el-icon class="active-filters-icon">
                <Filter />
              </el-icon>
            </div>
            <div class="active-filters-right">
              <div class="active-filters-tags">
                <el-tag
                  v-for="tag in activeFilterTags"
                  :key="tag.key"
                  closable
                  type="info"
                  effect="dark"
                  class="active-filter-tag"
                  @close="removeTag(tag)"
                >
                  {{ tag.label }}
                </el-tag>
              </div>
              <div class="active-filters-actions">
                <el-dropdown trigger="click" @command="handleSortCommand">
                  <span class="sort-dropdown-trigger">
                    <span class="sort-dropdown-label">
                      {{ currentSortLabel }}
                    </span>
                    <el-icon class="sort-dropdown-icon">
                      <ArrowDown />
                    </el-icon>
                  </span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        v-for="option in sortOptions"
                        :key="option.value"
                        :command="option.value"
                      >
                        {{ option.label }}
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>

                <div class="layout-switch">
                  <el-button-group>
                    <el-tooltip content="Grid" placement="bottom">
                      <el-button
                        text
                        class="layout-btn"
                        :type="mediaLayout === 'grid' ? 'primary' : 'default'"
                        @click="changeLayout('grid')"
                      >
                        <span class="layout-icon layout-icon-grid" />
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="Card" placement="bottom">
                      <el-button
                        text
                        class="layout-btn"
                        :type="mediaLayout === 'card' ? 'primary' : 'default'"
                        @click="changeLayout('card')"
                      >
                        <span class="layout-icon layout-icon-card" />
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="Compact" placement="bottom">
                      <el-button
                        text
                        class="layout-btn"
                        :type="mediaLayout === 'compact' ? 'primary' : 'default'"
                        @click="changeLayout('compact')"
                      >
                        <span class="layout-icon layout-icon-compact" />
                      </el-button>
                    </el-tooltip>
                  </el-button-group>
                </div>

                <el-button
                  v-if="activeFilterTags.length"
                  text
                  size="small"
                  class="clear-all-btn"
                  @click="clearAllTags"
                >
                  Clear All
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 默认推荐内容：没有筛选时显示 -->
        <div v-if="!hasActiveFilters" class="default-sections">
          <!-- TRENDING NOW 部分 -->
          <div class="section-container">
            <div class="section-header">
              <h2 class="section-title">
                TRENDING NOW
              </h2>
              <el-button link type="primary" @click="viewAllTrending">
                View All
              </el-button>
            </div>
            <div v-if="loadingTrending" class="media-grid">
              <el-skeleton
                v-for="i in 5"
                :key="i"
                :rows="0"
                animated
              >
                <template #template>
                  <div class="skeleton-card">
                    <el-skeleton-item variant="image" style="width: 100%; padding-top: 142.857%;" />
                    <el-skeleton-item variant="text" style="width: 80%; margin-top: 12px;" />
                    <el-skeleton-item variant="text" style="width: 60%;" />
                  </div>
                </template>
              </el-skeleton>
            </div>
            <MediaList
              v-else
              :items="trendingMedia"
              :layout="mediaLayout"
            />
          </div>

          <!-- POPULAR THIS SEASON 部分 -->
          <div class="section-container">
            <div class="section-header">
              <h2 class="section-title">
                POPULAR THIS SEASON
              </h2>
              <el-button link type="primary" @click="viewAllSeason">
                View All
              </el-button>
            </div>
            <div v-if="loadingSeason" class="media-grid">
              <el-skeleton
                v-for="i in 5"
                :key="i"
                :rows="0"
                animated
              >
                <template #template>
                  <div class="skeleton-card">
                    <el-skeleton-item variant="image" style="width: 100%; padding-top: 142.857%;" />
                    <el-skeleton-item variant="text" style="width: 80%; margin-top: 12px;" />
                    <el-skeleton-item variant="text" style="width: 60%;" />
                  </div>
                </template>
              </el-skeleton>
            </div>
            <MediaList
              v-else
              :items="seasonMedia"
              :layout="mediaLayout"
            />
          </div>

          <!-- TOP 100 ANIME 排名（展示前10条） -->
          <TopAnimeRanking />
        </div>

        <!-- 有筛选时显示：筛选后的媒体列表 -->
        <div v-else class="section-container">
          <div class="section-header">
            <h2 class="section-title">
              FILTERED RESULTS
            </h2>
            <span v-if="filteredPagination.total" class="result-count">
              {{ filteredPagination.total }} results
            </span>
          </div>
          <div v-if="loadingFiltered" class="media-grid">
            <el-skeleton
              v-for="i in 10"
              :key="i"
              :rows="0"
              animated
            >
              <template #template>
                <div class="skeleton-card">
                  <el-skeleton-item variant="image" style="width: 100%; padding-top: 142.857%;" />
                  <el-skeleton-item variant="text" style="width: 80%; margin-top: 12px;" />
                  <el-skeleton-item variant="text" style="width: 60%;" />
                </div>
              </template>
            </el-skeleton>
          </div>
          <MediaList
            v-else
            :items="filteredMedia"
            :layout="mediaLayout"
          />
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Search, Filter, ArrowDown } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import MediaCard from '@/components/MediaCard.vue'
  import MediaList from '@/components/MediaList.vue'
  import TopAnimeRanking from '@/components/TopAnimeRanking.vue'
  import { getMediaList, searchMedia } from '@/axios/media'
  import { getGenresList } from '@/axios/mediaGenres'
  import { useScrollPagination } from '@/utils/useScrollPagination'

  const router = useRouter()

  // 数据
  const trendingMedia = ref([])
  const seasonMedia = ref([])
  const filteredMedia = ref([])
  const genres = ref([])
  const loadingTrending = ref(false)
  const loadingSeason = ref(false)
  const loadingFiltered = ref(false)
  const loadingMoreFiltered = ref(false)
  const showAdvancedFilters = ref(false)
  // 列表展示布局：grid / card / compact
  const mediaLayout = ref('grid')
  const sortBy = ref('popularity')
  const sortOrder = ref('DESC')
  const filteredPagination = ref({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 20
  })

  // 过滤器
  const filters = ref({
    search: '',
    genre: [],
    year: null,
    season: null,
    format: null
  })

  const sortOptions = [
    { label: 'Popularity', value: 'popularity' },
    { label: 'Average Score', value: 'average_score' },
    { label: 'Mean Score', value: 'mean_score' },
    { label: 'Recently Added', value: 'created_at' }
  ]

  const currentSortLabel = computed(() => {
    const match = sortOptions.find(option => option.value === sortBy.value)
    return match ? match.label : 'Sort'
  })

  // 生成年份列表（最近20年）
  const years = computed(() => {
    const currentYear = new Date().getFullYear()
    const yearList = []
    for (let i = currentYear; i >= currentYear - 20; i--) {
      yearList.push(i)
    }
    return yearList
  })

  // 当前是否有激活的过滤条件
  const hasActiveFilters = computed(() => {
    return (
      !!filters.value.search ||
      (filters.value.genre && filters.value.genre.length > 0) ||
      !!filters.value.year ||
      !!filters.value.season ||
      !!filters.value.format
    )
  })

  // 已选过滤条件生成标签
  const activeFilterTags = computed(() => {
    const tags = []

    // 搜索关键字
    if (filters.value.search) {
      tags.push({
        key: 'search',
        field: 'search',
        type: 'search',
        label: filters.value.search
      })
    }

    // 类型（支持多选）
    if (filters.value.genre && filters.value.genre.length > 0) {
      const genreMap = new Map(genres.value.map(g => [g.id, g.name]))
      filters.value.genre.forEach(id => {
        tags.push({
          key: `genre-${id}`,
          field: 'genre',
          type: 'genre',
          value: id,
          label: genreMap.get(id) || `Genre ${id}`
        })
      })
    }

    // 年份
    if (filters.value.year) {
      tags.push({
        key: 'year',
        field: 'year',
        type: 'year',
        label: String(filters.value.year)
      })
    }

    // 季度
    if (filters.value.season) {
      const seasonLabels = {
        SPRING: 'Spring',
        SUMMER: 'Summer',
        FALL: 'Fall',
        WINTER: 'Winter'
      }
      tags.push({
        key: 'season',
        field: 'season',
        type: 'season',
        label: seasonLabels[filters.value.season] || filters.value.season
      })
    }

    // 形式
    if (filters.value.format) {
      tags.push({
        key: 'format',
        field: 'format',
        type: 'format',
        label: filters.value.format
      })
    }

    return tags
  })

  // 获取类型列表
  const fetchGenres = async () => {
    try {
      const response = await getGenresList({ pageSize: 100 })
      if (response.code === 200) {
        genres.value = response.data || []
      }
    } catch (error) {
      console.error('获取类型列表失败:', error)
    }
  }

  // 获取热门媒体（趋势）
  const fetchTrendingMedia = async () => {
    loadingTrending.value = true
    try {
      const params = {
        page: 1,
        pageSize: 5,
        sortBy: 'trending',
        order: 'desc'
      }
      const response = await getMediaList(params)
      if (response.code === 200) {
        trendingMedia.value = response.data.list || []
      } else {
        ElMessage.error(response.message || '获取热门媒体失败')
      }
    } catch (error) {
      console.error('获取热门媒体失败:', error)
      // 使用模拟数据作为后备
      trendingMedia.value = []
    } finally {
      loadingTrending.value = false
    }
  }

  // 获取本季热门媒体
  const fetchSeasonMedia = async () => {
    loadingSeason.value = true
    try {
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      let currentSeason = 'SPRING'
    
      const month = currentDate.getMonth() + 1
      if (month >= 3 && month <= 5) {
        currentSeason = 'SPRING'
      } else if (month >= 6 && month <= 8) {
        currentSeason = 'SUMMER'
      } else if (month >= 9 && month <= 11) {
        currentSeason = 'FALL'
      } else {
        currentSeason = 'WINTER'
      }
    
      const params = {
        page: 1,
        pageSize: 5,
        year: currentYear,
        season: currentSeason,
        sortBy: 'popularity',
        order: 'desc'
      }
      const response = await getMediaList(params)
      if (response.code === 200) {
        seasonMedia.value = response.data.list || []
      } else {
        ElMessage.error(response.message || '获取本季热门媒体失败')
      }
    } catch (error) {
      console.error('获取本季热门媒体失败:', error)
      // 使用模拟数据作为后备
      seasonMedia.value = []
    } finally {
      loadingSeason.value = false
    }
  }

  // 构造筛选请求参数
  const buildFilterParams = (page = 1) => {
    const params = {
      page,
      pageSize: filteredPagination.value.pageSize || 20,
      sort: sortBy.value,
      order: sortOrder.value
    }

    if (filters.value.search) {
      params.search = filters.value.search
    }
    if (filters.value.format) {
      params.format = filters.value.format
    }
    if (filters.value.season) {
      params.season = filters.value.season
    }
    if (filters.value.year) {
      params.season_year = filters.value.year
    }
    // 后端当前只支持单个 genre_id，这里取第一个
    if (filters.value.genre && filters.value.genre.length > 0) {
      params.genre_id = filters.value.genre[0]
    }

    return params
  }

  // 根据筛选条件获取媒体列表
  const fetchFilteredMedia = async (page = 1, append = false) => {
    if (!hasActiveFilters.value) {
      filteredMedia.value = []
      filteredPagination.value = {
        total: 0,
        totalPages: 0,
        currentPage: 1,
        pageSize: 20
      }
      return
    }

    // 首次加载 / 切换筛选条件时显示主 loading
    if (!append) {
      loadingFiltered.value = true
    } else {
      loadingMoreFiltered.value = true
    }

    try {
      const params = buildFilterParams(page)
      const response = await getMediaList(params)
      if (response.code === 200) {
        const list = response.data.list || []
        const pagination = response.data.pagination || {}

        if (append) {
          filteredMedia.value = [...filteredMedia.value, ...list]
        } else {
          filteredMedia.value = list
        }

        filteredPagination.value = {
          ...filteredPagination.value,
          ...pagination
        }
      } else {
        ElMessage.error(response.message || '获取筛选结果失败')
      }
    } catch (error) {
      console.error('获取筛选结果失败:', error)
    } finally {
      loadingFiltered.value = false
      loadingMoreFiltered.value = false
    }
  }

  // 搜索处理
  const handleSearch = () => {
    filteredPagination.value.currentPage = 1
    fetchFilteredMedia(1, false)
  }

  // 过滤变化处理
  const handleFilterChange = () => {
    filteredPagination.value.currentPage = 1
    fetchFilteredMedia(1, false)
  }

  // 删除单个标签
  const removeTag = (tag) => {
    switch (tag.field) {
      case 'search':
        filters.value.search = ''
        break
      case 'genre':
        if (Array.isArray(filters.value.genre)) {
          filters.value.genre = filters.value.genre.filter(id => id !== tag.value)
        }
        break
      case 'year':
        filters.value.year = null
        break
      case 'season':
        filters.value.season = null
        break
      case 'format':
        filters.value.format = null
        break
    }
    handleFilterChange()
  }

  // 清空所有标签 / 过滤条件
  const clearAllTags = () => {
    filters.value = {
      search: '',
      genre: [],
      year: null,
      season: null,
      format: null
    }
    handleFilterChange()
  }

  // 排序变更
  const handleSortChange = () => {
    filteredPagination.value.currentPage = 1
    fetchFilteredMedia(1, false)
  }

  // dropdown 排序命令
  const handleSortCommand = (command) => {
    sortBy.value = command
    handleSortChange()
  }

  // 是否还能继续加载筛选结果的更多页
  const canLoadMoreFiltered = computed(() => {
    if (!hasActiveFilters.value) return false
    if (loadingFiltered.value || loadingMoreFiltered.value) return false
    if (!filteredPagination.value) return false
    const { currentPage, totalPages } = filteredPagination.value
    return totalPages && currentPage < totalPages
  })

  // 加载筛选结果下一页
  const loadMoreFilteredMedia = () => {
    if (!canLoadMoreFiltered.value) return
    const nextPage = (filteredPagination.value.currentPage || 1) + 1
    filteredPagination.value.currentPage = nextPage
    fetchFilteredMedia(nextPage, true)
  }

  // 仅在有 FILTERED RESULTS 时启用滚动分页
  useScrollPagination({
    loadMore: loadMoreFilteredMedia,
    canLoadMore: () => canLoadMoreFiltered.value,
    offset: 400
  })

  // 列表布局切换
  const changeLayout = (layout) => {
    mediaLayout.value = layout
  }

  // 查看全部
  const viewAllTrending = () => {
    router.push({
      path: '/media-library',
      query: { section: 'trending', ...filters.value }
    })
  }

  const viewAllSeason = () => {
    router.push({
      path: '/media-library',
      query: { section: 'season', ...filters.value }
    })
  }

  // 初始化
  onMounted(() => {
    fetchGenres()
    fetchTrendingMedia()
    fetchSeasonMedia()
  })
</script>

<style scoped>
.media-library-page {
  padding: 0;
  min-height: 100vh;
}

/* 过滤区域 */
.filter-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 32px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-item {
  flex: 1;
  min-width: 150px;
}

.filter-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

:deep(.filter-item .el-input),
:deep(.filter-item .el-select) {
  width: 100%;
}

:deep(.filter-item .el-input__wrapper) {
  background-color: var(--bg-tertiary);
  border-color: var(--card-border);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

:deep(.filter-item .el-input__wrapper:hover) {
  border-color: var(--text-secondary);
}

:deep(.filter-item .el-select .el-input__wrapper) {
  background-color: var(--bg-tertiary);
  border-color: var(--card-border);
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 已选过滤标签栏 */
.active-filters {
  display: flex;
  align-items: center;
  margin-top: 16px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  gap: 8px;
}

.active-filters-left {
  display: flex;
  align-items: center;
}

.active-filters-icon {
  color: var(--text-secondary);
}

.active-filters-right {
  display: flex;
  flex: 1;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.active-filters-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.active-filter-tag {
  border-radius: 999px;
}

.clear-all-btn {
  color: var(--text-secondary);
}

.active-filters-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}

.sort-dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--card-border);
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
}

.sort-dropdown-trigger:hover {
  border-color: var(--text-secondary);
}

.sort-dropdown-icon {
  font-size: 14px;
}

.layout-switch {
  display: flex;
  align-items: center;
}

.layout-btn {
  padding: 0 6px;
}

.layout-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  box-sizing: border-box;
}

.layout-icon-grid {
  border: 2px solid var(--text-secondary);
  box-shadow: inset 4px 4px 0 var(--text-secondary), inset -4px -4px 0 var(--text-secondary);
}

.layout-icon-card {
  border: 2px solid var(--text-secondary);
  box-shadow: inset 0 0 0 2px var(--text-secondary);
}

.layout-icon-compact {
  border: 2px solid var(--text-secondary);
  position: relative;
}

.layout-icon-compact::before,
.layout-icon-compact::after {
  content: '';
  position: absolute;
  left: 2px;
  right: 2px;
  height: 2px;
  background-color: var(--text-secondary);
}

.layout-icon-compact::before {
  top: 4px;
}

.layout-icon-compact::after {
  bottom: 4px;
}

/* 部分容器 */

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

/* 媒体网格 */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
}

.skeleton-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 12px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}


/* 响应式设计 */
@media (max-width: 1200px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-item {
    min-width: 100%;
  }
  
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .section-title {
    font-size: 20px;
  }

}

@media (max-width: 480px) {
  .media-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
</style>

