<template>
  <MainContentLayout>
    <template #content>
      <div class="post-detail-page">
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>
        
        <div v-else-if="error" class="error-container">
          <el-alert
            :title="error"
            type="error"
            :closable="false"
            show-icon
          />
        </div>

        <PostDetail
          v-else-if="post"
          ref="postDetailRef"
          :post="post"
          @vote="handleVote"
          @comment="handleComment"
          @share="handleShare"
          @back="handleBack"
        />
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 可以在这里添加侧边栏内容，比如相关帖子、社区信息等 -->
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useUserStore } from '@/stores/user'
  import { getGuestPostDetail, getPostDetail } from '@/axios/post'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import PostDetail from '@/components/PostDetail.vue'
  import { ElMessage } from 'element-plus'
  import { userVote } from '@/axios/vote'
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  const post = ref(null)
  const loading = ref(true)
  const error = ref(null)
  const postDetailRef = ref(null)

  onMounted(() => {
    loadPostDetail()
  })

  const loadPostDetail = async () => {
    const postId = route.params.id || route.query.post_id
    if (!postId) {
      error.value = '缺少帖子ID'
      loading.value = false
      return
    }

    try {
      loading.value = true
      error.value = null

      let response
      if (userStore.isLoggedIn) {
        // 已登录用户使用 getUserPostDetail 接口
        response = await getPostDetail({ post_id: postId })
      } else {
        // 未登录用户使用 GuestPostDetail 接口
        response = await getGuestPostDetail({ post_id: postId })
      }

      if (response.success) {
        // 处理返回的数据结构
        let postData = null
        if (response.data?.post) {
          postData = response.data.post
        } else if (response.data && !response.data.comments) {
          // 如果 data 直接是 post 对象
          postData = response.data
        } else if (response.data) {
          // getGuestPostDetail 返回 { post, vote_count, comments }
          postData = response.data.post
          // 补充缺失的字段
          if (response.data.vote_count !== undefined) {
            postData.upvotes = response.data.vote_count
            postData.downvotes = 0
            postData.net_votes = response.data.vote_count
          }
          if (response.data.comments) {
            postData.comment_count = response.data.comments.length
          }
          // 确保有默认值
          postData.voted = postData.voted || false
          postData.vote_type = postData.vote_type || null
        }
      
        if (postData) {
          post.value = postData
        } else {
          error.value = '帖子数据格式错误'
        }
      } else {
        error.value = response.message || '获取帖子详情失败'
      }
    } catch (err) {
      console.error('加载帖子详情失败:', err)
      error.value = err.response?.data?.message || err.message || '加载帖子详情失败，请稍后重试'
      ElMessage.error(error.value)
    } finally {
      loading.value = false
    }
  }

  const handleVote = async ({ type, postData }) => {
    const prevVote = post.value.userVote
    const prevScore = post.value.net_votes
    // 调用后端投票接口
    try {
      const vote_type = type
      const res = await userVote({
        post_id: post.value.post_id,
        vote_type
      })
      
      // 本地乐观更新
      if (prevVote === type) {
        // 再次点击同一方向 -> 取消投票
        post.value.userVote = 0
        post.value.net_votes =Number(res.data.upvotes - res.data.downvotes) > 0 
          ? Number(res.data.upvotes - res.data.downvotes) : Number(res.data.downvotes - res.data.upvotes) > 0 
            ? -Number(res.data.downvotes - res.data.upvotes) : 0
      } else {
        // 切换投票方向或首次投票
        post.value.net_votes -= prevVote
        post.value.userVote = type
        post.value.net_votes =Number(res.data.upvotes - res.data.downvotes) > 0 
          ? Number(res.data.upvotes - res.data.downvotes) : Number(res.data.downvotes - res.data.upvotes) > 0 
            ? -Number(res.data.downvotes - res.data.upvotes) : 0
      }

      if (!res.success) {
        // 接口返回失败，回滚本地状态
        post.value.userVote = prevVote
        post.value.net_votes = prevScore
        ElMessage.error(res.message || '投票失败，请稍后重试')
      }
      console.log('post.value', post.value)
    } catch (error) {
      // 请求异常，回滚本地状态
      post.value.userVote = prevVote
      post.value.net_votes = prevScore
      ElMessage.error(error.response?.data?.message || '投票失败，请稍后重试')
    }
  }

  const handleComment = (postData) => {
    // 评论功能已在 PostDetail 组件中实现，这里可以留空或处理其他逻辑
  }

  const handleShare = (postData) => {
    // TODO: 实现分享功能
    ElMessage.info('分享功能开发中')
  }

  const handleBack = () => {
    // 如果有保存的来源路由，优先跳转到来源路由
    const from = route.query.from
    if (from) {
      router.push(from)
    } else {
      // 否则使用浏览器历史记录返回
      router.back()
    }
  }
</script>

<style scoped>
.post-detail-page {
  display: flex;
  flex-direction: column;
}

.loading-container,
.error-container {
  padding: 20px;
}

.error-container {
  margin: 20px 0;
}

.sidebar-content {
  /* 侧边栏样式 */
  display: flex;
  flex-direction: column;
}
</style>

