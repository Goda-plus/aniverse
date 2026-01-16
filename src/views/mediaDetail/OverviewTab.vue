<template>
  <div class="overview-section">
    <h2 class="section-title">
      Overview
    </h2>

    <!-- 简介 -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p
      v-if="media?.description"
      class="media-description"
      v-html="media.description"
    />
    <p v-else class="media-description empty">
      暂无简介。
    </p>

    <!-- 概览下方信息区域 -->
    <div v-if="media" class="overview-layout">
      <!-- 左侧信息栏 -->
      <aside class="info-sidebar">
        <div
          v-for="item in sidebarInfo"
          :key="item.label"
          class="info-item"
        >
          <div class="info-label">
            {{ item.label }}
          </div>
          <div class="info-value">
            {{ item.value }}
          </div>
        </div>
      </aside>

      <!-- 右侧 Relations + Characters 复用 CharactersTab 样式 -->
      <div class="overview-main">
        <section
          v-if="media.relations && media.relations.length"
          class="relations-section"
        >
          <h3 class="sub-title">
            Relations
          </h3>
          <div class="relations-list">
            <div
              v-for="relation in media.relations"
              :key="relation.id"
              class="relation-card"
            >
              <div class="relation-cover">
                <img
                  :src="relation.cover_image_medium || '/placeholder.jpg'"
                  :alt="relation.title_native || relation.title_english || 'Relation cover'"
                >
              </div>
              <div class="relation-info">
                <div class="relation-type">
                  {{ formatRelationType(relation.relation_type) }}
                </div>
                <div class="relation-title">
                  {{ relation.title_native || relation.title_english || 'Unknown' }}
                </div>
                <div class="relation-meta">
                  {{ relation.format || '' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 使用 CharactersTab 展示角色（完整列表，与 Characters 标签页样式一致） -->
        <CharactersTab />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { inject, computed } from 'vue'
  import CharactersTab from './CharactersTab.vue'

  const injected = inject('mediaDetail', null)
  const media = computed(() => injected?.value ?? injected ?? null)

  // 左侧信息栏数据，仿 AniList 概览
  const sidebarInfo = computed(() => {
    const m = media.value
    if (!m) return []

    const seasonMap = {
      SPRING: 'Spring',
      SUMMER: 'Summer',
      FALL: 'Fall',
      WINTER: 'Winter'
    }

    const items = []

    if (m.status) {
      items.push({
        label: 'Status',
        value: m.status
      })
    }

    if (m.episodes) {
      items.push({
        label: 'Episodes',
        value: `${m.episodes}${m.duration ? ` · ${m.duration} mins` : ''}`
      })
    } else if (m.duration) {
      items.push({
        label: 'Duration',
        value: `${m.duration} mins`
      })
    }

    if (m.start_date) {
      items.push({
        label: 'Start Date',
        value: m.start_date
      })
    }

    if (m.end_date) {
      items.push({
        label: 'End Date',
        value: m.end_date
      })
    }

    if (m.season_year || m.season) {
      const seasonText = m.season
        ? `${seasonMap[m.season] || m.season}`
        : ''
      const yearText = m.season_year || m.year || ''
      items.push({
        label: 'Season',
        value: [seasonText, yearText].filter(Boolean).join(' ')
      })
    }

    if (m.average_score != null) {
      items.push({
        label: 'Average Score',
        value: `${Math.round(m.average_score)}%`
      })
    }

    if (m.mean_score != null) {
      items.push({
        label: 'Mean Score',
        value: `${Math.round(m.mean_score)}%`
      })
    }

    if (m.popularity != null) {
      items.push({
        label: 'Popularity',
        value: m.popularity
      })
    }

    if (m.favourites != null) {
      items.push({
        label: 'Favorites',
        value: m.favourites
      })
    }

    if (m.studios && Array.isArray(m.studios) && m.studios.length) {
      const studiosText = m.studios
        .map((s) => (typeof s === 'string' ? s : s.name || ''))
        .filter(Boolean)
        .join(', ')

      if (studiosText) {
        items.push({
          label: 'Studios',
          value: studiosText
        })
      }
    }

    return items
  })

  const formatRelationType = (type) => {
    if (!type) return ''
    const map = {
      SOURCE: 'Source',
      ALTERNATIVE: 'Alternative'
    }
    if (map[type]) return map[type]
    return String(type).charAt(0) + String(type).slice(1).toLowerCase()
  }

</script>

<style scoped>
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

.overview-layout {
  display: flex;
  gap: 24px;
  margin-top: 24px;
  align-items: flex-start;
}

.info-sidebar {
  flex: 0 0 260px;
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(55, 65, 81, 0.9);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
}

.info-item + .info-item {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(31, 41, 55, 0.9);
}

.info-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(156, 163, 175, 0.9);
  margin-bottom: 2px;
}

.info-value {
  font-size: 13px;
  color: #e5e7eb;
}

.overview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sub-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.relations-section {
  background: rgba(15, 23, 42, 0.9);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(55, 65, 81, 0.9);
}

.relations-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.relation-card {
  display: flex;
  width: 260px;
  background: rgba(15, 23, 42, 0.95);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(55, 65, 81, 0.9);
}

.relation-cover {
  flex: 0 0 72px;
  background: var(--bg-tertiary);
}

.relation-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.relation-info {
  flex: 1;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.relation-type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(156, 163, 175, 0.95);
}

.relation-title {
  font-size: 13px;
  font-weight: 600;
  color: #f9fafb;
}

.relation-meta {
  font-size: 11px;
  color: rgba(209, 213, 219, 0.85);
}

@media (max-width: 900px) {
  .overview-layout {
    flex-direction: column;
  }

  .info-sidebar {
    width: 100%;
  }

  .relations-list {
    flex-direction: column;
  }

  .relation-card {
    width: 100%;
  }
}
</style>

