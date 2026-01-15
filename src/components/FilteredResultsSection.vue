<template>
  <div class="section-container">
    <div class="section-header">
      <h2 class="section-title">
        FILTERED RESULTS
      </h2>
      <span v-if="pagination?.total" class="result-count">
        {{ pagination.total }} results
      </span>
    </div>

    <div v-if="loading" class="media-grid">
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
      :items="items"
      :layout="layout"
    />
  </div>
</template>

<script setup>
  import { defineProps } from 'vue'
  import MediaList from '@/components/MediaList.vue'

  defineProps({
    items: {
      type: Array,
      default: () => []
    },
    layout: {
      type: String,
      default: 'grid'
    },
    loading: {
      type: Boolean,
      default: false
    },
    pagination: {
      type: Object,
      default: () => ({
        total: 0
      })
    }
  })
</script>

<style scoped>
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

@media (max-width: 1200px) {
  .media-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 768px) {
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


