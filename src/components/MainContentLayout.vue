<template>
  <div class="main-content-wrapper setting-control">
    <div class="content-container">
      <!-- 中间内容区域 -->
      <div class="main-content">
        <slot name="content" />
      </div>

      <!-- 右侧栏 -->
      <aside class="right-sidebar" :class="{ 'hidden': !sidebar }">
        <slot name="sidebar" />
      </aside>
    </div>

    <!-- 底部栏 -->
    <div class="bottom-bar" :class="{ 'hidden': showBottomBar }">
      <slot name="bottom" />
    </div>
  </div>
</template>

<script setup>
  import { defineProps } from 'vue'
  const props = defineProps({
    sidebar: {
      type: Boolean,
      default: true
    },
    showBottomBar: {
      type: Boolean,
      default: false
    }
  })
</script>

<style scoped>
.main-content-wrapper {
  margin: 0 auto;
  padding: 20px 24px;
  min-height: 100vh;
}

.content-container {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.right-sidebar {
  width: 312px;
  flex-shrink: 0;
}

.right-sidebar.hidden {
  display: none;
}

.bottom-bar {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--card-border);
}

.bottom-bar.hidden {
  display: none;
}

/* 响应式设计 */
@media (max-width: 960px) {
  .right-sidebar {
    display: none;
  }
  
  .main-content-wrapper {
    padding: 16px;
  }
}
</style>

