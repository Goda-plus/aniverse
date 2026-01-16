<template>
  <div class="community-manage">
    <div class="community-header">
      <h3 class="section-title">
        我的社区
      </h3>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建社区
      </el-button>
    </div>

    <!-- 社区列表 -->
    <div v-if="communities.length > 0" class="communities-list">
      <div
        v-for="community in communities"
        :key="community.id"
        class="community-item"
      >
        <div class="community-content">
          <div class="community-avatar">
            <img
              v-if="community.image_url"
              :src="community.image_url"
              alt="社区头像"
            >
            <div v-else class="avatar-placeholder">
              r/
            </div>
          </div>
          <div class="community-info">
            <div class="community-name-row">
              <h4 class="community-name" @click="handleViewCommunity(community)">
                r/{{ community.name }}
              </h4>
              <div class="community-badges">
                <el-tag
                  v-if="community.visibility === 'public'"
                  type="success"
                  size="small"
                  effect="plain"
                >
                  公开
                </el-tag>
                <el-tag
                  v-else-if="community.visibility === 'restricted'"
                  type="warning"
                  size="small"
                  effect="plain"
                >
                  受限
                </el-tag>
                <el-tag
                  v-else-if="community.visibility === 'private'"
                  type="info"
                  size="small"
                  effect="plain"
                >
                  私人
                </el-tag>
                <el-tag
                  v-if="community.is_adult"
                  type="danger"
                  size="small"
                  effect="plain"
                >
                  18+
                </el-tag>
              </div>
            </div>
            <p v-if="community.description" class="community-description">
              {{ community.description }}
            </p>
            <div class="community-meta">
              <span class="meta-item">
                <el-icon><FolderOpened /></el-icon>
                {{ community.category_name || '未分类' }}
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(community.created_at) }}
              </span>
            </div>
          </div>
          <div class="community-actions">
            <el-button
              link
              type="primary"
              @click="handleViewCommunity(community)"
            >
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button
              link
              type="primary"
              @click="handleEdit(community)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              link
              type="primary"
              @click="handleManageMembers(community)"
            >
              <el-icon><User /></el-icon>
              管理成员
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(community)"
            >
              <el-icon><Delete /></el-icon>
              解散
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <el-empty description="您还没有创建任何社区">
        <el-button type="primary" @click="handleCreate">
          创建社区
        </el-button>
      </el-empty>
    </div>

    <!-- 编辑社区对话框（已抽离为组件） -->
    <EditCommunityDialog
      v-model="editDialogVisible"
      :community="editingCommunity"
      @success="fetchCommunities"
    />

    <!-- 创建社区对话框 -->
    <CreateCommunityDialog
      v-model="createDialogVisible"
      @success="handleCreateSuccess"
    />

    <!-- 成员管理对话框（已抽离为组件） -->
    <MemberManageDialog
      v-model="memberDialogVisible"
      :subreddit-id="currentManagingCommunity?.id"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted, defineExpose, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, View, Edit, Delete, FolderOpened, Clock, User } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { getMySubreddits, deleteSubreddit } from '@/axios/subreddit'
  import CreateCommunityDialog from './CreateCommunityDialog.vue'
  import EditCommunityDialog from './EditCommunityDialog.vue'
  import MemberManageDialog from './MemberManageDialog.vue'

  const router = useRouter()
  const communities = ref([])
  const editDialogVisible = ref(false)
  const createDialogVisible = ref(false)
  const editingCommunity = ref(null)
  const memberDialogVisible = ref(false)
  const currentManagingCommunity = ref(null)

  // 获取社区列表
  const fetchCommunities = async () => {
    try {
      const response = await getMySubreddits()
      if (response.success) {
        communities.value = response.data || []
      } else {
        ElMessage.error(response.message || '获取社区列表失败')
      }
    } catch (error) {
      console.error('获取社区列表失败:', error)
      ElMessage.error(error.response?.data?.message || '获取社区列表失败')
    }
  }

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return `${minutes}分钟前`
      }
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  // 创建社区
  const handleCreate = () => {
    createDialogVisible.value = true
  }

  // 创建成功回调
  const handleCreateSuccess = () => {
    fetchCommunities()
  }

  // 查看社区
  const handleViewCommunity = (community) => {
    router.push({
      path: `/r/${community.name}`,
      query: {
        subredditId: community.id
      }
    })
  }

  // 编辑社区
  const handleEdit = (community) => {
    editingCommunity.value = community
    editDialogVisible.value = true
  }

  // 删除社区
  const handleDelete = async (community) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除社区 "r/${community.name}" 吗？此操作不可恢复。`,
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      const response = await deleteSubreddit(community.id)
      if (response.success) {
        ElMessage.success('删除成功')
        fetchCommunities()
      } else {
        ElMessage.error(response.message || '删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '删除失败')
      }
    }
  }


  // 管理成员
  const handleManageMembers = async (community) => {
    currentManagingCommunity.value = community
    memberDialogVisible.value = true
  }

  watch(memberDialogVisible, (val) => {
    if (!val) currentManagingCommunity.value = null
  })

  onMounted(() => {
    fetchCommunities()
  })

  // 暴露方法供父组件调用刷新
  defineExpose({
    fetchCommunities
  })
</script>

<style scoped>
.community-manage {
  padding: 20px 0;
}

.community-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.communities-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.community-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
}

.community-item:hover {
  border-color: var(--primary, #0079d3);
  box-shadow: 0 2px 8px rgba(0, 121, 211, 0.1);
}

.community-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.community-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.community-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.community-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.community-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.community-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  cursor: pointer;
  transition: color 0.3s;
}

.community-name:hover {
  color: var(--primary, #0079d3);
}

.community-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.community-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.community-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.meta-item .el-icon {
  font-size: 14px;
}

.community-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.empty-container {
  padding: 40px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .community-content {
    flex-direction: column;
  }

  .community-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

