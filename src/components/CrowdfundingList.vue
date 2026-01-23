<template>
  <div class="crowdfunding-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">
        创意周边众筹
      </h1>
      <p class="page-description">
        支持你喜欢的创意项目，发现独特周边
      </p>

      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索项目..."
          style="width: 300px"
          clearable
          @input="debouncedSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-button
          v-if="userStore.isLoggedIn"
          type="primary"
          @click="showCreateDialog = true"
        >
          <el-icon><Plus /></el-icon>
          发起项目
        </el-button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filters-section">
      <div class="filter-tabs">
        <div class="filter-group">
          <label class="filter-label">状态:</label>
          <el-tabs v-model="activeStatus" @tab-click="handleStatusChange">
            <el-tab-pane label="全部" name="" />
            <el-tab-pane label="众筹中" name="active" />
            <el-tab-pane label="已成功" name="successful" />
            <el-tab-pane label="已结束" name="failed" />
          </el-tabs>
        </div>

        <div class="filter-group">
          <label class="filter-label">分类:</label>
          <el-select
            v-model="selectedCategory"
            placeholder="选择分类"
            clearable
            @change="handleCategoryChange"
          >
            <el-option label="全部" value="" />
            <el-option label="手办模型" value="手办模型" />
            <el-option label="动漫周边" value="动漫周边" />
            <el-option label="服饰配件" value="服饰配件" />
            <el-option label="海报挂画" value="海报挂画" />
            <el-option label="其他创意" value="其他创意" />
          </el-select>
        </div>

        <div class="filter-group">
          <label class="filter-label">排序:</label>
          <el-select v-model="sortBy" @change="handleSortChange">
            <el-option label="最新发布" value="created_at" />
            <el-option label="热门项目" value="popular" />
            <el-option label="即将结束" value="ending_soon" />
            <el-option label="筹款最多" value="most_funded" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 项目列表 -->
    <div class="projects-section">
      <div v-if="loading" class="loading-section">
        <el-skeleton
          v-for="i in 8"
          :key="i"
          :loading="loading"
          animated
          class="project-skeleton"
        >
          <template #template>
            <el-skeleton-item variant="image" style="width: 100%; height: 200px;" />
            <div style="padding: 14px;">
              <el-skeleton-item variant="h3" style="width: 50%;" />
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px;">
                <el-skeleton-item variant="text" style="margin-right: 16px;" />
                <el-skeleton-item variant="text" style="width: 30%;" />
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>

      <div v-else-if="projects.length === 0" class="empty-section">
        <el-empty description="暂无项目">
          <el-button
            v-if="userStore.isLoggedIn"
            type="primary"
            @click="showCreateDialog = true"
          >
            发起第一个项目
          </el-button>
        </el-empty>
      </div>

      <div v-else class="projects-grid">
        <crowdfunding-card
          v-for="project in projects"
          :key="project.id"
          :project="project"
          @click="goToProject(project)"
        />
      </div>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[12, 24, 36]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 创建项目对话框 -->
    <create-crowdfunding-project
      v-model:visible="showCreateDialog"
      @success="handleProjectCreated"
    />

    <!-- 推荐项目 -->
    <div v-if="featuredProjects.length > 0" class="featured-section">
      <h2 class="section-title">
        精选项目
      </h2>
      <div class="featured-grid">
        <crowdfunding-card
          v-for="project in featuredProjects"
          :key="project.id"
          :project="project"
          @click="goToProject(project)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Search, Plus } from '@element-plus/icons-vue'
  import { listCrowdfundingProjects } from '@/axios/crowdfunding'
  import { useUserStore } from '@/stores/user'
  import CrowdfundingCard from './CrowdfundingCard.vue'
  import CreateCrowdfundingProject from './CreateCrowdfundingProject.vue'

  const router = useRouter()
  const userStore = useUserStore()

  // 数据状态
  const projects = ref([])
  const featuredProjects = ref([])
  const loading = ref(false)
  const total = ref(0)

  // 筛选状态
  const activeStatus = ref('')
  const selectedCategory = ref('')
  const sortBy = ref('created_at')
  const searchKeyword = ref('')
  const currentPage = ref(1)
  const pageSize = ref(12)

  // 对话框状态
  const showCreateDialog = ref(false)

  // 防抖搜索
  let searchTimer = null
  const debouncedSearch = () => {
    if (searchTimer) {
      clearTimeout(searchTimer)
    }
    searchTimer = setTimeout(() => {
      currentPage.value = 1
      loadProjects()
    }, 500)
  }

  // 加载项目列表
  const loadProjects = async () => {
    loading.value = true
    try {
      const params = {
        status: activeStatus.value,
        category: selectedCategory.value,
        keyword: searchKeyword.value,
        sort: sortBy.value,
        page: currentPage.value,
        pageSize: pageSize.value
      }

      const response = await listCrowdfundingProjects(params)
      // request 实例在拦截器里已 `return res.data`，这里的 response 就是后端返回体
      if (response.success) {
        projects.value = response.data?.list || []
        total.value = response.data?.total || 0
      }
    } catch (error) {
      console.error('加载项目列表失败:', error)
      ElMessage.error('加载项目列表失败')
    } finally {
      loading.value = false
    }
  }

  // 加载精选项目
  const loadFeaturedProjects = async () => {
    try {
      const response = await listCrowdfundingProjects({
        status: 'active',
        page: 1,
        pageSize: 4,
        sort: 'popular'
      })
      if (response.success) {
        featuredProjects.value = response.data?.list || []
      }
    } catch (error) {
      console.error('加载精选项目失败:', error)
    }
  }

  // 处理状态切换
  const handleStatusChange = () => {
    currentPage.value = 1
    loadProjects()
  }

  // 处理分类切换
  const handleCategoryChange = () => {
    currentPage.value = 1
    loadProjects()
  }

  // 处理排序切换
  const handleSortChange = () => {
    currentPage.value = 1
    loadProjects()
  }

  // 处理页码变化
  const handleCurrentChange = (page) => {
    currentPage.value = page
    loadProjects()
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 处理每页数量变化
  const handleSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = 1
    loadProjects()
  }

  // 跳转到项目详情
  const goToProject = (project) => {
    router.push(`/crowdfunding/project/${project.id}`)
  }

  // 处理项目创建成功
  const handleProjectCreated = (projectId) => {
    ElMessage.success('项目创建成功！')
    showCreateDialog.value = false
    // 刷新项目列表
    loadProjects()
    // 跳转到新创建的项目
    nextTick(() => {
      router.push(`/crowdfunding/project/${projectId}`)
    })
  }

  onMounted(() => {
    loadProjects()
    loadFeaturedProjects()
  })
</script>

<style scoped>
.crowdfunding-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
}

.header-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filters-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-soft);
}

.filter-tabs {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}

:deep(.el-tabs) {
  --el-tabs-header-height: 40px;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__item) {
  font-size: 14px;
  padding: 0 16px;
}

.projects-section {
  margin-bottom: 48px;
}

.loading-section {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.project-skeleton {
  border-radius: 8px;
  overflow: hidden;
}

.empty-section {
  text-align: center;
  padding: 60px 0;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.featured-section {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-soft);
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .crowdfunding-list {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .header-actions {
    flex-direction: column;
    gap: 12px;
  }

  .header-actions .el-input {
    width: 100% !important;
  }

  .filter-tabs {
    flex-direction: column;
    gap: 16px;
  }

  .filter-group {
    width: 100%;
  }

  .filter-label {
    min-width: 60px;
  }

  .projects-grid,
  .featured-grid {
    grid-template-columns: 1fr;
  }

  .loading-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-header {
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-description {
    font-size: 14px;
  }

  .filters-section {
    padding: 16px;
  }

  .featured-section {
    padding: 16px;
  }
}
</style>
