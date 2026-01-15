<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="media-detail-page">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 详情内容 -->
        <div v-else-if="media" class="media-detail-content">
          <!-- 顶部横幅 -->
          <div class="media-hero" :style="heroBackgroundStyle">
            <div class="media-hero-overlay" />
            <div class="media-hero-inner">
              <div class="media-hero-left">
                <div class="media-poster-large">
                  <img :src="posterImage" :alt="displayTitle">
                </div>
                <div class="media-actions">
                  <el-button type="primary" size="large" class="add-list-btn">
                    Add to List
                  </el-button>
                  <el-button circle class="favorite-btn">
                    <el-icon>
                      <StarFilled />
                    </el-icon>
                  </el-button>
                </div>
              </div>

              <div class="media-hero-right">
                <h1 class="media-title-large">
                  {{ displayTitle }}
                </h1>
                <div class="media-meta-large">
                  <span v-if="seasonText">{{ seasonText }}</span>
                  <span v-if="seasonText && media.format"> · </span>
                  <span v-if="media.format">{{ formatType }}</span>
                  <span v-if="episodesText"> · {{ episodesText }}</span>
                </div>

                <div class="media-extra-meta">
                  <div v-if="studioText" class="meta-row">
                    <span class="meta-label">Studio</span>
                    <span class="meta-value">{{ studioText }}</span>
                  </div>
                  <div v-if="genresText.length" class="meta-row">
                    <span class="meta-label">Genres</span>
                    <div class="meta-tags">
                      <span
                        v-for="g in genresText"
                        :key="g"
                        class="meta-tag"
                      >
                        {{ g }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="scoreText" class="media-score">
                  <div class="score-circle">
                    <span class="score-value">
                      {{ scoreText }}
                    </span>
                    <span class="score-unit">/100</span>
                  </div>
                  <div class="score-label">
                    AniVerse Score
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 下方内容 -->
          <div class="media-body">
            <div class="media-tabs">
              <el-tabs v-model="activeTab" @tab-change="handleTabChange">
                <el-tab-pane label="Overview" name="overview" />
                <el-tab-pane label="Characters" name="characters" />
                <el-tab-pane label="Staff" name="staff" />
                <el-tab-pane label="Social" name="social" />
                <el-tab-pane label="Stats" name="stats" />
              </el-tabs>
            </div>

            <div class="media-tab-content">
              <router-view />
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-container">
          <el-empty description="媒体不存在或已被删除">
            <el-button type="primary" @click="$router.push('/media-library')">
              返回次元库
            </el-button>
          </el-empty>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, computed, provide, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { StarFilled } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { getMediaDetail } from '@/axios/media'

  const route = useRoute()
  const router = useRouter()

  const media = ref(null)
  const loading = ref(false)
  const activeTab = ref('overview')

  provide('mediaDetail', media)

  const TAB_NAMES = ['overview', 'characters', 'staff', 'social', 'stats']

  const syncActiveTabFromRoute = () => {
    const seg = String(route.path).split('/').filter(Boolean).pop() || 'overview'
    activeTab.value = TAB_NAMES.includes(seg) ? seg : 'overview'
  }

  const handleTabChange = (tabName) => {
    const name = String(tabName || 'overview')
    if (!TAB_NAMES.includes(name)) return
    router.push({ path: `/media/${route.params.id}/${name}` })
  }

  // 展示用字段
  const displayTitle = computed(() => {
    if (!media.value) return ''
    return (
      media.value.title_native ||
      media.value.title ||
      media.value.title_english ||
      'Unknown'
    )
  })

  const posterImage = computed(() => {
    if (!media.value) return '/placeholder.jpg'
    return (
      media.value.cover_image_extra_large ||
      media.value.cover_image_large ||
      media.value.poster ||
      '/placeholder.jpg'
    )
  })

  const heroBackgroundStyle = computed(() => {
    if (!media.value) {
      return {}
    }
    const bg =
      media.value.banner_image ||
      media.value.cover_image_extra_large ||
      media.value.cover ||
      media.value.poster

    if (!bg) return {}

    return {
      backgroundImage: `url(${bg})`
    }
  })

  const seasonText = computed(() => {
    if (!media.value) return ''
    const year = media.value.season_year || media.value.year
    const season = media.value.season

    const map = {
      SPRING: 'Spring',
      SUMMER: 'Summer',
      FALL: 'Fall',
      WINTER: 'Winter'
    }

    if (season && year) {
      return `${map[season] || season} ${year}`
    }
    if (year) return `${year}`
    return ''
  })

  const episodesText = computed(() => {
    if (!media.value || !media.value.episodes) return ''
    const count = media.value.episodes
    return `${count} ${count === 1 ? 'episode' : 'episodes'}`
  })

  const formatType = computed(() => {
    if (!media.value || !media.value.format) return ''
    const map = {
      TV: 'TV Show',
      MOVIE: 'Movie',
      OVA: 'OVA',
      ONA: 'ONA',
      SPECIAL: 'Special'
    }
    return map[media.value.format] || media.value.format
  })

  const studioText = computed(() => {
    if (!media.value || !media.value.studios) return ''
    if (Array.isArray(media.value.studios) && media.value.studios.length > 0) {
      return media.value.studios
        .map((s) => (typeof s === 'string' ? s : s.name || ''))
        .filter(Boolean)
        .join(', ')
    }
    return ''
  })

  const genresText = computed(() => {
    if (!media.value || !media.value.genres) return []
    if (Array.isArray(media.value.genres)) {
      return media.value.genres
        .map((g) => (typeof g === 'string' ? g : g.name || ''))
        .filter(Boolean)
        .slice(0, 4)
    }
    return []
  })

  const scoreText = computed(() => {
    if (!media.value) return ''
    if (media.value.average_score) {
      return Math.round(media.value.average_score)
    }
    if (media.value.rating) {
      return Math.round(media.value.rating * 10)
    }
    return ''
  })

  const fetchMediaDetail = async () => {
    loading.value = true
    try {
      const response = await getMediaDetail(route.params.id)
      if (response.code === 200) {
        media.value = response.data
      } else {
        ElMessage.error(response.message || '获取媒体详情失败')
      }
    } catch (error) {
      console.error('获取媒体详情失败:', error)
      ElMessage.error('获取媒体详情失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    if (route.params.id) {
      fetchMediaDetail()
    }
  })

  watch(
    () => route.fullPath,
    () => syncActiveTabFromRoute(),
    { immediate: true }
  )
</script>

<style scoped>
.media-detail-page {
  padding: 0 24px 32px;
  min-height: 100vh;
}

.loading-container {
  padding: 40px 0;
}

.media-detail-content {
  margin: 0 auto;
}

/* 顶部横幅 */
.media-hero {
  position: relative;
  margin: 24px -24px 0;
  padding: 40px 24px 32px;
  background-position: center top;
  background-size: cover;
  background-repeat: no-repeat;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

.media-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(5, 5, 10, 0.7),
    rgba(5, 5, 10, 0.95)
  );
}

.media-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.media-hero-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.media-poster-large {
  flex-shrink: 0;
  width: 260px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-tertiary);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
}

.media-poster-large img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.media-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-list-btn {
  padding: 10px 22px;
  font-weight: 600;
}

.favorite-btn {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(148, 163, 184, 0.5);
  color: #fde68a;
}

.media-hero-right {
  flex: 1;
  color: #e5e7eb;
}

.media-title-large {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 12px 0;
  transition: color 0.3s ease;
}

.media-meta-large {
  font-size: 15px;
  color: rgba(229, 231, 235, 0.8);
  margin-bottom: 16px;
  transition: color 0.3s ease;
}

.media-extra-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.meta-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.meta-label {
  min-width: 60px;
  color: rgba(156, 163, 175, 0.95);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}

.meta-value {
  color: #e5e7eb;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tag {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.6);
  font-size: 11px;
  color: #f9fafb;
}

.media-score {
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-circle {
  width: 68px;
  height: 68px;
  border-radius: 999px;
  border: 2px solid #4ade80;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(22, 163, 74, 0.2);
}

.score-value {
  font-size: 20px;
  font-weight: 700;
  color: #bbf7d0;
}

.score-unit {
  font-size: 11px;
  color: #dcfce7;
}

.score-label {
  font-size: 13px;
  color: rgba(229, 231, 235, 0.8);
}

/* 下方主体内容 */
.media-body {
  padding: 24px 0 0;
}

.media-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom-color: rgba(31, 41, 55, 0.9);
}

.media-tabs :deep(.el-tabs__item) {
  color: var(--text-secondary);
  font-weight: 500;
}

.media-tabs :deep(.el-tabs__item.is-active) {
  color: #ffffff;
}

.media-tabs :deep(.el-tabs__nav-wrap::after) {
  background-color: transparent;
}

.media-tab-content {
  padding-top: 20px;
}

.overview-section .section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.media-description {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.media-description.empty {
  color: var(--text-secondary);
}

.placeholder-section {
  font-size: 14px;
  color: var(--text-secondary);
}

.empty-container {
  padding: 60px 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .media-detail-page {
    padding: 0 12px 24px;
  }

  .media-hero {
    margin: 12px -12px 0;
    padding: 24px 16px 20px;
    border-radius: 0 0 12px 12px;
  }

  .media-hero-inner {
    flex-direction: column;
    align-items: center;
  }

  .media-poster-large {
    width: 200px;
  }

  .media-hero-right {
    text-align: center;
  }

  .media-title-large {
    font-size: 24px;
  }

  .meta-row {
    justify-content: center;
  }

  .media-score {
    justify-content: center;
  }
}
</style>

