<template>
  <MainContentLayout>
    <template #content>
      <CrowdfundingProjectDetail />
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 项目进度 -->
        <div v-if="project" class="sidebar-card">
          <div class="sidebar-title">
            项目进度
          </div>
          <div class="progress-info">
            <div class="progress-item">
              <span class="label">已筹集:</span>
              <span class="value">￥{{ formatNumber(project.current_amount) }}</span>
            </div>
            <div class="progress-item">
              <span class="label">目标:</span>
              <span class="value">￥{{ formatNumber(project.goal_amount) }}</span>
            </div>
            <div class="progress-item">
              <span class="label">达成率:</span>
              <span class="value">{{ project.progress_percentage }}%</span>
            </div>
            <div class="progress-item">
              <span class="label">剩余时间:</span>
              <span class="value">{{ project.days_remaining }}天</span>
            </div>
            <div class="progress-item">
              <span class="label">支持者:</span>
              <span class="value">{{ project.backer_count }}人</span>
            </div>
          </div>
        </div>

        <!-- 发起人信息 -->
        <div v-if="project" class="sidebar-card">
          <div class="sidebar-title">
            关于发起人
          </div>
          <div class="creator-info">
            <el-avatar :src="project.creator_avatar" size="large" />
            <div class="creator-details">
              <div class="creator-name">
                {{ project.creator_name }}
              </div>
              <div class="creator-stats">
                <span>发起项目: {{ creatorStats.totalProjects }}</span>
                <span>成功项目: {{ creatorStats.successfulProjects }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分享 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            分享项目
          </div>
          <div class="share-buttons">
            <el-button type="primary" plain @click="shareToWechat">
              <el-icon><Share /></el-icon>
              微信分享
            </el-button>
            <el-button plain @click="copyLink">
              <el-icon><Link /></el-icon>
              复制链接
            </el-button>
            <el-button plain @click="shareToWeibo">
              <el-icon><ChatDotRound /></el-icon>
              微博分享
            </el-button>
          </div>
        </div>

        <!-- 相关项目 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            相关项目
          </div>
          <div class="related-projects">
            <div
              v-for="relatedProject in relatedProjects"
              :key="relatedProject.id"
              class="related-item"
              @click="$router.push(`/crowdfunding/project/${relatedProject.id}`)"
            >
              <el-image
                :src="relatedProject.cover_image"
                class="related-image"
                fit="cover"
              >
                <template #error>
                  <div class="image-slot">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="related-info">
                <div class="related-title">
                  {{ relatedProject.title }}
                </div>
                <div class="related-progress">
                  <el-progress
                    :percentage="relatedProject.progress_percentage"
                    :show-text="false"
                    :stroke-width="3"
                  />
                  <span>{{ relatedProject.progress_percentage }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, computed, inject, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import CrowdfundingProjectDetail from '@/components/CrowdfundingProjectDetail.vue'
  import { Share, Link, ChatDotRound, Picture } from '@element-plus/icons-vue'
  import { listCrowdfundingProjects, getCrowdfundingCreatorStats } from '@/axios/crowdfunding'

  const route = useRoute()

  // 从子组件获取项目数据
  const projectData = inject('projectData', ref(null))
  const project = computed(() => projectData?.value || null)
  
  const creatorStats = ref({
    totalProjects: 0,
    successfulProjects: 0
  })
  const relatedProjects = ref([])

  // 加载相关项目
  const loadRelatedProjects = async () => {
    if (!project.value) return
    try {
      const response = await listCrowdfundingProjects({
        category: project.value.category,
        status: 'active',
        page: 1,
        pageSize: 3,
        exclude: project.value.id
      })
      if (response.success) {
        relatedProjects.value = (response.data?.list || []).filter(p => p.id !== project.value.id).slice(0, 3)
      }
    } catch (error) {
      console.error('加载相关项目失败:', error)
    }
  }

  // 加载发起人统计
  const loadCreatorStats = async () => {
    if (!project.value) return
    try {
      const response = await getCrowdfundingCreatorStats(project.value.creator_id)
      if (response.success) {
        creatorStats.value = response.data
      }
    } catch (error) {
      console.error('加载发起人统计失败:', error)
    }
  }

  // 监听项目数据变化
  watch(project, (newProject) => {
    if (newProject) {
      loadRelatedProjects()
      loadCreatorStats()
    }
  }, { immediate: true })

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
  }

  const shareToWechat = () => {
    ElMessage.info('请使用浏览器分享功能分享到微信')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      ElMessage.success('链接已复制到剪贴板')
    } catch (error) {
      ElMessage.error('复制失败，请手动复制链接')
    }
  }

  const shareToWeibo = () => {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(`发现一个有趣的众筹项目：${project.value?.title || ''}`)
    const shareUrl = `https://service.weibo.com/share/share.php?url=${url}&title=${title}`
    window.open(shareUrl, '_blank', 'width=600,height=400')
  }
</script>

<style scoped>
.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  transition: color 0.3s ease;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.progress-item .label {
  font-size: 14px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.progress-item .value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.creator-details {
  flex: 1;
}

.creator-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.creator-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.share-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.share-buttons .el-button {
  justify-content: flex-start;
}

.related-projects {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.related-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.related-item:hover {
  background: var(--bg-hover);
}

.related-image {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  flex-shrink: 0;
}

.image-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 16px;
}

.related-info {
  flex: 1;
}

.related-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.related-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.related-progress span {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}
</style>
