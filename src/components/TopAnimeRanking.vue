<template>
  <div class="section-container">
    <div class="section-header top-section-header">
      <div class="top-section-title-wrap">
        <h2 class="section-title">
          TOP 100 ANIME
        </h2>
        <span class="section-subtitle">Showing top 10</span>
      </div>
      <el-button link type="primary" @click="handleViewAll">
        View All
      </el-button>
    </div>
    <div v-if="loadingTop" class="top-list">
      <div
        v-for="i in 10"
        :key="i"
        class="top-item skeleton"
      >
        <div class="top-rank">
          #{{ i }}
        </div>
        <div class="top-cover">
          <el-skeleton-item
            variant="image"
            class="top-cover-skeleton"
          />
        </div>
        <div class="top-main">
          <el-skeleton-item
            variant="text"
            style="width: 60%; margin-bottom: 8px;"
          />
          <el-skeleton-item
            variant="text"
            style="width: 40%;"
          />
        </div>
        <div class="top-meta">
          <el-skeleton-item
            variant="text"
            style="width: 80px;"
          />
        </div>
        <div class="top-extra">
          <el-skeleton-item
            variant="text"
            style="width: 60px; margin-bottom: 4px;"
          />
          <el-skeleton-item
            variant="text"
            style="width: 80px;"
          />
        </div>
      </div>
    </div>
    <div v-else class="top-list">
      <div
        v-for="(media, index) in topMedia"
        :key="media.id"
        class="top-item"
      >
        <div class="top-rank">
          #{{ index + 1 }}
        </div>
        <div class="top-cover">
          <img
            :src="media.cover_image_medium || media.cover_image_large"
            :alt="media.title_english || media.title_native"
          >
        </div>
        <div class="top-main">
          <div class="top-title">
            {{ media.title_english || media.title_native }}
          </div>
          <div class="top-tags">
            <span
              v-for="(genre, gIndex) in (media.genres || []).slice(0, 4)"
              :key="gIndex"
              class="top-tag"
            >
              {{ genre }}
            </span>
          </div>
        </div>
        <div class="top-meta">
          <div class="top-score">
            <el-icon class="top-score-icon">
              <Smile />
            </el-icon>
            <div class="top-score-text">
              <span class="top-score-value">
                {{ media.average_score ? media.average_score + '%' : 'N/A' }}
              </span>
              <span
                v-if="media.popularity"
                class="top-score-users"
              >
                {{ formatNumber(media.popularity) }} users
              </span>
            </div>
          </div>
        </div>
        <div class="top-extra">
          <div class="top-format">
            {{ media.format || 'TV Show' }}
          </div>
          <div
            v-if="media.season || media.season_year"
            class="top-season"
          >
            {{ formatSeason(media.season) }} {{ media.season_year || '' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { onMounted, ref ,defineEmits} from 'vue'
  import { ElMessage } from 'element-plus'
  import { Smile } from '@element-plus/icons-vue'
  import { getMediaList } from '@/axios/media'

  const emit = defineEmits(['view-all'])

  const topMedia = ref([])
  const loadingTop = ref(false)

  const handleViewAll = () => {
    emit('view-all')
  }

  const fetchTopMedia = async () => {
    loadingTop.value = true
    try {
      const params = {
        page: 1,
        pageSize: 10,
        sort: 'average_score',
        order: 'DESC',
        format: 'TV'
      }
      const response = await getMediaList(params)
      if (response.code === 200) {
        topMedia.value = response.data.list || []
      } else {
        ElMessage.error(response.message || '获取前100动漫失败')
      }
    } catch (error) {
      console.error('获取前100动漫失败:', error)
      topMedia.value = []
    } finally {
      loadingTop.value = false
    }
  }

  const formatNumber = (num) => {
    if (!num && num !== 0) return ''
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const formatSeason = (season) => {
    if (!season) return ''
    const map = {
      SPRING: 'Spring',
      SUMMER: 'Summer',
      FALL: 'Fall',
      WINTER: 'Winter'
    }
    return map[season] || season
  }

  onMounted(() => {
    fetchTopMedia()
  })
</script>

<style scoped>
.section-container {
  margin-bottom: 48px;
}

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

.section-subtitle {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.top-section-header {
  align-items: flex-end;
}

.top-section-title-wrap {
  display: flex;
  flex-direction: column;
}

.top-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.top-item {
  display: grid;
  grid-template-columns: 48px 80px minmax(0, 1.8fr) minmax(0, 1.1fr) 1fr;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--card-border);
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
}

.top-item:hover {
  border-color: var(--text-secondary);
  transform: translateY(-1px);
}

.top-item.skeleton:hover {
  transform: none;
}

.top-rank {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-secondary);
}

.top-cover {
  width: 80px;
  height: 112px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.top-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.top-cover-skeleton {
  width: 100%;
  height: 100%;
}

.top-main {
  min-width: 0;
}

.top-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.top-tag {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(111, 207, 151, 0.1);
  color: #6fcf97;
  text-transform: lowercase;
}

.top-meta {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.top-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-score-icon {
  color: #27ae60;
  background: rgba(39, 174, 96, 0.15);
  border-radius: 999px;
  padding: 6px;
}

.top-score-text {
  display: flex;
  flex-direction: column;
}

.top-score-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.top-score-users {
  font-size: 12px;
  color: var(--text-secondary);
}

.top-extra {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.top-format {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.top-season {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .top-item {
    grid-template-columns: 36px 72px minmax(0, 1.5fr);
    grid-template-rows: auto auto;
    grid-auto-flow: row;
  }

  .top-meta {
    justify-content: flex-start;
  }

  .top-extra {
    align-items: flex-start;
  }
}
</style>


