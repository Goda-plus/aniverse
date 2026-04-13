<template>
  <div class="scene-contrib-tab">
    <div class="header-row">
      <h3 class="section-title">
        名场面贡献
      </h3>
      <el-button type="primary" plain @click="goScenes">
        浏览名场面
      </el-button>
    </div>

    <div v-if="loading" class="loading-row">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="scenes.length" class="scene-list">
      <div
        v-for="s in scenes"
        :key="s.id"
        class="scene-row"
        @click="openDetail(s.id)"
      >
        <div class="thumb">
          <img
            v-if="thumbUrl(s)"
            :src="thumbUrl(s)"
            alt=""
          >
          <div v-else class="thumb-ph">
            无图
          </div>
        </div>
        <div class="scene-info">
          <div class="scene-title">
            {{ s.title || '未命名' }}
          </div>
          <div class="scene-sub">
            {{ s.media_title || s.media_title_native || `作品 #${s.media_id}` }}
            <span v-if="s.episode" class="ep">第 {{ s.episode }} 集</span>
          </div>
          <div v-if="s.quote_text" class="quote">
            「{{ s.quote_text }}」
          </div>
          <div class="scene-meta">
            <el-tag :type="modTagType(s.moderation_status)" size="small">
              {{ modLabel(s.moderation_status) }}
            </el-tag>
            <span class="time">{{ formatDate(s.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="你还没有提交过名场面">
      <el-button type="primary" @click="openCreate">
        创建名场面
      </el-button>
    </el-empty>

    <div v-if="total > pageSize" class="pager">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        layout="prev, pager, next, total"
        :total="total"
        @current-change="loadList"
      />
    </div>

    <SceneMomentDetailDrawer
      v-model="showDrawer"
      :scene-id="selectedId"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Loading } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import SceneMomentDetailDrawer from '@/components/sceneMoment/SceneMomentDetailDrawer.vue'
  import { getMySceneMoments } from '@/axios/sceneMoments'

  const router = useRouter()

  const scenes = ref([])
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const showDrawer = ref(false)
  const selectedId = ref(null)

  const resolveUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/uploads/')) return `http://localhost:3000${path}`
    return path
  }

  const thumbUrl = (s) => {
    const arr = s.image_url
    if (Array.isArray(arr) && arr.length) return resolveUrl(arr[0])
    return ''
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const modLabel = (st) => {
    const m = {
      approved: '已通过',
      pending: '待审核',
      rejected: '未通过'
    }
    return m[st] || st || '—'
  }

  const modTagType = (st) => {
    if (st === 'approved') return 'success'
    if (st === 'pending') return 'warning'
    if (st === 'rejected') return 'danger'
    return 'info'
  }

  const loadList = async () => {
    loading.value = true
    try {
      const res = await getMySceneMoments({
        page: currentPage.value,
        pageSize: pageSize.value
      })
      if (res.success && res.data) {
        scenes.value = res.data.list || []
        total.value = res.data.pagination?.total ?? 0
      } else {
        scenes.value = []
        total.value = 0
      }
    } catch (e) {
      console.error(e)
      ElMessage.error(e.response?.data?.message || '加载名场面贡献失败')
      scenes.value = []
    } finally {
      loading.value = false
    }
  }

  const openDetail = (id) => {
    selectedId.value = id
    showDrawer.value = true
  }

  const goScenes = () => {
    router.push({ name: 'scenes' })
  }

  const openCreate = () => {
    router.push({ name: 'scenes' })
  }

  onMounted(() => {
    loadList()
  })
</script>

<style scoped>
.scene-contrib-tab {
  padding: 8px 0 24px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary, #fff);
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 32px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
}

.scene-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scene-row {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  background: var(--card-bg, #252529);
  cursor: pointer;
  transition: border-color 0.2s;
}

.scene-row:hover {
  border-color: rgba(255, 105, 180, 0.45);
}

.thumb {
  width: 96px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #2a2a2e;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

.scene-info {
  flex: 1;
  min-width: 0;
}

.scene-title {
  font-weight: 600;
  color: var(--text-primary, #fff);
  margin-bottom: 4px;
  line-height: 1.35;
}

.scene-sub {
  font-size: 13px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.65));
  margin-bottom: 4px;
}

.scene-sub .ep {
  margin-left: 8px;
  opacity: 0.85;
}

.quote {
  font-size: 13px;
  color: rgba(255, 182, 193, 0.95);
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.scene-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.scene-meta .time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.pager {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
