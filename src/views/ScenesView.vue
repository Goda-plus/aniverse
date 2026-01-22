<template>
  <MainContentLayout>
    <template #content>
      <div class="page">
        <div class="section-title">
          名场面标注
        </div>
        <p class="meta-text">
          结构化展示作品、时间点、台词与标签，示例为本地模拟。
        </p>

        <el-row :gutter="16">
          <el-col v-for="scene in store.scenes" :key="scene.id" :md="12" :xs="24">
            <el-card class="card scene" shadow="hover">
              <img :src="scene.cover" alt="" class="cover">
              <div class="scene-body">
                <div class="scene-title">
                  {{ scene.title }}
                </div>
                <div class="meta-text">
                  {{ scene.work }} · {{ scene.position }}
                </div>
                <div class="dialog">
                  "{{ scene.dialog }}"
                </div>
                <div class="tags">
                  <el-tag v-for="tag in scene.tags" :key="tag" size="small">
                    {{ tag }}
                  </el-tag>
                </div>
                <el-button type="primary" size="small" plain>
                  提交补充
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <div class="sidebar-card">
          <div class="sidebar-title">
            热门社区
          </div>
          <div class="community-item">
            <div class="community-icon">
              <el-icon><PictureRounded /></el-icon>
            </div>
            <div class="community-info">
              <div class="community-name">
                r/名场面
              </div>
              <div class="community-members">
                5,598,208 位成员
              </div>
            </div>
          </div>
          <el-button text class="view-more-btn">
            查看更多内容
          </el-button>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { useDataStore } from '@/stores/data'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { PictureRounded } from '@element-plus/icons-vue'

  const store = useDataStore()
</script>

<style scoped>
.page {
  padding: 12px 18px 32px;
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 4px;
  padding: 12px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.community-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 4px;
}

.community-item:hover {
  background: var(--bg-hover);
}

.community-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 16px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.community-info {
  flex: 1;
}

.community-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.community-members {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.view-more-btn {
  width: 100%;
  margin-top: 8px;
  color: #ff4500;
  font-size: 12px;
  font-weight: 600;
}

.view-more-btn:hover {
  background: var(--bg-hover);
}

.scene {
  padding: 0;
  overflow: hidden;
  margin-bottom: 12px;
}

.cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.scene-body {
  padding: 12px 14px 16px;
}

.scene-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.dialog {
  margin: 8px 0 10px;
  font-weight: 500;
}

.tags {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
</style>



