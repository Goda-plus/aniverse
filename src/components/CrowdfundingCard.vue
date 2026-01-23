<template>
  <el-card shadow="hover" class="crowdfunding-card" @click="goToDetail">
    <div class="project-image-wrapper">
      <el-image
        :src="project.cover_image || '/placeholder.png'"
        :alt="project.title"
        class="project-image"
        fit="cover"
        :lazy="true"
      >
        <template #error>
          <div class="image-slot">
            <el-icon><Picture /></el-icon>
          </div>
        </template>
      </el-image>
      <div class="project-status">
        <el-tag :type="statusType" size="small">
          {{ statusText }}
        </el-tag>
      </div>
      <div class="progress-overlay">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: project.progress_percentage + '%' }" />
        </div>
        <div class="progress-text">
          {{ project.progress_percentage }}% 达成
        </div>
      </div>
    </div>

    <div class="project-info">
      <h3 class="project-title" :title="project.title">
        {{ project.title }}
      </h3>
      <p class="project-creator">
        发起人: {{ project.creator_name }}
      </p>
      <p v-if="project.description" class="project-description" :title="project.description">
        {{ project.description.length > 80 ? project.description.substring(0, 80) + '...' : project.description }}
      </p>

      <div class="project-stats">
        <div class="stat-item">
          <span class="stat-value">￥{{ formatNumber(project.current_amount) }}</span>
          <span class="stat-label">已筹集</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ project.backer_count }}</span>
          <span class="stat-label">支持者</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ project.days_remaining }}</span>
          <span class="stat-label">天剩余</span>
        </div>
      </div>

      <div class="project-goal">
        <span class="goal-text">目标: ￥{{ formatNumber(project.goal_amount) }}</span>
      </div>
    </div>
  </el-card>
</template>

<script setup>
  import { computed,defineProps } from 'vue'
  import { useRouter } from 'vue-router'
  import { Picture } from '@element-plus/icons-vue'

  const router = useRouter()

  const props = defineProps({
    project: {
      type: Object,
      required: true
    }
  })

  const statusType = computed(() => {
    const statusMap = {
      'active': 'success',
      'successful': 'success',
      'failed': 'danger',
      'pending_review': 'warning',
      'draft': 'info',
      'cancelled': 'info'
    }
    return statusMap[props.project.status] || 'info'
  })

  const statusText = computed(() => {
    const statusMap = {
      'active': '众筹中',
      'successful': '已成功',
      'failed': '已失败',
      'pending_review': '审核中',
      'draft': '草稿',
      'cancelled': '已取消'
    }
    return statusMap[props.project.status] || '未知状态'
  })

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
  }

  const goToDetail = () => {
    router.push(`/crowdfunding/project/${props.project.id}`)
  }
</script>

<style scoped>
.crowdfunding-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.crowdfunding-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.project-image-wrapper {
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.project-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 24px;
}

.project-status {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

.progress-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  padding: 8px;
  color: white;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  text-align: center;
}

.project-info {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.project-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-creator {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.project-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 0 16px 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.project-goal {
  text-align: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.goal-text {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .project-image-wrapper {
    height: 150px;
  }

  .project-title {
    font-size: 14px;
  }

  .project-description {
    font-size: 13px;
  }

  .stat-value {
    font-size: 14px;
  }

  .project-stats {
    margin-bottom: 8px;
  }
}
</style>
