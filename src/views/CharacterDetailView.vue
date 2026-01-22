<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="character-detail-page">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 详情内容 -->
        <div v-else-if="character" class="character-detail-content">
          <!-- 顶部横幅 -->
          <div class="character-hero" :style="heroBackgroundStyle">
            <div class="character-hero-overlay" />
            <div class="character-hero-inner">
              <div class="character-hero-left">
                <div class="character-image-large">
                  <img :src="characterImage" :alt="displayName">
                </div>
                <div class="character-actions">
                  <el-button 
                    circle 
                    class="favorite-btn"
                    :class="{ 'favorited': isFavorited }"
                    @click="handleFavorite"
                  >
                    <el-icon>
                      <StarFilled />
                    </el-icon>
                  </el-button>
                </div>
              </div>

              <div class="character-hero-right">
                <h1 class="character-title-large">
                  {{ displayName }}
                </h1>
                <div v-if="alternativeNames.length > 0" class="character-alternative-names">
                  <div class="alternative-names-container">
                    <el-tag
                      v-for="(name, index) in visibleAlternativeNames"
                      :key="index"
                      class="alternative-name-tag"
                      size="small"
                      type="info"
                    >
                      {{ name }}
                    </el-tag>
                    <el-button
                      v-if="alternativeNames.length > 3"
                      text
                      size="small"
                      class="toggle-names-btn"
                      @click="toggleAlternativeNames"
                    >
                      {{ showAllAlternativeNames ? '收起' : `+${alternativeNames.length - 3}` }}
                    </el-button>
                  </div>
                </div>

                <div class="character-extra-meta">
                  <div v-if="character.gender" class="meta-row">
                    <span class="meta-label">Gender</span>
                    <span class="meta-value">{{ formatGender(character.gender) }}</span>
                  </div>
                  <div v-if="character.age" class="meta-row">
                    <span class="meta-label">Age</span>
                    <span class="meta-value">{{ character.age }}</span>
                  </div>
                  <div v-if="birthdayText" class="meta-row">
                    <span class="meta-label">Birthday</span>
                    <span class="meta-value">{{ birthdayText }}</span>
                  </div>
                  <div v-if="character.blood_type" class="meta-row">
                    <span class="meta-label">Blood Type</span>
                    <span class="meta-value">{{ character.blood_type }}</span>
                  </div>
                </div>

                <div v-if="character.description" class="character-description">
                  <div 
                    class="description-content"
                    :class="{ 'expanded': isDescriptionExpanded }"
                  >
                    <p v-html="character.description" />
                  </div>
                  <el-button
                    v-if="isDescriptionLong"
                    text
                    size="small"
                    class="toggle-description-btn"
                    @click="toggleDescription"
                  >
                    {{ isDescriptionExpanded ? '收起' : '展开' }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 下方内容：相关媒体 -->
          <div class="character-body">
            <div class="character-section">
              <h2 class="section-title">
                Related Media
              </h2>
              <div v-if="mediaLoading" class="loading-media">
                <el-skeleton :rows="3" animated />
              </div>
              <div v-else-if="mediaList && mediaList.length > 0" class="media-section">
                <MediaList :items="mediaList" layout="grid" />
              </div>
              <div v-else class="empty-media">
                <el-empty description="暂无相关媒体" />
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-container">
          <el-empty description="角色不存在或已被删除">
            <el-button type="primary" @click="$router.push('/media-library')">
              返回次元库
            </el-button>
          </el-empty>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { StarFilled } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import MediaList from '@/components/MediaList.vue'
  import { getCharacterDetail, getCharacterMedia } from '@/axios/characters'
  import { toggleFavorite, checkFavorite } from '@/axios/favorite'
  import { useUserStore } from '@/stores/user'

  const route = useRoute()
  const router = useRouter()

  const character = ref(null)
  const loading = ref(false)
  const mediaList = ref([])
  const mediaLoading = ref(false)
  const isFavorited = ref(false)
  const userStore = useUserStore()
  
  // 描述展开状态
  const isDescriptionExpanded = ref(false)
  const isDescriptionLong = ref(false)
  
  // 同义词展开状态
  const showAllAlternativeNames = ref(false)

  // 展示用字段
  const displayName = computed(() => {
    if (!character.value) return ''
    return (
      character.value.name_native ||
      character.value.name_alternative ||
      'Unknown'
    )
  })

  const characterImage = computed(() => {
    if (!character.value) return '/placeholder.jpg'
    return (
      character.value.image_large ||
      character.value.image_medium ||
      '/placeholder.jpg'
    )
  })

  const heroBackgroundStyle = computed(() => {
    if (!character.value) {
      return {}
    }
    const bg = character.value.image_large || character.value.image_medium

    if (!bg) return {}

    return {
      backgroundImage: `url(${bg})`
    }
  })

  const birthdayText = computed(() => {
    if (!character.value) return ''
    const { date_of_birth_year, date_of_birth_month, date_of_birth_day } = character.value
    if (date_of_birth_year && date_of_birth_month && date_of_birth_day) {
      return `${date_of_birth_year}-${String(date_of_birth_month).padStart(2, '0')}-${String(date_of_birth_day).padStart(2, '0')}`
    }
    if (date_of_birth_year && date_of_birth_month) {
      return `${date_of_birth_year}-${String(date_of_birth_month).padStart(2, '0')}`
    }
    if (date_of_birth_year) {
      return `${date_of_birth_year}`
    }
    return ''
  })

  // 处理同义词
  const alternativeNames = computed(() => {
    if (!character.value?.name_alternative) return []
    // 假设同义词用逗号或其他分隔符分隔
    return JSON.parse(character.value.name_alternative || '[]')
  })

  const visibleAlternativeNames = computed(() => {
    if (showAllAlternativeNames.value) {
      return alternativeNames.value
    }
    return alternativeNames.value.slice(0, 3)
  })

  // 切换同义词显示
  const toggleAlternativeNames = () => {
    showAllAlternativeNames.value = !showAllAlternativeNames.value
  }

  // 切换描述展开
  const toggleDescription = () => {
    isDescriptionExpanded.value = !isDescriptionExpanded.value
  }

  // 检查描述是否过长
  const checkDescriptionLength = () => {
    if (!character.value?.description) {
      isDescriptionLong.value = false
      return
    }
    // 简单的长度检查，也可以根据实际渲染高度来判断
    const textLength = character.value.description.replace(/<[^>]*>/g, '').length
    isDescriptionLong.value = textLength > 200 // 超过200字符认为是长文本
  }

  const formatGender = (gender) => {
    const map = {
      MALE: 'Male',
      FEMALE: 'Female',
      NON_BINARY: 'Non-Binary'
    }
    return map[gender] || gender
  }

  const fetchCharacterDetail = async () => {
    loading.value = true
    try {
      const response = await getCharacterDetail(route.params.id)
      if (response.code === 200) {
        character.value = response.data
        // 检查描述长度
        checkDescriptionLength()
        // 检查收藏状态
        if (userStore.isLoggedIn && character.value?.id) {
          await checkFavoriteStatus()
        }
        // 获取相关媒体
        await fetchCharacterMedia()
      } else {
        ElMessage.error(response.message || '获取角色详情失败')
      }
    } catch (error) {
      console.error('获取角色详情失败:', error)
      ElMessage.error('获取角色详情失败')
    } finally {
      loading.value = false
    }
  }

  const fetchCharacterMedia = async () => {
    if (!character.value?.id) return
    
    mediaLoading.value = true
    try {
      const response = await getCharacterMedia(character.value.id, {
        page: 1,
        pageSize: 50
      })
      if (response.code === 200) {
        mediaList.value = response.data.list || []
      } else {
        ElMessage.error(response.message || '获取相关媒体失败')
      }
    } catch (error) {
      console.error('获取相关媒体失败:', error)
      ElMessage.error('获取相关媒体失败')
    } finally {
      mediaLoading.value = false
    }
  }

  // 检查收藏状态
  const checkFavoriteStatus = async () => {
    if (!userStore.isLoggedIn || !character.value?.id) return

    try {
      const response = await checkFavorite({
        target_type: 'character',
        target_id: character.value.id
      })
      if (response.code === 200) {
        isFavorited.value = response.data.favorited
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  }

  // 处理收藏
  const handleFavorite = async () => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }

    if (!character.value?.id) {
      ElMessage.error('角色信息不完整')
      return
    }

    try {
      const response = await toggleFavorite({
        target_type: 'character',
        target_id: character.value.id
      })
      
      if (response.code === 200) {
        isFavorited.value = response.data.favorited
        ElMessage.success(response.data.favorited ? '收藏成功' : '取消收藏成功')
      } else {
        ElMessage.error(response.message || '操作失败')
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
      ElMessage.error(error.response?.data?.message || '操作失败')
    }
  }

  onMounted(() => {
    if (route.params.id) {
      fetchCharacterDetail()
    }
  })

  watch(
    () => route.params.id,
    (newId) => {
      if (newId) {
        character.value = null
        mediaList.value = []
        isDescriptionExpanded.value = false
        showAllAlternativeNames.value = false
        fetchCharacterDetail()
      }
    }
  )
</script>

<style scoped>
.character-detail-page {
  padding: 0 24px 32px;
  min-height: 100vh;
}

.loading-container {
  padding: 40px 0;
}

.character-detail-content {
  margin: 0 auto;
}

/* 顶部横幅 */
.character-hero {
  position: relative;
  margin: 24px -24px 0;
  padding: 40px 24px 32px;
  background-position: center top;
  background-size: cover;
  background-repeat: no-repeat;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

.character-hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(5, 5, 10, 0.7),
    rgba(5, 5, 10, 0.95)
  );
}

.character-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.character-hero-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.character-image-large {
  flex-shrink: 0;
  width: 260px;
  height: 360px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-tertiary);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6);
}

.character-image-large img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.character-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.favorite-btn {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(148, 163, 184, 0.5);
  color: #fde68a;
  transition: all 0.3s ease;
}

.favorite-btn.favorited {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
  color: #fbbf24;
}

.favorite-btn:hover {
  background: rgba(245, 158, 11, 0.3);
  border-color: #f59e0b;
  color: #fbbf24;
}

.character-hero-right {
  flex: 1;
  color: #e5e7eb;
}

.character-title-large {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.character-alternative-name {
  font-size: 18px;
  color: rgba(229, 231, 235, 0.8);
  margin-bottom: 16px;
}

.character-alternative-names {
  margin-bottom: 16px;
}

.alternative-names-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.alternative-name-tag {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: #93c5fd;
}

.toggle-names-btn {
  color: rgba(156, 163, 175, 0.8);
  font-size: 12px;
  padding: 0 8px;
  height: 24px;
  min-height: 24px;
}

.toggle-names-btn:hover {
  color: #93c5fd;
}

.character-extra-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.meta-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.meta-label {
  min-width: 80px;
  color: rgba(156, 163, 175, 0.95);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 11px;
}

.meta-value {
  color: #e5e7eb;
}

.character-description {
  margin-top: 16px;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(229, 231, 235, 0.9);
}

.description-content {
  overflow: hidden;
  transition: all 0.3s ease;
}

.description-content:not(.expanded) {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  max-height: calc(1.7em * 3);
}

.description-content.expanded {
  display: block;
  max-height: 200px;
  overflow: scroll;
}

.description-content p {
  margin: 0;
}

.toggle-description-btn {
  color: rgba(156, 163, 175, 0.8);
  font-size: 12px;
  padding: 4px 0;
  margin-top: 8px;
}

.toggle-description-btn:hover {
  color: #93c5fd;
}

/* 下方主体内容 */
.character-body {
  padding: 24px 0 0;
}

.character-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
}

.loading-media {
  padding: 20px 0;
}

.media-section {
  margin-top: 16px;
}

.empty-media {
  padding: 40px 0;
}

.empty-container {
  padding: 60px 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .character-detail-page {
    padding: 0 12px 24px;
  }

  .character-hero {
    margin: 12px -12px 0;
    padding: 24px 16px 20px;
    border-radius: 0 0 12px 12px;
  }

  .character-hero-inner {
    flex-direction: column;
    align-items: center;
  }

  .character-image-large {
    width: 200px;
    height: 280px;
  }

  .character-hero-right {
    text-align: center;
  }

  .character-title-large {
    font-size: 24px;
  }

  .meta-row {
    justify-content: center;
  }

  .alternative-names-container {
    justify-content: center;
  }

  .character-description {
    text-align: left;
  }
}
</style>

