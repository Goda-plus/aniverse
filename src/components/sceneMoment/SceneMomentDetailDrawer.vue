<template>
  <el-drawer
    v-model="visible"
    append-to-body
    size="560px"
    height="100%"
    :with-header="true"
  >
    <template #header>
      <div class="drawer-header">
        <div class="drawer-title">
          {{ scene?.title || '名场面详情' }}
        </div>
        <div v-if="scene?.tags?.length" class="drawer-tags">
          <el-tag v-for="t in scene.tags" :key="t.id" size="small" effect="dark">
            {{ t.name }}
          </el-tag>
        </div>
      </div>
    </template>
    <div v-if="loading" class="loading">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else-if="scene" class="detail">
      <div v-if="scene.characters?.length" class="characters">
        <div class="character-label">
          关联角色：
        </div>
        <div class="character-list">
          <el-tag
            v-for="c in scene.characters"
            :key="c.id"
            size="small"
            :class="{ 'main-character': c.id === scene.main_character_id }"
          >
            {{ c.name_native || c.name_alternative || c.id }}
          </el-tag>
        </div>
      </div>
      <div class="image">
        <div v-if="imageUrls && imageUrls.length > 0" class="image-grid">
          <el-image
            v-for="(url, index) in imageUrls"
            :key="index"
            :src="url"
            :preview-src-list="imageUrls"
            :initial-index="index"
            fit="cover"
            class="grid-image"
            :preview-teleported="true"
          />
        </div>
        <div v-else class="image-placeholder">
          <img src="/placeholder.jpg" alt="">
        </div>
      </div>

      <div class="meta">
        <div v-if="scene.description" class="desc">
          {{ scene.description }}
        </div>
        <div class="meta-row">
          <span v-if="scene.episode" class="pill">{{ scene.episode }}</span>
          <span v-if="timeText" class="pill">{{ timeText }}</span>
          <span v-if="scene.submitter_username" class="author">
            by {{ scene.submitter_username }}
          </span>
        </div>

        <div v-if="scene.quote_text" class="quote">
          “{{ scene.quote_text }}”
        </div>
        

        

        <div class="actions">
          <el-button size="small" :type="scene.liked ? 'primary' : 'default'" @click="onLike">
            👍 {{ scene.likes_count || 0 }}
          </el-button>
          <el-button size="small" :type="scene.favorited ? 'warning' : 'default'" @click="onFavorite">
            ⭐ {{ scene.favourites_count || 0 }}
          </el-button>
          <span class="stat">💬 {{ scene.comments_count || 0 }}</span>
          <span class="stat">👁 {{ scene.views || 0 }}</span>
        </div>
      </div>

      <el-divider />

      <!-- 使用通用的CommentList组件 -->
      <CommentList
        :post-id="scene?.id"
        :api-param-name="'scene_id'"
        :get-comments-api="getSceneMomentComments"
        :create-comment-api="createSceneMomentCommentWrapper"
        :delete-comment-api="deleteSceneMomentComment"
        :post-author-id="scene?.submitter_id"
        :support-pagination="false"
        comment-type="scene_moment"
        @create-comment="handleCreateComment"
        @reply="handleReply"
        @comment-count-change="handleCommentCountChange"
      />
    </div>
  </el-drawer>
</template>

<script setup>
  import { computed, ref, watch ,defineProps, defineEmits} from 'vue'
  import { ElMessage } from 'element-plus'
  import { useUserStore } from '@/stores/user'
  import CommentList from '@/components/CommentList.vue'
  import { toggleFavorite } from '@/axios/favorite'
  import {
    getSceneMomentDetail,
    toggleSceneMomentLike,
    getSceneMomentComments,
    createSceneMomentComment
  } from '@/axios/sceneMoments'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    sceneId: { type: [String, Number], default: null }
  })
  const emit = defineEmits(['update:modelValue', 'updated'])

  const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v)
  })

  const userStore = useUserStore()

  const loading = ref(false)
  const scene = ref(null)


  const timeText = computed(() => {
    const timeString = scene.value?.time_position
    if (timeString === null || timeString === undefined || timeString === '') return ''
    // 如果已经是时分秒格式，直接返回
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString
    }
    // 兼容旧的秒数格式，转换为时分秒格式
    const s = Math.max(0, Number(timeString) || 0)
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(Math.floor(s % 60)).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  })

  // 处理 image_url：可能是数组或字符串
  const imageUrls = computed(() => {
    const img = scene.value?.image_url
    if (Array.isArray(img) && img.length > 0) {
      return img
    }
    if (typeof img === 'string' && img) {
      return [img]
    }
    return []
  })

  const fetchDetail = async () => {
    if (!props.sceneId) return
    loading.value = true
    try {
      const resp = await getSceneMomentDetail(props.sceneId)
      if (resp.code === 200) {
        scene.value = resp.data
      } else {
        ElMessage.error(resp.message || '加载失败')
      }
    } finally {
      loading.value = false
    }
  }

  // 创建评论的包装函数（适配CommentList的调用方式）
  const createSceneMomentCommentWrapper = async (data) => {
    return await createSceneMomentComment(props.sceneId, data)
  }

  // 删除评论的包装函数
  const deleteSceneMomentComment = async (commentId) => {
    // TODO: 如果需要删除功能，需要在sceneMoments API中添加删除评论的接口
    // 暂时返回不支持删除的响应
    return {
      success: false,
      message: '暂不支持删除评论'
    }
  }

  watch(
    () => [visible.value, props.sceneId],
    async ([v]) => {
      if (v) {
        await fetchDetail()
      } else {
        scene.value = null
      }
    }
  )

  const onLike = async () => {
    if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
    if (!scene.value?.id) return
    const resp = await toggleSceneMomentLike(scene.value.id)
    if (resp.code === 200) {
      scene.value.liked = resp.data.liked
      if (resp.data.likes_count !== undefined) scene.value.likes_count = resp.data.likes_count
      emit('updated', { type: 'like', id: scene.value.id, liked: scene.value.liked, likes_count: scene.value.likes_count })
    }
  }

  const onFavorite = async () => {
    if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
    if (!scene.value?.id) return
    const resp = await toggleFavorite({
      target_type: 'scene_moment',
      target_id: scene.value.id
    })
    if (resp.code === 200) {
      scene.value.favorited = resp.data.favorited
      scene.value.favourites_count = Math.max(0, Number(scene.value.favourites_count || 0) + (resp.data.favorited ? 1 : -1))
      emit('updated', { type: 'favorite', id: scene.value.id, favorited: scene.value.favorited })
    }
  }

  // 处理CommentList组件的评论创建事件
  const handleCreateComment = async ({ content, parent_id, onSuccess }) => {
    if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')

    try {
      const resp = await createSceneMomentComment(props.sceneId, { content, parent_id: parent_id || null })
      if (resp.code === 200) {
        onSuccess && onSuccess()
        if (scene.value) {
          scene.value.comments_count = Number(scene.value.comments_count || 0) + 1
          emit('updated', { type: 'comment', id: scene.value.id })
        }
      } else {
        ElMessage.error(resp.message || '评论失败')
      }
    } catch (error) {
      ElMessage.error('评论失败，请稍后重试')
    }
  }

  // 处理评论回复
  const handleReply = (comment) => {
    // 这里可以添加回复UI逻辑，比如显示@用户名等
    // 暂时直接调用创建评论，传递parent_id
    handleCreateComment({
      content: `@${comment.username} `, // 预填充@用户名
      parent_id: comment.id
    })
  }

  // 处理评论数量变化
  const handleCommentCountChange = (count) => {
    if (scene.value) {
      scene.value.comments_count = count
    }
  }
</script>

<style scoped>
.loading {
  padding: 10px 0;
}

.detail .image {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(31, 41, 55, 0.9);
}

.detail .image {
  display: flex;
  flex-direction: column;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.grid-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  cursor: pointer;
}

.image-placeholder {
  width: 100%;
  max-height: 260px;
  overflow: hidden;
  border-radius: 8px;
}

.image-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.meta {
  margin-top: 12px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(31, 41, 55, 0.9);
}

.author {
  font-size: 12px;
  color: rgba(156, 163, 175, 0.95);
}

.quote {
  margin-top: 10px;
  font-weight: 700;
  color: rgba(229, 231, 235, 0.95);
}

.desc {
  margin-top: 8px;
  margin-bottom: 12px;
  color: rgba(229, 231, 235, 0.9);
  line-height: 1.6;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(229, 231, 235, 0.95);
  flex: 1;
  min-width: 0;
}

.drawer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex-shrink: 0;
}

.characters {
  margin-top: 12px;
}

.character-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(229, 231, 235, 0.9);
  margin-bottom: 8px;
}

.character-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.character-list .el-tag.main-character {
  background-color: rgba(59, 130, 246, 0.9);
  border-color: rgba(59, 130, 246, 0.9);
  color: white;
  font-weight: 600;
}

.actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.stat {
  font-size: 12px;
  color: rgba(156, 163, 175, 0.95);
}


</style>


