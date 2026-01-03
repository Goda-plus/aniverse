<template>
  <MainContentLayout>
    <template #content>
      <div class="page">
        <div class="section-title">
          创意周边众筹
        </div>
        <p class="meta-text">
          展示众筹项目进度与支持档位，点击档位按钮模拟支持。
        </p>

        <el-row :gutter="16">
          <el-col v-for="project in store.crowds" :key="project.id" :md="12" :xs="24">
            <el-card shadow="hover" class="card project">
              <img :src="project.cover" alt="" class="cover">
              <div class="body">
                <div class="name">
                  {{ project.title }}
                </div>
                <div class="meta-text">
                  已筹 ￥{{ project.raised }} / 目标 ￥{{ project.goal }} · 剩余 {{ project.daysLeft }} 天
                </div>
                <el-progress :percentage="Math.min(100, Math.round(project.raised / project.goal * 100))" />
                <div class="meta-text">
                  支持者：{{ project.supporters }}
                </div>
                <div class="rewards">
                  <el-button
                    v-for="reward in project.rewards"
                    :key="reward.name"
                    size="small"
                    plain
                    @click="store.supportCrowd(project.id, reward)"
                  >
                    {{ reward.name }} · ￥{{ reward.amount }}
                  </el-button>
                </div>
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
              <el-icon><Coin /></el-icon>
            </div>
            <div class="community-info">
              <div class="community-name">
                r/众筹
              </div>
              <div class="community-members">
                744,425 位成员
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
  import { Coin } from '@element-plus/icons-vue'

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

.project {
  padding: 0;
  overflow: hidden;
  margin-bottom: 12px;
}

.cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.body {
  padding: 12px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.name {
  font-weight: 700;
}

.rewards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>



