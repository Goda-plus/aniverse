<template>
  <div class="empty-state">
    <div class="empty-icon">
      ⭐
    </div>
    <div class="empty-title">
      已保存
    </div>
    <div class="empty-description">
      暂无内容
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.empty-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
  transition: color 0.3s ease;
}
</style>

