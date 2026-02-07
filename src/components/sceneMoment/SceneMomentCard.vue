<template>
  <el-card class="scene-card" shadow="hover" @click="emit('open', scene)">
    <div class="card-inner">
      <div class="thumb">
        <img :src="firstImageUrl || '/placeholder.jpg'" alt="">
      </div>

      <div class="body" @click.stop>
        <div class="title-row">
          <div class="title">
            {{ scene.title }}
          </div>
          <div class="meta">
            <span v-if="scene.episode">{{ scene.episode }}</span>
            <span v-if="scene.episode && timeText"> · </span>
            <span v-if="timeText">{{ timeText }}</span>
          </div>
        </div>

        <div v-if="scene.quote_text" class="quote">
          “{{ scene.quote_text }}”
        </div>
        <div v-else-if="scene.description" class="desc">
          {{ scene.description }}
        </div>

        <div v-if="tagNames.length" class="tags">
          <el-tag v-for="t in tagNames" :key="t" size="small" effect="dark">
            {{ t }}
          </el-tag>
        </div>

        <div class="actions">
          <!-- <div class="stats">
            <span class="stat">👍 {{ scene.likes_count || 0 }}</span>
            <span class="stat">⭐ {{ scene.favourites_count || 0 }}</span>
            <span class="stat">💬 {{ scene.comments_count || 0 }}</span>
          </div> -->

          <div class="theme-settings btns">
            <el-button size="small" class="action-btn" :type="scene.liked ? 'primary' : 'default'" @click="emit('like', scene)">
              {{ scene.liked ? '已赞' : '点赞' }}
            </el-button>
            <el-button size="small" class="action-btn" :type="scene.favorited ? 'warning' : 'default'" @click="emit('favorite', scene)">
              {{ scene.favorited ? '已收藏' : '收藏' }}
            </el-button>
            <el-button size="small" class="action-btn" @click="emit('open', scene)">
              详情
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup>
  import { computed ,defineProps, defineEmits} from 'vue'

  const props = defineProps({
    scene: {
      type: Object,
      required: true
    }
  })

  const emit = defineEmits(['open', 'like', 'favorite'])

  const tagNames = computed(() => {
    // 后端 listByMedia 返回 tag_names: string[]
    if (Array.isArray(props.scene.tag_names)) return props.scene.tag_names
    return []
  })

  const timeText = computed(() => {
    const sec = props.scene.time_position
    if (sec === null || sec === undefined || sec === '') return ''
    const s = Math.max(0, Number(sec) || 0)
    const mm = String(Math.floor(s / 60)).padStart(2, '0')
    const ss = String(Math.floor(s % 60)).padStart(2, '0')
    return `${mm}:${ss}`
  })

  // 处理 image_url：可能是数组或字符串
  const firstImageUrl = computed(() => {
    const img = props.scene.image_url
    if (Array.isArray(img) && img.length > 0) {
      return img[0]
    }
    if (typeof img === 'string' && img) {
      return img
    }
    return null
  })
</script>

<style scoped>
.scene-card {
  cursor: pointer;
  padding: 0;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(31, 41, 55, 0.9);
  border-radius: 12px;
}

.card-inner {
  display: flex;
  gap: 12px;
}

.thumb {
  flex: 0 0 168px;
  height: 118px;
  background: var(--bg-tertiary);
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.body {
  flex: 1;
  padding: 10px 12px 12px 0;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: #f9fafb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: 12px;
  color: rgba(156, 163, 175, 0.95);
  flex-shrink: 0;
}

.quote, .desc {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(229, 231, 235, 0.9);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: rgba(156, 163, 175, 0.95);
}

.btns {
  display: flex;
  gap: 8px;
}

@media (max-width: 700px) {
  .card-inner {
    flex-direction: column;
  }
  .thumb {
    width: 100%;
    flex-basis: auto;
  }
  .body {
    padding: 10px 12px 12px;
  }
  .actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>


