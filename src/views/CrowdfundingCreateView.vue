<template>
  <MainContentLayout>
    <template #content>
      <div class="create-view">
        <div class="page-header">
          <h1 class="page-title">
            发起创意众筹项目
          </h1>
          <p class="page-description">
            分享你的创意想法，让社区一起支持你实现梦想
          </p>
        </div>

        <CreateCrowdfundingProject
          v-model:visible="dialogVisible"
          @success="handleSuccess"
        />

        <!-- 页面内容在对话框中 -->
        <div v-if="!dialogVisible" class="empty-state">
          <el-empty description="准备发起你的创意项目">
            <el-button type="primary" size="large" @click="dialogVisible = true">
              <el-icon><Plus /></el-icon>
              开始创建项目
            </el-button>
          </el-empty>
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 创建指南 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            创建项目指南
          </div>
          <div class="guide-steps">
            <div class="step-item active">
              <div class="step-number">
                1
              </div>
              <div class="step-content">
                <div class="step-title">
                  准备项目资料
                </div>
                <div class="step-desc">
                  确定项目理念、目标金额、时间等基本信息
                </div>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">
                2
              </div>
              <div class="step-content">
                <div class="step-title">
                  设置支持档位
                </div>
                <div class="step-desc">
                  设计不同的支持金额和对应回报
                </div>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">
                3
              </div>
              <div class="step-content">
                <div class="step-title">
                  提交审核
                </div>
                <div class="step-desc">
                  项目将经过审核，审核通过后开始众筹
                </div>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">
                4
              </div>
              <div class="step-content">
                <div class="step-title">
                  项目上线
                </div>
                <div class="step-desc">
                  获得社区支持，实现你的创意
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 注意事项 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            注意事项
          </div>
          <div class="tips-list">
            <div class="tip-item">
              <el-icon><Warning /></el-icon>
              <span>项目一旦开始众筹，不可修改基本信息</span>
            </div>
            <div class="tip-item">
              <el-icon><InfoFilled /></el-icon>
              <span>请如实描述项目内容和风险</span>
            </div>
            <div class="tip-item">
              <el-icon><Clock /></el-icon>
              <span>审核时间通常为1-3个工作日</span>
            </div>
            <div class="tip-item">
              <el-icon><Money /></el-icon>
              <span>平台将收取5%的成功手续费</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import CreateCrowdfundingProject from '@/components/CreateCrowdfundingProject.vue'
  import { Plus, Warning, InfoFilled, Clock, Money } from '@element-plus/icons-vue'

  const router = useRouter()
  const dialogVisible = ref(true)

  const handleSuccess = (projectId) => {
    ElMessage.success('项目创建成功！正在跳转到项目页面...')
    setTimeout(() => {
      router.push(`/crowdfunding/project/${projectId}`)
    }, 1500)
  }
</script>

<style scoped>
.create-view {
  min-height: 600px;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px 0;
}

.page-description {
  font-size: 16px;
  color: #606266;
  margin: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

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

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  opacity: 0.6;
}

.step-item.active {
  opacity: 1;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.step-desc {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  transition: color 0.3s ease;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.tip-item .el-icon {
  color: #E6A23C;
  margin-top: 1px;
  flex-shrink: 0;
}
</style>
