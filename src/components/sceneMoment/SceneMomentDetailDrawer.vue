<template>
  <el-drawer
    v-model="visible"
    :title="scene?.title || '名场面详情'"
    size="560px"
    :with-header="true"
  >
    <div v-if="loading" class="loading">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else-if="scene" class="detail">
      <div class="image">
        <img :src="scene.image_url || '/placeholder.jpg'" alt="">
      </div>

      <div class="meta">
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
        <div v-if="scene.description" class="desc">
          {{ scene.description }}
        </div>

        <div v-if="scene.tags?.length" class="tags">
          <el-tag v-for="t in scene.tags" :key="t.id" size="small" effect="dark">
            {{ t.name }}
          </el-tag>
        </div>

        <div v-if="scene.characters?.length" class="chars">
          <el-tag v-for="c in scene.characters" :key="c.id" size="small">
            {{ c.name_native || c.name_alternative || c.id }}
          </el-tag>
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

      <div class="comments">
        <div class="comments-head">
          <div class="h">
            评论
          </div>
          <el-button size="small" @click="refreshComments">
            刷新
          </el-button>
        </div>

        <div class="editor">
          <el-input v-model="commentText" type="textarea" :rows="2" placeholder="写下你的想法…" />
          <div class="editor-actions">
            <el-button type="primary" size="small" :loading="commentSubmitting" @click="submitComment()">
              发表
            </el-button>
          </div>
        </div>

        <div v-if="commentsLoading" class="loading">
          <el-skeleton :rows="4" animated />
        </div>

        <div v-else-if="comments.length" class="comment-list">
          <SceneMomentCommentNode
            v-for="c in comments"
            :key="c.id"
            :node="c"
            @reply="submitComment"
          />
        </div>
        <el-empty v-else description="暂无评论" />
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
  import { computed, ref, watch ,defineProps, defineEmits} from 'vue'
  import { ElMessage } from 'element-plus'
  import { useUserStore } from '@/stores/user'
  import SceneMomentCommentNode from './SceneMomentCommentNode.vue'
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

  const commentsLoading = ref(false)
  const comments = ref([])
  const commentText = ref('')
  const commentSubmitting = ref(false)

  const timeText = computed(() => {
    const sec = scene.value?.time_position
    if (sec === null || sec === undefined || sec === '') return ''
    const s = Math.max(0, Number(sec) || 0)
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(Math.floor(s % 60)).padStart(2, '0')
    return `${mm}:${ss}`
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

  const refreshComments = async () => {
    if (!props.sceneId) return
    commentsLoading.value = true
    try {
      const resp = await getSceneMomentComments(props.sceneId)
      if (resp.code === 200) {
        comments.value = resp.data.list || []
      }
    } finally {
      commentsLoading.value = false
    }
  }

  watch(
    () => [visible.value, props.sceneId],
    async ([v]) => {
      if (v) {
        await fetchDetail()
        await refreshComments()
      } else {
        scene.value = null
        comments.value = []
        commentText.value = ''
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

  const submitComment = async (payload) => {
    if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
    const content = (payload?.content ?? commentText.value).trim()
    if (!content) return
    commentSubmitting.value = true
    try {
      const resp = await createSceneMomentComment(props.sceneId, { content, parent_id: payload?.parent_id || null })
      if (resp.code === 200) {
        commentText.value = ''
        await refreshComments()
        if (scene.value) {
          scene.value.comments_count = Number(scene.value.comments_count || 0) + 1
          emit('updated', { type: 'comment', id: scene.value.id })
        }
      } else {
        ElMessage.error(resp.message || '评论失败')
      }
    } finally {
      commentSubmitting.value = false
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

.detail .image img {
  width: 100%;
  max-height: 260px;
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
  color: rgba(229, 231, 235, 0.9);
  line-height: 1.6;
}

.tags, .chars {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
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

.comments-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comments-head .h {
  font-weight: 700;
}

.editor {
  margin-top: 10px;
}

.editor-actions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

</style>


