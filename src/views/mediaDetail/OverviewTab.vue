<template>
  <div class="overview-section">
    <h2 class="section-title">Overview</h2>

    <p v-if="media?.description" class="media-description">
      {{ media.description }}
    </p>
    <p v-else class="media-description empty">
      暂无简介。
    </p>
  </div>
</template>

<script setup>
  import { inject, computed } from 'vue'

  const injected = inject('mediaDetail', null)
  const media = computed(() => injected?.value ?? injected ?? null)
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
</style>


