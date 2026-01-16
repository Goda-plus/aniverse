<template>
  <el-tooltip
    v-if="!selectable"
    :content="tooltipContent"
    placement="top"
    :show-after="300"
    :hide-after="0"
    :offset="10"
    popper-class="media-card-tooltip"
    raw-content
  >
    <div 
      :class="['media-card', { 'is-selected': selected, 'is-selectable': selectable }]" 
      @click="handleClick"
    >
      <div class="media-poster" :style="posterStyle">
        <img
          :src="media.cover_image_large || media.cover || media.poster || '/placeholder.jpg'"
          :alt="mediaTitle"
          :class="{ 'is-loaded': isImageLoaded }"
          @load="handleImageLoad"
          @error="handleImageError"
        >
        <div v-if="selectable && selected" class="media-selected-indicator">
          <el-icon><Check /></el-icon>
        </div>
      </div>
      <div class="media-info">
        <h3 class="media-title" :title="mediaTitle">
          {{ mediaTitle }}
        </h3>
      </div>
    </div>
  </el-tooltip>
  <div
    v-else
    :class="['media-card', { 'is-selected': selected, 'is-selectable': selectable }]" 
    @click="handleClick"
  >
    <div class="media-poster" :style="posterStyle">
      <img
        :src="media.cover_image_large || media.cover || media.poster || '/placeholder.jpg'"
        :alt="mediaTitle"
        :class="{ 'is-loaded': isImageLoaded }"
        @load="handleImageLoad"
        @error="handleImageError"
      >
      <div v-if="selectable && selected" class="media-selected-indicator">
        <el-icon><Check /></el-icon>
      </div>
    </div>
    <div class="media-info">
      <h3 class="media-title" :title="mediaTitle">
        {{ mediaTitle }}
      </h3>
    </div>
  </div>
</template>

<script setup>
  import { defineProps, defineEmits, computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { Check } from '@element-plus/icons-vue'

  const props = defineProps({
    media: {
      type: Object,
      required: true
    },
    selectable: {
      type: Boolean,
      default: false
    },
    selected: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['select', 'click'])

  const router = useRouter()

  const isImageLoaded = ref(false)

  const posterStyle = computed(() => {
    const color = props.media.cover_image_color
    return {
      backgroundColor: color 
    }
  })

  // 获取标题（优先使用 title_native，否则使用 title）
  const mediaTitle = computed(() => {
    return props.media.title_native || props.media.title || props.media.title_english || 'Unknown'
  })

  // 赛季文案，例如 "Summer 2025"
  const seasonText = computed(() => {
    const year = props.media.season_year || props.media.year
    const season = props.media.season

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
    return null
  })

  // 格式化评分（0-100 分）
  const formatScore = computed(() => {
    if (props.media.average_score) {
      return Math.round(props.media.average_score)
    }
    return null
  })

  // 格式化集数信息
  const formatEpisodes = computed(() => {
    if (props.media.episodes) {
      return `${props.media.episodes} ${props.media.episodes === 1 ? 'episode' : 'episodes'}`
    }
    return null
  })

  // 格式化格式显示
  const formatType = computed(() => {
    const format = props.media.format
    if (!format) return null
    
    const formatMap = {
      'TV': 'TV Show',
      'MOVIE': 'Movie',
      'OVA': 'OVA',
      'ONA': 'ONA',
      'SPECIAL': 'Special'
    }
    return formatMap[format] || format
  })

  // 获取工作室信息
  const studios = computed(() => {
    if (props.media.studios && props.media.studios.length > 0) {
      return props.media.studios.map(s => s.name || s).join(', ')
    }
    return null
  })

  // 获取类型标签
  const genres = computed(() => {
    if (props.media.genres && props.media.genres.length > 0) {
      return props.media.genres.map(g => g.name || g).slice(0, 3)
    }
    return []
  })

  // 构建 tooltip 内容
  const tooltipContent = computed(() => {
    const parts = []

    // 头部：左边标题+副标题，右边评分圆圈
    parts.push('<div class="tooltip-header">')
    parts.push('<div class="tooltip-header-left">')
    // 标题（赛季或作品名）
    parts.push(
      `<div class="tooltip-title">${seasonText.value || mediaTitle.value}</div>`
    )
    // 副标题（工作室）
    if (studios.value) {
      parts.push(`<div class="tooltip-subtitle">${studios.value}</div>`)
    }
    // 格式和集数
    const typeInfo = []
    if (formatType.value) {
      typeInfo.push(formatType.value)
    }
    if (formatEpisodes.value) {
      typeInfo.push(formatEpisodes.value)
    }
    if (typeInfo.length > 0) {
      parts.push(
        `<div class="tooltip-meta-row">${typeInfo.join(' • ')}</div>`
      )
    }
    parts.push('</div>') // tooltip-header-left

    // 右侧评分
    parts.push('<div class="tooltip-header-right">')
    if (formatScore.value !== null) {
      parts.push(
        `<div class="tooltip-score-circle"><span class="tooltip-score">${formatScore.value}%</span></div>`
      )
    }
    parts.push('</div>') // tooltip-header-right
    parts.push('</div>') // tooltip-header

    // 类型标签
    if (genres.value.length > 0) {
      const genreTags = genres.value.map(genre => 
        `<span class="tooltip-tag">${genre}</span>`
      ).join('')
      parts.push(`<div class="tooltip-tags">${genreTags}</div>`)
    }
    
    return parts.join('')
  })

  const handleClick = () => {
    if (props.selectable) {
      emit('select', props.media)
      emit('click', props.media)
    } else if (props.media.id) {
      router.push(`/media/${props.media.id}`)
    }
  }

  const handleImageLoad = () => {
    isImageLoaded.value = true
  }

  const handleImageError = () => {
    // 图片加载失败时保持使用占位背景色
    isImageLoaded.value = false
  }
</script>

<style scoped>
.media-card {
  cursor: pointer;
  transition: transform 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  transition: all 0.3s ease;
}

.media-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  border-color: var(--primary);
}

.media-poster {
  position: relative;
  width: 100%;
  padding-top: 142.857%; /* 7:10 aspect ratio */
  overflow: hidden;
  background: var(--bg-tertiary);
}

.media-poster img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.media-poster img.is-loaded {
  opacity: 1;
}

.media-card:hover .media-poster img {
  transform: scale(1.05);
}

.media-info {
  padding: 12px;
}

.media-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.3s ease;
}

.media-card:hover .media-title {
  color: var(--primary);
}

/* 选择模式样式 */
.media-card.is-selectable {
  position: relative;
}

.media-card.is-selectable.is-selected {
  border-color: var(--primary, #0079d3);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.media-selected-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: var(--primary, #0079d3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  color: white;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 121, 211, 0.3);
}

.media-poster {
  position: relative;
}
</style>

<style>
/* Tooltip 样式 */
.media-card-tooltip {
  max-width: 280px;
  padding: 16px !important;
  background: rgba(30, 30, 35, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.media-card-tooltip .tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.media-card-tooltip .tooltip-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-card-tooltip .tooltip-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.media-card-tooltip .tooltip-subtitle {
  font-size: 13px;
  color: #60a5fa;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.media-card-tooltip .tooltip-meta-row {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.media-card-tooltip .tooltip-header-right {
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-card-tooltip .tooltip-score-circle {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 2px solid #4ade80;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 163, 74, 0.12);
}

.media-card-tooltip .tooltip-score {
  font-size: 14px;
  font-weight: 700;
  color: #bbf7d0;
}

.media-card-tooltip .tooltip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.media-card-tooltip .tooltip-tag {
  display: inline-block;
  padding: 4px 10px;
  background: #facc15;
  border: 1px solid #fbbf24;
  border-radius: 12px;
  font-size: 11px;
  color: #1e293b;
  font-weight: 600;
}
</style>

