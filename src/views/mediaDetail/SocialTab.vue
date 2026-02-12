<template>
  <div class="social">
    <div class="head">
      <div class="title">
        名场面
      </div>
      <div class="actions">
        <el-select v-model="sort" size="small" style="width: 160px;">
          <el-option label="最新" value="created_at" />
          <el-option label="最多点赞" value="likes_count" />
          <el-option label="最多收藏" value="favourites_count" />
          <el-option label="最多评论" value="comments_count" />
        </el-select>
        <el-button type="primary" size="small" @click="openCreate">
          创建名场面
        </el-button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else-if="list.length" class="timeline-wrap">
      <el-timeline mode="alternate">
        <el-timeline-item
          v-for="s in list"
          :key="s.id"
          :timestamp="formatTime(s.created_at)"
        >
          <SceneMomentCard
            :scene="s"
            @open="openDetail"
            @like="handleLike"
            @favorite="handleFavorite"
          />
        </el-timeline-item>
      </el-timeline>
    </div>

    <el-empty v-else description="暂无名场面，来提交第一个吧！" />

    <SceneMomentCreateDialog
      v-model="createVisible"
      :media-id="mediaId"
      :characters="mediaCharacters"
      @created="afterCreated"
    />

    <SceneMomentDetailDrawer
      v-model="detailVisible"
      :scene-id="activeSceneId"
      @updated="syncFromDetail"
    />
  </div>
</template>

<script setup>
  import { computed, inject, onMounted, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useRoute } from 'vue-router'
  import { useUserStore } from '@/stores/user'
  import { toggleFavorite } from '@/axios/favorite'
  import { getSceneMomentsByMedia, toggleSceneMomentLike } from '@/axios/sceneMoments'
  import SceneMomentCard from '@/components/sceneMoment/SceneMomentCard.vue'
  import SceneMomentCreateDialog from '@/components/sceneMoment/SceneMomentCreateDialog.vue'
  import SceneMomentDetailDrawer from '@/components/sceneMoment/SceneMomentDetailDrawer.vue'

  const route = useRoute()
  const userStore = useUserStore()

  const injected = inject('mediaDetail', null)
  const media = computed(() => injected?.value ?? injected ?? null)

  const mediaId = computed(() => media.value?.id ?? route.params.id)
  const mediaCharacters = computed(() => media.value?.characters || [])

  const loading = ref(false)
  const list = ref([])
  const sort = ref('created_at')

  const createVisible = ref(false)
  const detailVisible = ref(false)
  const activeSceneId = ref(null)

  const formatTime = (ts) => {
    if (!ts) return ''
    // MySQL TIMESTAMP -> string
    return String(ts).replace('T', ' ').slice(0, 16)
  }

  const fetchList = async () => {
    if (!mediaId.value) return
    loading.value = true
    try {
      const resp = await getSceneMomentsByMedia(mediaId.value, {
        page: 1,
        pageSize: 50,
        status: 'approved',
        is_public: true,
        sort: sort.value,
        order: 'DESC'
      })
      if (resp.code === 200) {
        list.value = resp.data.list || []
      } else {
        ElMessage.error(resp.message || '加载失败')
      }
    } catch (e) {
      ElMessage.error(e?.response?.data?.message || '加载失败')
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchList)
  watch(() => [mediaId.value, sort.value], fetchList)

  const openCreate = () => {
    if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
    createVisible.value = true
  }

  const afterCreated = async () => {
    // 新提交默认 pending，这里刷新一次即可（列表仍只展示 approved）
    await fetchList()
  }

  const openDetail = (scene) => {
    activeSceneId.value = scene.id
    detailVisible.value = true
  }

  const handleLike = async (scene) => {
    if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
    const resp = await toggleSceneMomentLike(scene.id)
    if (resp.code === 200) {
      scene.liked = resp.data.liked
      if (resp.data.likes_count !== undefined) scene.likes_count = resp.data.likes_count
    }
  }

  const handleFavorite = async (scene) => {
    if (!userStore.isLoggedIn) return ElMessage.warning('请先登录')
    const resp = await toggleFavorite({ target_type: 'scene_moment', target_id: scene.id })
    if (resp.code === 200) {
      scene.favorited = resp.data.favorited
      // favourites_count 由触发器维护，这里做一个即时反馈
      scene.favourites_count = Math.max(0, Number(scene.favourites_count || 0) + (resp.data.favorited ? 1 : -1))
    }
  }

  const syncFromDetail = (payload) => {
    const idx = list.value.findIndex((x) => x.id === payload?.id)
    if (idx === -1) return
    if (payload.type === 'like') {
      list.value[idx].liked = payload.liked
      if (payload.likes_count !== undefined) list.value[idx].likes_count = payload.likes_count
    }
    if (payload.type === 'favorite') {
      list.value[idx].favorited = payload.favorited
    }
    if (payload.type === 'comment') {
      list.value[idx].comments_count = Number(list.value[idx].comments_count || 0) + 1
    }
  }
</script>

<style scoped>
.social {
  padding: 4px 0;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.timeline-wrap {
  padding-top: 6px;
}

.timeline-wrap :deep(.el-timeline-item__wrapper) {
  max-width: 400px;
}

.timeline-wrap :deep(.el-timeline-item__content) {
  text-align: center;
}

.loading {
  padding: 12px 0;
}
</style>


