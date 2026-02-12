<template>
  <div v-if="props.scene" class="scene-stack-wrapper" @click="emit('open', processedScenes[0])">
    <div v-if="processedScenes[0].imageUrls.length > 0" class="image-stack">
      <div
        v-for="(imageUrl, imgIndex) in processedScenes[0].imageUrls.slice(0, 5)"
        :key="imgIndex"
        class="stack-item"
      >
        <img
          :src="imageUrl || '/placeholder.jpg'"
          :alt="processedScenes[0].title"
        >
        <!-- hover 显示标题 -->
        <div class="stack-caption">
          <div class="caption-title">
            {{ processedScenes[0].title }}
          </div>
          <div class="caption-desc">
            {{ processedScenes[0].description || '精彩瞬间' }}
          </div>
        </div>
      </div>
    </div>

    <div v-else class="image-stack">
      <div class="stack-item">
        <img :src="'/placeholder.jpg'" alt="placeholder">
        <div class="stack-caption">
          <div class="caption-title">
            {{ processedScenes[0].title }}
          </div>
          <div class="caption-desc">
            {{ processedScenes[0].description || '精彩瞬间' }}
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="props.scenes.length" class="scene-timeline-wrapper">
    <el-timeline class="scene-timeline" :mode="mode">
      <el-timeline-item
        v-for="(sceneItem, index) in processedScenes"
        :key="sceneItem.id || index"
        :timestamp="sceneItem.timestamp"
        :type="sceneItem.liked ? 'primary' : sceneItem.favorited ? 'warning' : 'info'"
      >
        <div class="scene-stack-wrapper" @click="emit('open', sceneItem)">
          <div v-if="sceneItem.imageUrls.length > 0" class="image-stack">
            <img
              v-for="(imageUrl, imgIndex) in sceneItem.imageUrls.slice(0, 5)"
              :key="imgIndex"
              :src="imageUrl || '/placeholder.jpg'"
              :alt="sceneItem.title"
              class="stack-item"
            >
          </div>
          <div v-else class="image-stack">
            <img :src="'/placeholder.jpg'" alt="placeholder" class="stack-item">
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup>
  import { computed ,defineProps, defineEmits} from 'vue'

  const props = defineProps({
    scene: {
      type: Object,
      default: null
    },
    scenes: {
      type: Array,
      default: () => []
    },
    mode: {
      type: String,
      default: 'alternate-reverse'
    }
  })

  const emit = defineEmits(['open', 'like', 'favorite'])

  // 处理场景数据的 computed 属性
  const processedScenes = computed(() => {
    const sceneList = props.scene ? [props.scene] : props.scenes
    return sceneList.map(scene => ({
      ...scene,
      tagNames: Array.isArray(scene.tag_names) ? scene.tag_names : [],
      timeText: formatTimeText(scene.time_position),
      imageUrls: getAllImageUrls(scene.image_url),
      timestamp: formatTimestamp(scene)
    }))
  })

  const formatTimeText = (timeString) => {
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
  }

  const getAllImageUrls = (img) => {
    if (Array.isArray(img) && img.length > 0) {
      return img
    }
    if (typeof img === 'string' && img) {
      return [img]
    }
    return []
  }

  const formatTimestamp = (scene) => {
    // 如果有创建时间，使用创建时间；否则使用时间位置
    if (scene.created_at) {
      return new Date(scene.created_at).toLocaleString()
    }
    if (scene.time_position) {
      return formatTimeText(scene.time_position)
    }
    return ''
  }
</script>

<style scoped>
.scene-timeline {
  --el-timeline-node-size: 12px;
  --el-timeline-axis-color: rgba(31, 41, 55, 0.5);
}

.scene-stack-wrapper {
  cursor: pointer;
  display: flex;
  justify-content: center;
  margin: 20px 0;
  position: relative;
}

/* 堆叠容器 */
.image-stack {
  position: relative;
  width: 250px;
  height: 150px;
  margin: 0 auto;
}

/* 堆叠项 */
.stack-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  transition: transform 0.6s cubic-bezier(0.23,1,0.32,1),
              z-index 0.6s cubic-bezier(0.23,1,0.32,1),
              box-shadow 0.6s cubic-bezier(0.23,1,0.32,1);
  z-index: 1;
  cursor: pointer;
}

.stack-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.6s ease;
}

.stack-item:hover img {
  transform: scale(1.05);
}

/* 每张图片的不同旋转角度 */
.stack-item:nth-child(1) { transform: rotate(-8deg) translateY(-10px); }
.stack-item:nth-child(2) { transform: rotate(-4deg) translateY(-5px); }
.stack-item:nth-child(3) { transform: rotate(0deg); }
.stack-item:nth-child(4) { transform: rotate(4deg) translateY(-5px); }
.stack-item:nth-child(5) { transform: rotate(8deg) translateY(-10px); }

/* 悬停效果 */
.stack-item:hover {
  transform: rotate(0deg) scale(1.05) translateY(-20px) !important;
  box-shadow: 0 25px 50px rgba(0,0,0,0.2);
  z-index: 10 !important;
}

/* 标题覆盖层 */
.stack-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  padding: 20px 15px 15px;
  transform: translateY(100%);
  transition: transform 0.4s ease;
  text-align: left;
  z-index: 11;
}

.stack-item:hover .stack-caption {
  transform: translateY(0);
}

.caption-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 5px;
}

.caption-desc {
  font-size: 0.9rem;
  opacity: 0.9;
}

.body {
  flex: 1;
  padding: 10px 12px 12px 0;
  min-width: 0;
}

@media (max-width: 700px) {
  .image-stack {
    width: 187px;
    height: 112px;
  }
}
</style>


