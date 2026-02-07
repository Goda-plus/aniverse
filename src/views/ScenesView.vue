<template>
  <MainContentLayout>
    <template #content>
      <div class="page">
        <div class="page-header">
          <div class="section-title">
            名场面标注
          </div>
          <p class="meta-text">
            共同建设动漫影视名场面数据库，为经典时刻添加结构化标注
          </p>
          <div class="page-actions">
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon><Plus /></el-icon>
              创建名场面
            </el-button>
          </div>
        </div>

        <!-- 搜索和筛选 -->
        <div class="search-section">
          <el-row :gutter="16">
            <el-col :md="8" :xs="24">
              <el-input
                v-model="searchQuery"
                placeholder="搜索名场面、台词或作品..."
                @input="handleSearch"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-col>
            <el-col :md="4" :xs="12">
              <el-select v-model="filterWork" placeholder="选择作品" clearable @change="handleSearch">
                <el-option
                  v-for="work in works"
                  :key="work.id"
                  :label="work.title"
                  :value="work.id"
                />
              </el-select>
            </el-col>
            <el-col :md="4" :xs="12">
              <el-select v-model="filterTag" placeholder="选择标签" clearable @change="handleSearch">
                <el-option
                  v-for="tag in tags"
                  :key="tag.id"
                  :label="tag.name"
                  :value="tag.id"
                />
              </el-select>
            </el-col>
            <el-col :md="4" :xs="12">
              <el-select v-model="sortBy" @change="handleSearch">
                <el-option label="最新发布" value="created_at" />
                <el-option label="最多点赞" value="likes_count" />
                <el-option label="最多收藏" value="favourites_count" />
                <el-option label="最多评论" value="comments_count" />
                <el-option label="最多浏览" value="views" />
              </el-select>
            </el-col>
            <el-col :md="4" :xs="12">
              <el-select v-model="sortOrder" @change="handleSearch">
                <el-option label="降序" value="DESC" />
                <el-option label="升序" value="ASC" />
              </el-select>
            </el-col>
          </el-row>
        </div>

        <!-- 名场面列表 -->
        <div class="scenes-list">
          <el-row :gutter="16">
            <el-col
              v-for="scene in scenes"
              :key="scene.id"
              :md="12"
              :lg="8"
              :xl="6"
              :xs="24"
            >
              <el-card class="scene-card" shadow="hover" @click="openSceneDetail(scene)">
                <div class="scene-cover">
                  <img :src="getSceneImageUrl(scene)" :alt="scene.title" class="cover-image">
                  <div class="scene-overlay">
                    <div class="scene-stats">
                      <span><el-icon><View /></el-icon> {{ scene.views }}</span>
                      <span><el-icon><Star /></el-icon> {{ scene.likes_count }}</span>
                    </div>
                  </div>
                </div>
                <div class="scene-content">
                  <h4 class="scene-title">{{ scene.title }}</h4>
                  <div class="scene-meta">
                    <span class="work-name">{{ scene.media_title }}</span>
                    <span v-if="scene.episode" class="episode"> · {{ scene.episode }}</span>
                    <span v-if="scene.time_position" class="time"> · {{ formatTime(scene.time_position) }}</span>
                  </div>
                  <div v-if="scene.quote_text" class="scene-quote">
                    "{{ scene.quote_text }}"
                  </div>
                  <div class="scene-description">{{ scene.description }}</div>
                  <div v-if="scene.tag_names && scene.tag_names.length" class="scene-tags">
                    <el-tag
                      v-for="tag in scene.tag_names"
                      :key="tag"
                      size="small"
                      type="info"
                    >
                      {{ tag }}
                    </el-tag>
                  </div>
                  <div class="scene-footer">
                    <div class="scene-author">
                      <span>由 {{ scene.submitter_username }} 提交</span>
                    </div>
                    <div class="scene-actions">
                      <el-button
                        size="small"
                        type="text"
                        @click.stop="toggleLike(scene)"
                        :class="{ liked: scene.liked }"
                      >
                        <el-icon><Star /></el-icon>
                        {{ scene.likes_count }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 分页 -->
          <div class="pagination-wrapper" v-if="totalPages > 1">
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

          <!-- 空状态 -->
          <div v-if="scenes.length === 0 && !loading" class="empty-state">
            <el-empty description="暂无名场面数据">
              <el-button type="primary" @click="showCreateDialog = true">
                创建第一个名场面
              </el-button>
            </el-empty>
          </div>
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 创建引导卡片 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            <el-icon><Lightbulb /></el-icon>
            如何创建名场面
          </div>
          <div class="guide-steps">
            <div class="guide-step">
              <div class="step-number">1</div>
              <div class="step-content">
                <div class="step-title">选择作品</div>
                <div class="step-desc">从动漫或影视作品中选择</div>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">2</div>
              <div class="step-content">
                <div class="step-title">上传媒体</div>
                <div class="step-desc">上传截图或GIF动图</div>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">3</div>
              <div class="step-content">
                <div class="step-title">填写信息</div>
                <div class="step-desc">添加标题、台词、描述等</div>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">4</div>
              <div class="step-content">
                <div class="step-title">提交审核</div>
                <div class="step-desc">等待管理员审核通过</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 热门标签 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            <el-icon><PriceTag /></el-icon>
            热门标签
          </div>
          <div class="tag-list">
            <el-tag
              v-for="tag in popularTags"
              :key="tag.id"
              size="small"
              @click="filterByTag(tag.id)"
              class="tag-item"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </div>

        <!-- 社区信息 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            <el-icon><PictureRounded /></el-icon>
            名场面社区
          </div>
          <div class="community-stats">
            <div class="stat-item">
              <div class="stat-number">{{ totalScenes }}</div>
              <div class="stat-label">名场面</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ totalWorks }}</div>
              <div class="stat-label">作品</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MainContentLayout>

  <!-- 创建名场面对话框 -->
  <SceneMomentCreateDialog
    v-model="showCreateDialog"
    @created="onSceneCreated"
  />

  <!-- 名场面详情抽屉 -->
  <SceneMomentDetailDrawer
    v-model="showDetailDrawer"
    :scene-id="selectedSceneId"
  />
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    Search,
    Plus,
    View,
    Star,
    Lightbulb,
    PriceTag,
    PictureRounded
  } from '@element-plus/icons-vue'

  import { useDataStore } from '@/stores/data'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import SceneMomentCreateDialog from '@/components/sceneMoment/SceneMomentCreateDialog.vue'
  import SceneMomentDetailDrawer from '@/components/sceneMoment/SceneMomentDetailDrawer.vue'

  import { searchSceneMoments, toggleSceneMomentLike } from '@/axios/sceneMoments'
  import { getMediaList } from '@/axios/media'
  import { getTagsList } from '@/axios/tags'

  const store = useDataStore()

  // 对话框状态
  const showCreateDialog = ref(false)
  const showDetailDrawer = ref(false)
  const selectedSceneId = ref(null)

  // 搜索和筛选
  const searchQuery = ref('')
  const filterWork = ref('')
  const filterTag = ref('')
  const sortBy = ref('created_at')
  const sortOrder = ref('DESC')

  // 分页
  const currentPage = ref(1)
  const pageSize = ref(12)
  const total = ref(0)
  const totalPages = ref(0)

  // 数据
  const scenes = ref([])
  const works = ref([])
  const tags = ref([])
  const popularTags = ref([])
  const loading = ref(false)

  // 统计数据
  const totalScenes = ref(0)
  const totalWorks = ref(0)
  const activeUsers = ref(0)

  // 格式化时间
  const formatTime = (seconds) => {
    if (!seconds) return ''
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 加载名场面列表
  const loadScenes = async () => {
    loading.value = true
    try {
      const params = {
        q: searchQuery.value,
        work_name: works.value.find(w => w.id === filterWork.value)?.title || '',
        tag_name: tags.value.find(t => t.id === filterTag.value)?.name || '',
        sort: sortBy.value,
        order: sortOrder.value,
        page: currentPage.value,
        pageSize: pageSize.value
      }

      const resp = await searchSceneMoments(params)
      if (resp.code === 200) {
        scenes.value = resp.data.list || []
        total.value = resp.data.pagination?.total || 0
        totalPages.value = resp.data.pagination?.totalPages || 0
      }
    } catch (e) {
      console.error('加载名场面失败:', e)
      ElMessage.error('加载失败')
    } finally {
      loading.value = false
    }
  }

  // 加载作品列表
  const loadWorks = async () => {
    try {
      const resp = await getMediaList({ page: 1, pageSize: 100 })
      if (resp.code === 200) {
        works.value = resp.data?.list || []
        totalWorks.value = works.value.length
      }
    } catch (e) {
      console.error('加载作品列表失败:', e)
    }
  }

  // 加载标签列表
  const loadTags = async () => {
    try {
      const resp = await getTagsList({ page: 1, pageSize: 50 })
      if (resp.code === 200) {
        tags.value = resp.data?.list || []
        // 取前10个作为热门标签
        popularTags.value = tags.value.slice(0, 10)
      }
    } catch (e) {
      console.error('加载标签列表失败:', e)
    }
  }

  // 搜索处理
  const handleSearch = () => {
    currentPage.value = 1
    loadScenes()
  }

  // 分页处理
  const handleSizeChange = (newSize) => {
    pageSize.value = newSize
    currentPage.value = 1
    loadScenes()
  }

  const handleCurrentChange = (newPage) => {
    currentPage.value = newPage
    loadScenes()
  }

  // 按标签筛选
  const filterByTag = (tagId) => {
    filterTag.value = tagId
    handleSearch()
  }

  // 点赞/取消点赞
  const toggleLike = async (scene) => {
    try {
      const resp = await toggleSceneMomentLike(scene.id)
      if (resp.code === 200) {
        scene.liked = resp.data.liked
        scene.likes_count = resp.data.likes_count
      }
    } catch (e) {
      ElMessage.error('操作失败')
    }
  }

  // 打开详情
  const openSceneDetail = (scene) => {
    selectedSceneId.value = scene.id
    showDetailDrawer.value = true
  }

  // 获取名场面图片URL（支持数组格式）
  const getSceneImageUrl = (scene) => {
    const img = scene.image_url
    if (Array.isArray(img) && img.length > 0) {
      return img[0]
    }
    if (typeof img === 'string' && img) {
      return img
    }
    return '/placeholder.jpg'
  }

  // 创建成功回调
  const onSceneCreated = (data) => {
    ElMessage.success('名场面创建成功！')
    loadScenes() // 重新加载列表
  }

  // 初始化
  onMounted(async () => {
    await Promise.all([
      loadScenes(),
      loadWorks(),
      loadTags()
    ])

    // 模拟统计数据
    totalScenes.value = total.value
    activeUsers.value = 128
  })
</script>

<style scoped>
.page {
  padding: 20px;
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-header .section-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.page-header .meta-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.page-actions {
  display: flex;
  justify-content: center;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
}

/* 名场面列表 */
.scenes-list {
  margin-top: 24px;
}

.scene-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
}

.scene-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.scene-cover {
  position: relative;
  width: 100%;
  height: 160px;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.scene-card:hover .cover-image {
  transform: scale(1.05);
}

.scene-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(transparent 60%, rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 0.3s;
}

.scene-card:hover .scene-overlay {
  opacity: 1;
}

.scene-stats {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: white;
}

.scene-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 8px;
  border-radius: 12px;
}

.scene-content {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.scene-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  line-height: 1.4;
}

.scene-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.work-name {
  font-weight: 500;
  color: var(--el-color-primary);
}

.episode, .time {
  color: var(--text-secondary);
}

.scene-quote {
  font-style: italic;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid var(--el-color-primary);
  margin-bottom: 8px;
  font-size: 14px;
}

.scene-description {
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scene-tags {
  margin-bottom: 12px;
}

.scene-tags .el-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}

.scene-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--bg-tertiary);
}

.scene-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.scene-actions {
  display: flex;
  gap: 8px;
}

.scene-actions .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

.scene-actions .el-button.liked {
  color: var(--el-color-warning);
}

.scene-actions .el-button.liked .el-icon {
  color: var(--el-color-warning);
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding: 20px 0;
}

/* 空状态 */
.empty-state {
  margin-top: 60px;
}

/* 侧边栏 */
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
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-title .el-icon {
  color: var(--el-color-primary);
}

/* 引导步骤 */
.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-primary);
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
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.step-desc {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 标签列表 */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  cursor: pointer;
  transition: all 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
  background-color: var(--el-color-primary-light-9);
}

/* 社区统计 */
.community-stats {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.stat-item {
  flex: 1;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* 响应式 */
@media (max-width: 768px) {
  .page {
    padding: 12px;
  }

  .page-header .section-title {
    font-size: 24px;
  }

  .search-section .el-row {
    gap: 12px 0;
  }

  .search-section .el-col {
    margin-bottom: 12px;
  }

  .scene-stats {
    display: none;
  }

  .scene-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>



