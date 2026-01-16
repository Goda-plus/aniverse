<template>
  <div class="history-section">
    <div v-if="posts.length > 0" class="batch-actions">
      <el-checkbox 
        v-model="selectAll" 
        :indeterminate="isIndeterminate"
        @change="handleSelectAll"
      >
        全选
      </el-checkbox>
      <el-button 
        v-if="selectedPostIds.length > 0" 
        type="danger"
        :icon="Delete"
        :disabled="selectedPostIds.length === 0"
        @click="handleBatchDelete"
      >
        批量删除 ({{ selectedPostIds.length }})
      </el-button>
    </div>
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>
    <div class="history-container">
      <div class="history-list-container">  
        <PostList 
          v-if="posts.length > 0"
          :posts="posts" 
          :show-recommendation="false"
          :show-checkbox="true"
          :selected-post-ids="selectedPostIds"
          @vote="handleVote"
          @comment="handleComment"
          @share="handleShare"
          @save="handleSave"
          @hide="handleHide"
          @report="handleReport"
          @click="handlePostClick"
          @select-change="handleSelectChange"
        />
        <div v-else-if="!loading" class="empty-state">
          <div class="empty-icon">
            🕐
          </div>
          <div class="empty-title">
            还没有浏览记录
          </div>
          <div class="empty-description">
            浏览帖子后，你的历史记录会显示在这里
          </div>
        </div>
      </div>
     
      <div v-if="posts.length > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100, 200]"
          :small="false"
          :disabled="loading"
          :background="true"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { Delete } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import PostList from '@/components/PostList.vue'
  import { getBrowseHistory, deleteHistoryItem } from '@/axios/browse'
  import { userVote } from '@/axios/vote'
  import { useUserStore } from '@/stores/user'

  const router = useRouter()
  const userStore = useUserStore()

  const posts = ref([])
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const hasMore = ref(true)
  const total = ref(0)
  const selectedPostIds = ref([])
  const selectAll = ref(false)

  // 转换 API 数据格式为组件需要的格式
  const transformPostData = (apiPost) => {
    // 解析 image_url（可能是 JSON 字符串）
    let imageUrl = null
    let imageCount = 0
    if (apiPost.image_url) {
      try {
        const imageUrls = typeof apiPost.image_url === 'string' 
          ? JSON.parse(apiPost.image_url) 
          : apiPost.image_url
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
          imageUrl = imageUrls[0]
          imageCount = imageUrls.length
        }
      } catch (e) {
        // 如果不是 JSON，直接使用
        imageUrl = apiPost.image_url
        imageCount = 1
      }
    }

    return {
      id: apiPost.post_id || apiPost.id,
      subreddit: apiPost.subreddit_name || 'nextfuckinglevel',
      author: apiPost.username,
      authorAvatar: apiPost.avatar_url,
      title: apiPost.title,
      content_text: apiPost.content_text,
      content_html: apiPost.content_html,
      image: imageUrl,
      imageCount: imageCount,
      score: apiPost.net_votes || (apiPost.upvotes - apiPost.downvotes) || 0,
      commentCount: apiPost.comment_count || 0,
      rewardCount: 0,
      userVote: apiPost.user_vote !== undefined ? apiPost.user_vote : 0,
      createdAt: new Date(apiPost.created_at).getTime(),
      recommended: false,
      lastVisitedAt: apiPost.last_visited_at
    }
  }

  // 加载浏览历史
  const loadBrowseHistory = async () => {
    if (loading.value) return
    if (!userStore.isLoggedIn) {
      posts.value = []
      return
    }

    try {
      loading.value = true
      const response = await getBrowseHistory({
        page: currentPage.value,
        pageSize: pageSize.value
      })

      if (response.success) {
        // 转换API数据格式为组件需要的格式
        const transformedPosts = response.data.posts.map(transformPostData)
        posts.value = transformedPosts
        // 判断是否还有更多数据
        hasMore.value = response.data.pagination?.hasNextPage || false
        total.value = response.data.pagination?.totalItems || response.data.pagination?.total || 0
        // 重置选中状态
        selectedPostIds.value = []
        selectAll.value = false
      } else {
        posts.value = []
        hasMore.value = false
        total.value = 0
        selectedPostIds.value = []
        selectAll.value = false
      }
    } catch (error) {
      console.error('加载浏览历史失败:', error)
      ElMessage.error(error.response?.data?.message || '加载历史记录失败，请稍后重试')
      posts.value = []
    } finally {
      loading.value = false
    }
  }

  // 处理投票
  const handleVote = async ({ post, direction }) => {
    const postIndex = posts.value.findIndex(p => p.id === post.id)
    if (postIndex === -1) return

    const targetPost = posts.value[postIndex]
    const prevVote = targetPost.userVote
    const prevScore = targetPost.score

    try {
      const vote_type = direction === 1 ? 'up' : 'down'
      const res = await userVote({
        post_id: post.id,
        vote_type
      })
      
      if (res.success) {
        // 更新投票状态和分数
        if (prevVote === direction) {
          targetPost.userVote = 0
        } else {
          targetPost.userVote = direction
        }
        targetPost.score = Number(res.data.upvotes - res.data.downvotes) > 0 
          ? Number(res.data.upvotes - res.data.downvotes) 
          : Number(res.data.downvotes - res.data.upvotes) > 0 
            ? -Number(res.data.downvotes - res.data.upvotes) 
            : 0
      } else {
        ElMessage.error(res.message || '投票失败，请稍后重试')
      }
    } catch (error) {
      // 回滚状态
      targetPost.userVote = prevVote
      targetPost.score = prevScore
      ElMessage.error(error.response?.data?.message || '投票失败，请稍后重试')
    }
  }

  // 处理评论
  const handleComment = (post) => {
    router.push({
      path: `/post/${post.id}`,
      query: { from: '/profile/history' }
    })
  }

  // 处理分享
  const handleShare = (post) => {
    ElMessage.success('分享功能开发中')
  }

  // 处理保存
  const handleSave = (post) => {
    ElMessage.success('保存功能开发中')
  }

  // 处理隐藏
  const handleHide = (post) => {
    const index = posts.value.findIndex(p => p.id === post.id)
    if (index !== -1) {
      posts.value.splice(index, 1)
      ElMessage.success('已隐藏')
    }
  }

  // 处理举报
  const handleReport = (post) => {
    ElMessage.success('举报功能开发中')
  }

  // 处理帖子点击
  const handlePostClick = (post) => {
    router.push({
      path: `/post/${post.id}`,
      query: { from: '/profile/history' }
    })
  }

  // 处理分页大小变化
  const handleSizeChange = (newSize) => {
    pageSize.value = newSize
    currentPage.value = 1
    loadBrowseHistory()
  }

  // 处理当前页变化
  const handleCurrentChange = (newPage) => {
    currentPage.value = newPage
    loadBrowseHistory()
  }

  // 处理复选框变化
  const handleSelectChange = ({ post, checked }) => {
    if (checked) {
      if (!selectedPostIds.value.includes(post.id)) {
        selectedPostIds.value.push(post.id)
      }
    } else {
      const index = selectedPostIds.value.indexOf(post.id)
      if (index > -1) {
        selectedPostIds.value.splice(index, 1)
      }
    }
    updateSelectAllState()
  }

  // 全选/取消全选
  const handleSelectAll = (checked) => {
    if (checked) {
      selectedPostIds.value = posts.value.map(post => post.id)
    } else {
      selectedPostIds.value = []
    }
    selectAll.value = checked
  }

  // 更新全选状态
  const updateSelectAllState = () => {
    if (posts.value.length === 0) {
      selectAll.value = false
      return
    }
    const allSelected = posts.value.every(post => selectedPostIds.value.includes(post.id))
    const someSelected = posts.value.some(post => selectedPostIds.value.includes(post.id))
    selectAll.value = allSelected
  }

  // 计算是否处于半选状态
  const isIndeterminate = computed(() => {
    if (posts.value.length === 0) return false
    const selectedCount = selectedPostIds.value.length
    return selectedCount > 0 && selectedCount < posts.value.length
  })

  // 批量删除历史记录
  const handleBatchDelete = async () => {
    if (selectedPostIds.value.length === 0) {
      ElMessage.warning('请先选择要删除的历史记录')
      return
    }

    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedPostIds.value.length} 条历史记录吗？此操作不可恢复。`,
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      loading.value = true
      const deletePromises = selectedPostIds.value.map(postId => 
        deleteHistoryItem({ target_type: 'post', target_id: postId }).catch(error => {
          console.error(`删除历史记录 ${postId} 失败:`, error)
          return { success: false, postId, error }
        })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.success !== false).length
      const failCount = results.length - successCount

      // 从列表中移除已删除的历史记录
      posts.value = posts.value.filter(post => !selectedPostIds.value.includes(post.id))
      selectedPostIds.value = []
      selectAll.value = false
      
      // 更新总数
      total.value = Math.max(0, total.value - successCount)

      if (failCount === 0) {
        ElMessage.success(`成功删除 ${successCount} 条历史记录`)
      } else {
        ElMessage.warning(`成功删除 ${successCount} 条历史记录，${failCount} 条删除失败`)
      }

      // 如果当前页没有数据了，且不是第一页，则跳转到上一页
      if (posts.value.length === 0 && currentPage.value > 1) {
        currentPage.value--
        loadBrowseHistory()
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('批量删除失败:', error)
        ElMessage.error('删除失败，请稍后重试')
      }
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadBrowseHistory()
  })
</script>

<style scoped>
.history-section {
  width: 100%;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  justify-content: space-between;
  padding: 0 10px;
}

.loading-container {
  padding: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.empty-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
  transition: color 0.3s ease;
}

.history-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.pagination-container {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}

.history-list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>

