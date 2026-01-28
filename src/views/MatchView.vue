<template>
  <div class="page">
    <div class="section-title">
      同好匹配
    </div>
    <p class="meta-text">
      基于兴趣标签与行为相似度的智能推荐，发现与你兴趣相投的同好。
    </p>

    <el-row :gutter="16">
      <el-col :md="16" :xs="24">
        <div class="card list">
          <div class="list-header">
            <h3>推荐关注</h3>
            <el-button 
              type="primary" 
              size="small" 
              :loading="refreshing"
              @click="handleRefresh"
            >
              <el-icon><Refresh /></el-icon>
              刷新推荐
            </el-button>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="loading-container">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>加载推荐中...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="recommendations.length === 0" class="empty-container">
            <el-empty description="暂无推荐，试试刷新推荐列表">
              <el-button type="primary" @click="handleRefresh">
                刷新推荐
              </el-button>
            </el-empty>
          </div>

          <!-- 推荐列表 -->
          <div v-else class="recommendations-list">
            <div 
              v-for="item in recommendations" 
              :key="item.id" 
              class="match-item"
            >
              <div class="left">
                <el-avatar 
                  :src="item.avatar_url" 
                  :size="56"
                  @click="goToProfile(item.recommended_user_id)"
                >
                  {{ item.username?.charAt(0)?.toUpperCase() || 'U' }}
                </el-avatar>
                <div class="user-info">
                  <div class="name" @click="goToProfile(item.recommended_user_id)">
                    {{ item.username }}
                  </div>
                  <div class="meta-text reason">
                    {{ item.recommendation_reason || '兴趣相似' }}
                  </div>
                  <div v-if="item.bio" class="bio">
                    {{ item.bio }}
                  </div>
                </div>
              </div>
              <div class="right">
                <el-tag 
                  :type="getSimilarityTagType(item.similarity_score)"
                  class="similarity-tag"
                >
                  {{ (item.similarity_score * 100).toFixed(0) }}% 相似
                </el-tag>
                <div class="actions">
                  <el-button 
                    type="primary" 
                    round 
                    size="small"
                    :loading="item.following"
                    @click="handleFollow(item)"
                  >
                    {{ item.is_followed ? '已关注' : '关注' }}
                  </el-button>
                  <el-button 
                    text 
                    size="small"
                    :loading="item.dismissing"
                    @click="handleDismiss(item)"
                  >
                    忽略
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="pagination.totalPages > 1" class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="pagination.totalItems"
              layout="prev, pager, next"
              @current-change="handlePageChange"
            />
          </div>
        </div>
      </el-col>

      <el-col :md="8" :xs="24">
        <div class="card side">
          <div class="section-title">
            我的兴趣画像
          </div>
          
          <!-- 加载状态 -->
          <div v-if="loadingInterests" class="loading-interests">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>加载中...</span>
          </div>

          <!-- 兴趣标签列表 -->
          <div v-else-if="interests.length > 0" class="interests-list">
            <el-tag 
              v-for="tag in interests" 
              :key="tag.id" 
              class="tag"
              :type="tag.source === 'auto' ? 'info' : 'primary'"
            >
              {{ tag.tag_name }}
              <el-tooltip 
                v-if="tag.source === 'auto'"
                content="系统自动推荐"
                placement="top"
              >
                <el-icon class="auto-badge">
                  <InfoFilled />
                </el-icon>
              </el-tooltip>
            </el-tag>
            <el-button 
              text 
              size="small" 
              class="manage-btn"
              @click="showManageDialog = true"
            >
              管理标签
            </el-button>
          </div>

          <!-- 空状态 -->
          <div v-else class="empty-interests">
            <p class="meta-text">
              还没有添加兴趣标签
            </p>
            <el-button type="primary" size="small" @click="showManageDialog = true">
              添加标签
            </el-button>
          </div>

          <el-divider />

          <div class="info-section">
            <p class="meta-text">
              <strong>匹配逻辑：</strong><br>
              静态标签相似度（30%）+ 动态行为相似度（70%）<br>
              基于共同收藏、点赞、评论等行为计算
            </p>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 管理兴趣标签对话框 -->
    <el-dialog
      v-model="showManageDialog"
      title="管理兴趣标签"
      width="600px"
      @opened="loadRecommendedTags"
    >
      <div class="manage-dialog">
        <div class="current-tags">
          <h4>当前标签</h4>
          <div class="tags-container">
            <el-tag
              v-for="tag in interests"
              :key="tag.id"
              closable
              @close="handleRemoveInterest(tag.tag_id)"
            >
              {{ tag.tag_name }}
            </el-tag>
            <p v-if="interests.length === 0" class="meta-text">
              暂无标签
            </p>
          </div>
        </div>

        <el-divider />

        <div class="recommended-tags">
          <h4>推荐标签</h4>
          <div v-if="loadingRecommendedTags" class="loading-tags">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <span>加载中...</span>
          </div>
          <div v-else-if="recommendedTags.length > 0" class="tags-container">
            <el-tag
              v-for="tag in recommendedTags"
              :key="tag.id"
              type="info"
              @click="handleAddInterest(tag.id)"
            >
              + {{ tag.name }}
            </el-tag>
          </div>
          <p v-else class="meta-text">
            暂无推荐标签
          </p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Loading, Refresh, InfoFilled } from '@element-plus/icons-vue'
  import { 
    getRecommendations, 
    refreshRecommendations, 
    dismissRecommendation 
  } from '@/axios/match'
  import { 
    getUserInterests, 
    removeUserInterest, 
    addUserInterest,
    getRecommendedTags 
  } from '@/axios/userInterest'
  import { addFriend } from '@/axios/friend'

  const router = useRouter()

  // 数据状态
  const recommendations = ref([])
  const interests = ref([])
  const recommendedTags = ref([])
  const loading = ref(false)
  const loadingInterests = ref(false)
  const loadingRecommendedTags = ref(false)
  const refreshing = ref(false)
  const showManageDialog = ref(false)

  // 分页
  const currentPage = ref(1)
  const pageSize = ref(10)
  const pagination = ref({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false
  })

  // 获取推荐列表
  async function loadRecommendations () {
    loading.value = true
    try {
      const res = await getRecommendations({
        page: currentPage.value,
        pageSize: pageSize.value
      })
      if (res.success) {
        recommendations.value = res.data.recommendations.map(item => ({
          ...item,
          following: false,
          dismissing: false
        }))
        pagination.value = res.data.pagination
      } else {
        ElMessage.error(res.message || '获取推荐列表失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取推荐列表失败')
    } finally {
      loading.value = false
    }
  }

  // 获取兴趣标签
  async function loadInterests () {
    loadingInterests.value = true
    try {
      const res = await getUserInterests()
      if (res.success) {
        interests.value = res.data.interests || []
      } else {
        ElMessage.error(res.message || '获取兴趣标签失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取兴趣标签失败')
    } finally {
      loadingInterests.value = false
    }
  }

  // 刷新推荐列表
  async function handleRefresh () {
    refreshing.value = true
    try {
      const res = await refreshRecommendations()
      if (res.success) {
        ElMessage.success('刷新成功')
        currentPage.value = 1
        await loadRecommendations()
      } else {
        ElMessage.error(res.message || '刷新失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '刷新失败')
    } finally {
      refreshing.value = false
    }
  }

  // 关注用户
  async function handleFollow (item) {
    item.following = true
    try {
      const res = await addFriend({ friend_id: item.recommended_user_id })
      if (res.success) {
        ElMessage.success('关注请求已发送')
        item.is_followed = true
        // 从推荐列表中移除
        recommendations.value = recommendations.value.filter(
          r => r.id !== item.id
        )
      } else {
        ElMessage.error(res.message || '关注失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '关注失败')
    } finally {
      item.following = false
    }
  }

  // 忽略推荐
  async function handleDismiss (item) {
    try {
      await ElMessageBox.confirm('确定要忽略这个推荐吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    
      item.dismissing = true
      const res = await dismissRecommendation(item.recommended_user_id)
      if (res.success) {
        ElMessage.success('已忽略')
        // 从推荐列表中移除
        recommendations.value = recommendations.value.filter(
          r => r.id !== item.id
        )
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '操作失败')
      }
    } finally {
      item.dismissing = false
    }
  }

  // 删除兴趣标签
  async function handleRemoveInterest (tagId) {
    try {
      const res = await removeUserInterest(tagId)
      if (res.success) {
        ElMessage.success('删除成功')
        await loadInterests()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }

  // 添加兴趣标签
  async function handleAddInterest (tagId) {
    try {
      const res = await addUserInterest({ tag_id: tagId })
      if (res.success) {
        ElMessage.success('添加成功')
        await loadInterests()
        await loadRecommendedTags()
      } else {
        ElMessage.error(res.message || '添加失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '添加失败')
    }
  }

  // 加载推荐标签
  async function loadRecommendedTags () {
    loadingRecommendedTags.value = true
    try {
      const res = await getRecommendedTags({ limit: 20 })
      if (res.success) {
        // 过滤掉已添加的标签
        const existingTagIds = new Set(interests.value.map(i => i.tag_id))
        recommendedTags.value = (res.data.tags || []).filter(
          tag => !existingTagIds.has(tag.id)
        )
      }
    } catch (error) {
      console.error('获取推荐标签失败:', error)
    } finally {
      loadingRecommendedTags.value = false
    }
  }

  // 分页变化
  function handlePageChange (page) {
    currentPage.value = page
    loadRecommendations()
  }

  // 跳转到用户主页
  function goToProfile (userId) {
    router.push(`/profile?userId=${userId}`)
  }

  // 获取相似度标签类型
  function getSimilarityTagType (similarity) {
    if (similarity >= 0.8) return 'success'
    if (similarity >= 0.6) return 'warning'
    return 'info'
  }

  // 生命周期
  onMounted(() => {
    loadRecommendations()
    loadInterests()
  })
</script>

<style scoped>
.page {
  padding: 12px 18px 32px;
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.list {
  padding: 14px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.list-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 18px;
  font-weight: 600;
}

.loading-container,
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-color-secondary);
}

.loading-container .el-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.match-item:hover {
  border-color: var(--primary-color, #0079d3);
  box-shadow: 0 2px 8px rgba(0, 121, 211, 0.1);
}

.left {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.left .el-avatar {
  cursor: pointer;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.name {
  font-weight: 700;
  font-size: 16px;
  color: var(--text-color);
  margin-bottom: 6px;
  cursor: pointer;
  transition: color 0.2s;
}

.name:hover {
  color: var(--primary-color, #0079d3);
}

.reason {
  color: var(--text-color-secondary);
  font-size: 14px;
  margin-bottom: 4px;
}

.bio {
  color: var(--text-color-secondary);
  font-size: 13px;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  flex-shrink: 0;
}

.similarity-tag {
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.side {
  padding: 14px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12px;
}

.loading-interests {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-secondary);
  padding: 20px 0;
}

.interests-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag {
  margin: 0;
  position: relative;
}

.auto-badge {
  margin-left: 4px;
  font-size: 12px;
  opacity: 0.7;
}

.manage-btn {
  margin-top: 8px;
}

.empty-interests {
  text-align: center;
  padding: 20px 0;
}

.empty-interests .meta-text {
  margin-bottom: 12px;
}

.info-section {
  margin-top: 12px;
}

.info-section .meta-text {
  line-height: 1.6;
  font-size: 13px;
}

.manage-dialog h4 {
  margin: 0 0 12px 0;
  color: var(--text-color);
  font-size: 16px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tags-container .el-tag {
  cursor: pointer;
}

.loading-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-secondary);
  padding: 20px 0;
}

.meta-text {
  color: var(--text-color-secondary);
  font-size: 14px;
  line-height: 1.5;
}
</style>
