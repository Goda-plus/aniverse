<template>
  <div class="posts-section">
    <div class="create-post-btn">
      <el-button type="primary" :icon="Plus" @click="handleCreatePost">
        + 创建帖子
      </el-button>
    </div>
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>
    <div class="posts-container">
      <div class="posts-list-container">  
        <PostList 
          v-if="posts.length > 0"
          :posts="posts" 
          :show-recommendation="false"
          @vote="handleVote"
          @comment="handleComment"
          @share="handleShare"
          @save="handleSave"
          @hide="handleHide"
          @report="handleReport"
          @click="handlePostClick"
        />
        <div v-else-if="!loading" class="empty-state">
          <div class="empty-icon">
            📝
          </div>
          <div class="empty-title">
            还没有发布任何帖子
          </div>
          <div class="empty-description">
            创建你的第一个帖子，与社区分享你的想法吧！
          </div>
          <el-button type="primary" :icon="Plus" @click="handleCreatePost">
            创建帖子
          </el-button>
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
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { View, ArrowRight, Plus } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import PostList from '@/components/PostList.vue'
  import { getAllPostsWithUser,getCurrentUserPosts } from '@/axios/post'
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
      id: apiPost.id || apiPost.post_id,
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
      userVote: apiPost.user_vote || 0,
      createdAt: new Date(apiPost.created_at).getTime(),
      recommended: false
    }
  }

  // 加载用户帖子
  const loadUserPosts = async () => {
    if (loading.value) return
    if (!userStore.isLoggedIn) {
      posts.value = []
      return
    }

    try {
      loading.value = true
      const response = await getCurrentUserPosts({
        page: currentPage.value,
        pageSize: pageSize.value
      })

      if (response.success) {
        // 转换API数据格式为组件需要的格式
        const transformedPosts = response.data.posts.map(transformPostData)
        posts.value = transformedPosts
        // 判断是否还有更多数据
        hasMore.value = response.data.pagination.hasNextPage
        total.value = response.data.pagination.totalItems || response.data.pagination.total || 0
      } else {
        posts.value = []
        hasMore.value = false
        total.value = 0
      }
    } catch (error) {
      console.error('加载用户帖子失败:', error)
      ElMessage.error(error.response?.data?.message || '加载帖子失败，请稍后重试')
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
      query: { from: '/profile/posts' }
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
      query: { from: '/profile/posts' }
    })
  }

  // 处理创建帖子
  const handleCreatePost = () => {
    router.push('/create-post')
  }

  // 处理分页大小变化
  const handleSizeChange = (newSize) => {
    pageSize.value = newSize
    currentPage.value = 1
    loadUserPosts()
  }

  // 处理当前页变化
  const handleCurrentChange = (newPage) => {
    currentPage.value = newPage
    loadUserPosts()
  }

  onMounted(() => {
    loadUserPosts()
  })
</script>

<style scoped>
.posts-section {
  width: 100%;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.theme-light .section-header {
  color: #0079d3;
}

.theme-dark .section-header {
  color: #4fbcff;
}

.section-header:hover {
  text-decoration: underline;
}

.eye-icon,
.arrow-icon {
  font-size: 16px;
}

.create-post-btn {
  margin-bottom: 24px;
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

.update-settings-btn {
  margin-top: 8px;
}
.posts-container {
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

.posts-list-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>

