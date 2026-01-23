<template>
  <MainContentLayout>
    <template #content>
      <CrowdfundingList />
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 众筹指南 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            众筹指南
          </div>
          <div class="guide-content">
            <div class="guide-item">
              <el-icon><DocumentAdd /></el-icon>
              <div class="guide-text">
                <strong>发起项目</strong>
                <p>分享你的创意想法，设置支持档位</p>
              </div>
            </div>
            <div class="guide-item">
              <el-icon><Star /></el-icon>
              <div class="guide-text">
                <strong>获得支持</strong>
                <p>社区成员支持你的项目，达成目标</p>
              </div>
            </div>
            <div class="guide-item">
              <el-icon><Box /></el-icon>
              <div class="guide-text">
                <strong>实现梦想</strong>
                <p>项目成功后开始制作，履行承诺</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 热门社区 -->
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

        <!-- 成功案例 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            成功案例
          </div>
          <div class="success-cases">
            <div
              v-for="caseItem in successCases"
              :key="caseItem.id"
              class="case-item"
            >
              <el-image
                :src="caseItem.image"
                class="case-image"
                fit="cover"
              >
                <template #error>
                  <div class="image-slot">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="case-info">
                <div class="case-title">
                  {{ caseItem.title }}
                </div>
                <div class="case-amount">
                  筹集 ￥{{ formatNumber(caseItem.amount) }}
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
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import CrowdfundingList from '@/components/CrowdfundingList.vue'
  import { DocumentAdd, Star, Box, Coin, Picture } from '@element-plus/icons-vue'
  import { ref } from 'vue'

  // 成功案例数据
  const successCases = ref([
    {
      id: 1,
      title: '原创动漫手办',
      amount: 250000,
      image: '/api/placeholder/80/80'
    },
    {
      id: 2,
      title: '定制周边T恤',
      amount: 150000,
      image: '/api/placeholder/80/80'
    },
    {
      id: 3,
      title: '艺术插画集',
      amount: 98000,
      image: '/api/placeholder/80/80'
    }
  ])

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(0) + '万'
    }
    return num.toString()
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

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.guide-item .el-icon {
  color: #409eff;
  margin-top: 2px;
  flex-shrink: 0;
}

.guide-text strong {
  display: block;
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.guide-text p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.community-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 6px;
}

.community-item:hover {
  background: var(--bg-hover);
}

.community-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
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
  margin-top: 12px;
  color: #409eff;
  font-size: 12px;
  font-weight: 600;
}

.view-more-btn:hover {
  background: var(--bg-hover);
}

.success-cases {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.case-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.case-item:hover {
  background: var(--bg-hover);
}

.case-image {
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

.case-info {
  flex: 1;
}

.case-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.case-amount {
  font-size: 12px;
  color: #67C23A;
  font-weight: 600;
}
</style>
