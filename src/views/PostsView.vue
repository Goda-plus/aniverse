<template>
  <MainContentLayout>
    <template #content>
      <div class="posts-page">
        <!-- 社区头部（如果是在特定社区） -->
        <div v-if="communityInfo" class="community-header">
          <div class="community-banner" :style="{ backgroundImage: `url(${communityInfo.banner})` }">
            <div class="community-info">
              <div class="community-avatar">
                <img :src="communityInfo.image_url" :alt="communityInfo.name">
              </div>
              <div class="community-details">
                <div class="community-name-row">
                  <h1 class="community-name">
                    r/{{ communityInfo.name }}
                  </h1>
                  <div v-if="communityInfo.media && communityInfo.media.length > 0" class="community-media">
                    <el-tag
                      v-for="media in communityInfo.media"
                      :key="media.id"
                      class="media-tag"
                      size="small"
                    >
                      {{ media.title_native }}
                    </el-tag>
                  </div>
                </div>
                <div class="community-description-container">
                  <el-tag v-for="tag in communityInfo.tags" :key="tag" :type="tag.type">
                    #{{ tag.name }}
                  </el-tag>
                </div>
                
                <div class="community-stats">
                  <span>{{ (communityInfo.member_count) }} 位成员</span>
                  <span class="separator">·</span>
                  <span>{{ (communityInfo.member_count) }} 在线</span>
                </div>
              </div>
              <el-button 
                v-if="!communityInfo.is_joined"
                type="primary" 
                class="join-button"
                @click="handleJoin"
              >
                加入
              </el-button>
              <el-button 
                v-else
                class="joined-button"
                @click="handleLeave"
              >
                已加入
              </el-button>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>

        <!-- 无数据占位 -->
        <div 
          v-else-if="!loading && posts.length === 0" 
          class="empty-container"
        >
          暂无帖子
        </div>

        <!-- 帖子列表 -->
        <PostList 
          v-else
          :posts="posts" 
          :show-recommendation="showRecommendation"
          @vote="handleVote"
          @comment="handleComment"
          @share="handleShare"
          @save="handleSave"
          @hide="handleHide"
          @report="handleReport"
          @click="handlePostClick"
        />

        <!-- 加载更多状态 -->
        <div v-if="loadingMore" class="loading-more">
          <el-icon class="is-loading">
            <Loading />
          </el-icon>
          <span>加载中...</span>
        </div>

        <!-- 没有更多数据提示 -->
        <div v-if="!hasMore && posts.length > 0 && !loading" class="no-more">
          没有更多帖子了
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 社区信息卡片 -->
        <div v-if="communityInfo" class="sidebar-card">
          <div class="community-sidebar-info">
            <div class="community-sidebar-avatar">
              <img :src="communityInfo.image_url" :alt="communityInfo.name">
            </div>
            <h2 class="community-sidebar-name">
              r/{{ communityInfo.name }}
            </h2>
            
            <div class="community-sidebar-stats">
              <div class="stat-item">
                <span class="stat-value">{{ (communityInfo.member_count) }}</span>
                <span class="stat-label">成员</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ (communityInfo.member_count) }}</span>
                <span class="stat-label">在线</span>
              </div>
            </div>
            <el-button 
              v-if="!communityInfo.is_joined"
              type="primary" 
              class="sidebar-join-button"
              @click="handleJoin"
            >
              加入
            </el-button>
            <el-button 
              v-else
              class="sidebar-joined-button"
              @click="handleLeave"
            >
              已加入
            </el-button>
          </div>
        </div>

        <!-- 关于社区 -->
        <div v-if="communityInfo" class="sidebar-card">
          <div class="sidebar-header">
            <h3 class="sidebar-title">
              关于社区
            </h3>
          </div>
          <div class="about-content">
            <p 
              ref="descriptionRef"
              :class="{ 'description-collapsed': !isDescriptionExpanded && showExpandButton }"
              class="about-description"
            >
              {{ communityInfo.description }}
            </p>
            <div 
              v-if="showExpandButton"
              class="expand-toggle"
              @click="isDescriptionExpanded = !isDescriptionExpanded"
            >
              <span>{{ isDescriptionExpanded ? '收起' : '展开' }}</span>
            </div>
            <div class="about-meta">
              <div class="meta-item">
                <span class="meta-label">创建于</span>
                <span class="meta-value">{{ formatDate(communityInfo.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近浏览 -->
        <RecentBrowsed 
          ref="recentBrowsedRef"
          @post-click="handlePostClick"
        />
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import PostList from '@/components/PostList.vue'
  import { ChatLineRound, Loading } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import { getAllPostsWithUser, getPostsBySubreddit } from '@/axios/post'
  import RecentBrowsed from '@/components/RecentBrowsed.vue'
  import { userVote } from '@/axios/vote'
  import { getSubredditDetail } from '@/axios/subreddit'
  import { toggleMember } from '@/axios/subredditMember'

  const route = useRoute()
  const router = useRouter()

  const communityInfo = ref(null)
  const posts = ref([])
  const showRecommendation = ref(true)
  const recentBrowsedRef = ref(null)
  const isDescriptionExpanded = ref(false)
  const descriptionRef = ref(null)
  const showExpandButton = ref(false)
  
  // 分页相关
  const currentPage = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const hasMore = ref(true)
  const loadingMore = ref(false)
  let scrollTimer = null

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
      id: apiPost.post_id,
      subreddit: apiPost.subreddit_name || '', // 可以根据实际情况设置
      author: apiPost.username,
      authorAvatar: apiPost.avatar_url,
      title: apiPost.title,
      content: apiPost.content_text,
      content_html: apiPost.content_html,
      image: imageUrl,
      imageCount: imageCount,
      score: apiPost.net_votes || (apiPost.upvotes - apiPost.downvotes) || 0,
      commentCount: apiPost.comment_count || 0,
      rewardCount: 0,
      userVote: 0, // 需要根据实际投票状态设置
      createdAt: new Date(apiPost.created_at).getTime(),
      recommended: false
    }
  }

  // 加载帖子数据
  const loadPosts = async (page = 1, append = false) => {
    if (loading.value || loadingMore.value) return
    if (!append && !hasMore.value) return

    try {
      if (append) {
        loadingMore.value = true
      } else {
        loading.value = true
      }

      const communityName = route.params.community
      const subredditId = route.query.subredditId
      let response

      if (communityName && communityName !== 'all' && subredditId) {
        // 有 community 参数且带了对应的 subredditId，按社区 ID 获取该社区的帖子列表
        response = await getPostsBySubreddit({
          subreddit_id: subredditId,
          page,
          pageSize: pageSize.value
        })
      } else {
        // 加载全部帖子
        response = await getAllPostsWithUser({
          page,
          pageSize: pageSize.value
        })
      }

      if (response.success && Array.isArray(response.data)) {
        const transformedPosts = response.data.map(transformPostData)
        
        if (append) {
          posts.value = [...posts.value, ...transformedPosts]
        } else {
          posts.value = transformedPosts
        }

        // 判断是否还有更多数据
        hasMore.value = transformedPosts.length === pageSize.value
        currentPage.value = page
      } else {
        ElMessage.error(response.message || '加载帖子失败')
        hasMore.value = false
      }
    } catch (error) {
      console.error('加载帖子失败:', error)
      ElMessage.error(error.response?.data?.message || '加载帖子失败，请稍后重试')
      hasMore.value = false
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  // 滚动加载处理（使用节流优化性能）
  const handleScroll = () => {
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
    
    scrollTimer = setTimeout(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight

      // 当滚动到距离底部 300px 时加载更多
      if (documentHeight - scrollTop - windowHeight < 300) {
        if (hasMore.value && !loadingMore.value && !loading.value) {
          loadPosts(currentPage.value + 1, true)
        }
      }
    }, 100)
  }

  onMounted(() => {
    // 初始加载帖子数据
    loadPosts(1, false)

    // 如果路由中有社区参数，加载社区信息
    const communityName = route.params.community
    if (communityName && communityName !== 'all') {
      loadCommunityInfo(communityName)
    }

    // 添加滚动监听
    window.addEventListener('scroll', handleScroll)
  })

  onUnmounted(() => {
    // 移除滚动监听
    window.removeEventListener('scroll', handleScroll)
    // 清理定时器
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
  })

  // 监听路由变化，重新加载数据
  watch(
    () => route.params.community,
    (newCommunity, oldCommunity) => {
      if (newCommunity !== oldCommunity) {
        // 重置状态
        currentPage.value = 1
        hasMore.value = true
        posts.value = []
        // 重新加载数据
        loadPosts(1, false)
        // 如果路由中有社区参数，加载社区信息
        if (newCommunity && newCommunity !== 'all') {
          loadCommunityInfo(newCommunity)
        } else {
          communityInfo.value = null
        }
      }
    }
  )

  // 监听路由路径变化，当返回页面时刷新最近浏览
  let previousPath = route.path
  watch(
    () => route.path,
    (newPath) => {
      // 如果从帖子详情页返回，刷新最近浏览
      if (previousPath && previousPath.startsWith('/post/') && !newPath.startsWith('/post/')) {
        if (recentBrowsedRef.value) {
          recentBrowsedRef.value.loadRecentBrowsedPosts()
        }
      }
      previousPath = newPath
    }
  )

  // 监听社区信息变化，重新检测描述是否需要展开
  watch(
    () => communityInfo.value?.description,
    async () => {
      isDescriptionExpanded.value = false
      await checkDescriptionOverflow()
    }
  )

  // 检测描述是否需要展开按钮
  const checkDescriptionOverflow = async () => {
    await nextTick()
    if (descriptionRef.value) {
      // 临时移除折叠样式，获取完整高度
      const wasCollapsed = descriptionRef.value.classList.contains('description-collapsed')
      if (wasCollapsed) {
        descriptionRef.value.classList.remove('description-collapsed')
      }
      
      const fullHeight = descriptionRef.value.scrollHeight
      const lineHeight = parseInt(window.getComputedStyle(descriptionRef.value).lineHeight, 10)
      const maxHeight = lineHeight * 3
      
      // 恢复折叠样式
      if (wasCollapsed) {
        descriptionRef.value.classList.add('description-collapsed')
      }
      
      showExpandButton.value = fullHeight > maxHeight
    }
  }

  const loadCommunityInfo = async (name) => {
    // 模拟加载社区信息
    communityInfo.value = {
      name: name,
      description: '这是一个关于' + name + '的社区',
      about: '欢迎来到 ' + name + ' 社区！这里是一个分享和讨论的地方。',
      members: 1000000,
      online: 5000,
      avatar: 'https://via.placeholder.com/64?text=' + name,
      banner: 'https://via.placeholder.com/1200x200?text=' + name,
      is_joined: false,
      createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
      media: []
    }
    const res = await getSubredditDetail({ id: route.query.subredditId })
    if (res.success) {
      communityInfo.value =  res.data
      // 解析 tags
      communityInfo.value.tags = JSON.parse(communityInfo.value.tags)
      // 解析 media（关联的动漫）
      communityInfo.value.media = JSON.parse(communityInfo.value.media)
      console.log( 'communityInfo.value', communityInfo.value)
      // 检测描述是否需要展开
      await checkDescriptionOverflow()
    }
  }

  const handleVote = async ({ post, direction }) => {
    const postIndex = posts.value.findIndex(p => p.id === post.id)
    if (postIndex === -1) return

    const targetPost = posts.value[postIndex]
    const prevVote = targetPost.userVote
    const prevScore = targetPost.score

    // 调用后端投票接口
    try {
      const vote_type = direction === 1 ? 'up' : 'down'
      const res = await userVote({
        post_id: post.id,
        vote_type
      })
      
      // 本地乐观更新
      if (prevVote === direction) {
        // 再次点击同一方向 -> 取消投票
        targetPost.userVote = 0
        targetPost.score =Number(res.data.upvotes - res.data.downvotes) > 0 
          ? Number(res.data.upvotes - res.data.downvotes) : Number(res.data.downvotes - res.data.upvotes) > 0 
            ? -Number(res.data.downvotes - res.data.upvotes) : 0
      } else {
        // 切换投票方向或首次投票
        targetPost.score -= prevVote
        targetPost.userVote = direction
        targetPost.score =Number(res.data.upvotes - res.data.downvotes) > 0 
          ? Number(res.data.upvotes - res.data.downvotes) : Number(res.data.downvotes - res.data.upvotes) > 0 
            ? -Number(res.data.downvotes - res.data.upvotes) : 0
      }

      if (!res.success) {
        // 接口返回失败，回滚本地状态
        targetPost.userVote = prevVote
        targetPost.score = prevScore
        ElMessage.error(res.message || '投票失败，请稍后重试')
      }
    } catch (error) {
      // 请求异常，回滚本地状态
      targetPost.userVote = prevVote
      targetPost.score = prevScore
      ElMessage.error(error.response?.data?.message || '投票失败，请稍后重试')
    }
  }

  const handleComment = (post) => {
    // 保存当前路由作为来源，以便返回时能正确导航
    router.push({
      path: `/post/${post.id}`,
      query: { from: route.path }
    })
  }

  const handleShare = (post) => {
    ElMessage.success('分享功能开发中')
  }

  const handleSave = (post) => {
    ElMessage.success('已保存')
  }

  const handleHide = (post) => {
    const index = posts.value.findIndex(p => p.id === post.id)
    if (index !== -1) {
      posts.value.splice(index, 1)
      ElMessage.success('已隐藏')
    }
  }

  const handleReport = (post) => {
    ElMessage.info('举报功能开发中')
  }

  const handlePostClick = (post) => {
    // 保存当前路由作为来源，以便返回时能正确导航
    router.push({
      path: `/post/${post.id}`,
      query: { from: route.fullPath }
    })
  }

  const handleJoin = async () => {
    if (!communityInfo.value) return
    
    const subredditId = route.query.subredditId || communityInfo.value.id
    if (!subredditId) {
      ElMessage.error('缺少社区ID')
      return
    }

    try {
      const res = await toggleMember({ subreddit_id: subredditId })
      
      if (res.success) {
        // 更新加入状态
        communityInfo.value.is_joined = !communityInfo.value.is_joined
        
        // 更新成员数量（如果接口返回了）
        if (res.data && res.data.member_count !== undefined) {
          communityInfo.value.member_count = res.data.member_count
          communityInfo.value.members = res.data.member_count
        }
        
        ElMessage.success(res.message || (communityInfo.value.is_joined ? '已加入社区' : '已退出社区'))
      } else {
        ElMessage.error(res.message || '操作失败，请稍后重试')
      }
    } catch (error) {
      console.error('加入/退出社区失败:', error)
      ElMessage.error(error.response?.data?.message || '操作失败，请稍后重试')
    }
  }

  const handleLeave = async () => {
    // 退出和加入使用同一个接口，直接调用 handleJoin
    await handleJoin()
  }


  const formatMemberCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M'
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k'
    }
    return count.toString()
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

</script>

<style scoped>
.posts-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 社区头部 */
.community-header {
  margin-bottom: 16px;
}

.community-banner {
  background-size: cover;
  background-position: center;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.community-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.7) 100%);
}

.community-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.community-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #ffffff;
  flex-shrink: 0;
}

.community-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.community-details {
  flex: 1;
  color: #ffffff;
}

.community-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.community-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: #ffffff;
}

.community-media {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.media-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.media-tag {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
  backdrop-filter: blur(4px);
}

.community-description {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s ease;
}

.community-stats {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 10px;
}

.separator {
  margin: 0 4px;
}

.join-button,
.joined-button {
  flex-shrink: 0;
}

.join-button {
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff;
}

.join-button:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.joined-button {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.5);
  color: #ffffff;
}

.joined-button:hover {
  background: rgba(255, 255, 255, 0.1);
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

.sidebar-header {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--card-border);
}

.sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

/* 社区侧边栏信息 */
.community-sidebar-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.community-sidebar-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--card-border);
}

.community-sidebar-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.community-sidebar-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.community-sidebar-media {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  width: 100%;
}

.sidebar-media-label {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.sidebar-media-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.sidebar-media-tag {
  background: var(--bg-secondary);
  border-color: var(--card-border);
  color: var(--text-primary);
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
}

.community-sidebar-description-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.community-sidebar-description {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.3s ease;
}

.community-sidebar-stats {
  display: flex;
  gap: 24px;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.sidebar-join-button,
.sidebar-joined-button {
  width: 100%;
  margin-top: 8px;
}

.sidebar-join-button {
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff;
}

.sidebar-join-button:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.sidebar-joined-button {
  background: var(--bg-secondary);
  border-color: var(--card-border);
  color: var(--text-primary);
}

.sidebar-joined-button:hover {
  background: var(--bg-hover);
}

/* 关于内容 */
.about-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.6;
  transition: color 0.3s ease;
}

.community-description-container {
  display: flex;
  gap: 8px;
}

.about-description {
  margin: 0;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.description-collapsed {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.expand-toggle {
  margin-top: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  user-select: none;
  transition: color 0.3s ease;
}

.expand-toggle:hover {
  color: var(--text-primary);
}

.expand-toggle span {
  font-weight: 500;
}

.about-meta {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border);
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.meta-value {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  transition: color 0.3s ease;
}


/* 加载状态 */
.loading-container {
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  margin-bottom: 16px;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.no-more {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 无数据占位 */
.empty-container {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
  font-size: 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
}

/* 响应式设计 */
@media (max-width: 960px) {
  .community-info {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-avatar {
    width: 64px;
    height: 64px;
  }

  .community-name {
    font-size: 24px;
  }

  .community-name-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .community-media {
    margin-top: 4px;
  }
}
</style>

