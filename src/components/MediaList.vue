<template>
  <div class="media-list" :class="`media-list--${layout}`">
    <!-- 网格布局：封面卡片 -->
    <div v-if="layout === 'grid'" class="media-grid">
      <MediaCard
        v-for="media in items"
        :key="media.id"
        :media="media"
        :selectable="selectable"
        :selected="isSelected(media.id)"
        @select="handleSelect"
      />
    </div>

    <!-- 大卡片布局 -->
    <div v-else-if="layout === 'card'" class="media-card-list">
      <div
        v-for="media in items"
        :key="media.id"
        class="media-card-row"
        @click="goDetail(media)"
      >
        <div class="media-card-row-left">
          <div class="media-card-row-poster">
            <img
              :src="media.cover_image_large || media.cover || media.poster || '/placeholder.jpg'"
              :alt="getTitle(media)"
            >
          </div>
        </div>
        <div class="media-card-row-right">
          <div class="media-card-row-header">
            <div class="media-card-row-header-left">
              <div class="media-card-row-subtitle">
                {{ getSeasonText(media) }}
              </div>
              <h3 class="media-card-row-title">
                {{ getTitle(media) }}
              </h3>
              <div class="media-card-row-meta">
                <span v-if="getFormatType(media)">{{ getFormatType(media) }}</span>
                <span v-if="getEpisodes(media)">• {{ getEpisodes(media) }}</span>
              </div>
            </div>
            <div class="media-card-row-header-right" v-if="getScore(media) !== null">
              <div class="media-score-circle">
                <span class="media-score-value">{{ getScore(media) }}%</span>
              </div>
            </div>
          </div>
          <p v-if="media.description || media.description_preview" class="media-card-row-description">
            {{ media.description_preview || media.description }}
          </p>
          <div class="media-card-row-tags" v-if="getGenres(media).length">
            <span
              v-for="genre in getGenres(media)"
              :key="genre"
              class="media-tag"
            >
              {{ genre }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 精简行列表布局 -->
    <div v-else class="media-compact-list">
      <div
        v-for="media in items"
        :key="media.id"
        class="media-compact-row"
        @click="goDetail(media)"
      >
        <div class="media-compact-left">
          <div class="media-compact-thumb">
            <img
              :src="media.cover_image_medium || media.cover || media.poster || '/placeholder.jpg'"
              :alt="getTitle(media)"
            >
          </div>
          <div class="media-compact-info">
            <h3 class="media-compact-title">
              {{ getTitle(media) }}
            </h3>
            <div class="media-compact-tags" v-if="getGenres(media).length">
              <span
                v-for="genre in getGenres(media)"
                :key="genre"
                class="media-tag small"
              >
                {{ genre }}
              </span>
            </div>
          </div>
        </div>
        <div class="media-compact-right">
          <div class="media-compact-score" v-if="getScore(media) !== null">
            {{ getScore(media) }}%
          </div>
          <div class="media-compact-meta">
            <span v-if="getFormatType(media)">{{ getFormatType(media) }}</span>
            <span v-if="getAiringStatus(media)">{{ getAiringStatus(media) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { defineProps, defineEmits } from 'vue'
  import { useRouter } from 'vue-router'
  import MediaCard from '@/components/MediaCard.vue'

  const props = defineProps({
    items: {
      type: Array,
      default: () => []
    },
    // grid：封面网格；card：大卡片；compact：紧凑行列表
    layout: {
      type: String,
      default: 'grid'
    },
    // 是否可选择
    selectable: {
      type: Boolean,
      default: false
    },
    // 已选择的媒体ID列表
    selectedIds: {
      type: Array,
      default: () => []
    }
  })

  const emit = defineEmits(['select'])

  const router = useRouter()

  const isSelected = (mediaId) => {
    return props.selectedIds.includes(mediaId)
  }

  const handleSelect = (media) => {
    emit('select', media)
  }

  const getTitle = (media) => {
    return media.title_native || media.title || media.title_english || 'Unknown'
  }

  const getSeasonText = (media) => {
    const year = media.season_year || media.year
    const season = media.season
    const seasonMap = {
      SPRING: 'Spring',
      SUMMER: 'Summer',
      FALL: 'Fall',
      WINTER: 'Winter'
    }
    if (season && year) {
      return `${seasonMap[season] || season} ${year}`
    }
    if (year) return `${year}`
    return ''
  }

  const getScore = (media) => {
    if (media.average_score) {
      return Math.round(media.average_score)
    }
    return null
  }

  const getEpisodes = (media) => {
    if (media.episodes) {
      return `${media.episodes} ${media.episodes === 1 ? 'episode' : 'episodes'}`
    }
    return ''
  }

  const getFormatType = (media) => {
    const format = media.format
    if (!format) return ''
    const formatMap = {
      TV: 'TV Show',
      MOVIE: 'Movie',
      OVA: 'OVA',
      ONA: 'ONA',
      SPECIAL: 'Special'
    }
    return formatMap[format] || format
  }

  const getGenres = (media) => {
    if (media.genres && media.genres.length > 0) {
      return media.genres.map(g => g.name || g).slice(0, 4)
    }
    return []
  }

  const getAiringStatus = (media) => {
    // 简化版本：直接返回 status 文本
    return media.status_text || media.status || ''
  }

  const goDetail = (media) => {
    if (media && media.id) {
      router.push(`/media/${media.id}`)
    }
  }
</script>

<style scoped>
.media-list {
  width: 100%;
}

/* 公共 tag 样式 */
.media-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #0ea5e9;
  color: #e0f2fe;
  font-size: 11px;
  font-weight: 600;
}

.media-tag.small {
  padding: 2px 8px;
  font-size: 10px;
}

/* 网格布局沿用页面的 grid 样式，由父级容器控制列数 */
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
}

/* 大卡片布局：默认一行两列 */
.media-card-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.media-card-row {
  display: flex;
  gap: 20px;
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.media-card-row:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
  border-color: var(--primary);
}

.media-card-row-left {
  flex-shrink: 0;
}

.media-card-row-poster {
  width: 180px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.media-card-row-poster img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.media-card-row-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.media-card-row-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.media-card-row-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.media-card-row-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px 0;
}

.media-card-row-meta {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  gap: 6px;
  align-items: center;
}

.media-card-row-header-right {
  display: flex;
  align-items: flex-start;
}

.media-score-circle {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 2px solid #4ade80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 163, 74, 0.18);
}

.media-score-value {
  font-size: 15px;
  font-weight: 700;
  color: #bbf7d0;
}

.media-card-row-description {
  font-size: 13px;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.6;
  max-height: 3.2em;
  overflow: hidden;
}

.media-card-row-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 紧凑行列表布局 */
.media-compact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.media-compact-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.media-compact-row:hover {
  background: rgba(15, 23, 42, 0.8);
  border-color: var(--primary);
}

.media-compact-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.media-compact-thumb {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.media-compact-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-compact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-compact-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.media-compact-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.media-compact-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 120px;
}

.media-compact-score {
  font-size: 14px;
  font-weight: 700;
  color: #bbf7d0;
}

.media-compact-meta {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

@media (max-width: 768px) {
  .media-card-list {
    grid-template-columns: 1fr; /* 小屏改为一列 */
  }

  .media-card-row {
    flex-direction: column;
  }

  .media-card-row-poster {
    width: 100%;
  }

  .media-compact-row {
    padding: 8px 10px;
  }
}
</style>


