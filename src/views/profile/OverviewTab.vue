<template>
  <div class="overview-section">
    <div class="overview-content">
      <!-- 个人简介独立盒子 -->
      <div class="panel personal-signature-panel">
        <div class="personal-signature">
          个性签名
        </div>
        <span v-if="userStore.user?.bio" style="margin-top: 10px;">{{ userStore.user?.bio }}</span>
        <span v-else style="margin-top: 10px;">暂无个性签名</span>
        <div style="position: absolute; right: 10px;top: 50%;transform: translateY(-50%);">
          <el-button type="primary" @click="editPersonalSignature">
            编辑个人信息
          </el-button>
        </div>
      </div>  

      <!-- 左右两列布局 -->
      <div class="overview-layout">
        <!-- 左列 -->
        <div class="left-column">
          <!-- Activity History 面板 -->
          <div class="panel activity-history-panel">
            <h3 class="panel-title">
              Activity History
            </h3>
            <div class="activity-label">
              本月登录的天
            </div>
            <div class="activity-grid">
              <div 
                v-for="(day, index) in activityDays" 
                :key="index"
                class="activity-day"
                :class="`activity-level-${day.level}`"
                :title="`${day.date}: ${day.level > 0 ? 'Active' : 'Inactive'}`"
              />
            </div>
          </div>

          <!-- Genre Overview 面板 -->
          <div class="panel genre-overview-panel">
            <div class="panel-header-with-action">
              <h3 class="panel-title">
                Genre Overview
              </h3>
              <div class="genre-actions">
                <el-button
                  type="primary"
                  text
                  size="small"
                  @click="openEditGenres"
                >
                  编辑喜欢的分类
                </el-button>
                <el-button
                  type="primary"
                  text
                  size="small"
                  @click="openEditTags"
                >
                  编辑兴趣标签
                </el-button>
              </div>
            </div>
            <div class="genre-label">
              喜欢的分类
            </div>
            <div class="genre-tags">
              <div 
                v-for="genre in genres" 
                :key="genre.name"
                class="genre-tag"
                :class="`genre-${genre.name.toLowerCase()}`"
              >
                <div class="genre-name">
                  {{ genre.name }}
                </div>
                <div class="genre-entries">
                  {{ genre.entries }} Entries
                </div>
                <div class="genre-progress-bar">
                  <div 
                    class="genre-progress-fill"
                    :style="{ width: `${genre.progress}%` }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Anime 面板 -->
          <div class="panel anime-panel">
            <h3 class="panel-title">
              Anime
            </h3>
            <div class="anime-label">
              收藏的动漫
            </div>
            <div v-if="collectedAnime.length > 0" class="anime-grid">
              <div
                v-for="(anime, index) in animeExpanded ? collectedAnime : collectedAnime.slice(0, 3)"
                :key="`anime-${index}`"
                class="anime-cover"
              >
                <el-image
                  :src="anime.cover_image_large"
                  :alt="anime.title_native || anime.title_english"
                  fit="fill"
                  @error="handleImageError"
                />
                <div class="anime-title">
                  {{ anime.title_native || anime.title_english }}
                </div>
              </div>
            </div>
            <div v-else class="no-collections">
              暂无收藏的动漫
            </div>
            <!-- 展开/收起按钮 -->
            <div v-if="collectedAnime.length > 3" class="expand-button-container">
              <el-button
                type="text"
                class="expand-button"
                @click="toggleAnimeExpanded"
              >
                {{ animeExpanded ? '收起' : '展开更多' }}
                <el-icon :class="{ 'rotate-icon': animeExpanded }">
                  <ArrowDown />
                </el-icon>
              </el-button>
            </div>
          </div>

          <!-- Characters 面板 -->
          <div class="panel characters-panel">
            <h3 class="panel-title">
              Characters
            </h3>
            <div class="characters-label">
              收藏的角色
            </div>
            <div v-if="collectedCharacters.length > 0" class="anime-grid">
              <div
                v-for="(character, index) in charactersExpanded ? collectedCharacters : collectedCharacters.slice(0, 3)"
                :key="`character-${index}`"
                class="anime-cover"
              >
                <el-image
                  :src="character.image_large"
                  :alt="character.name_native"
                  fit="fill"
                  @error="handleImageError"
                />
                <div class="character-title">
                  {{ character.name_native }}
                </div>
              </div>
            </div>
            <div v-else class="no-collections">
              暂无收藏的角色
            </div>
            <!-- 展开/收起按钮 -->
            <div v-if="collectedCharacters.length > 3" class="expand-button-container">
              <el-button
                type="text"
                class="expand-button"
                @click="toggleCharactersExpanded"
              >
                {{ charactersExpanded ? '收起' : '展开更多' }}
                <el-icon :class="{ 'rotate-icon': charactersExpanded }">
                  <ArrowDown />
                </el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 右列 -->
        <div class="right-column">
          <!-- Statistics 面板 -->
          <div class="panel statistics-panel">
            <div class="statistics-label">
              统计数据: 总发帖数、今日名场面贡献数、今日发帖数
            </div>
            <div class="statistics-metrics">
              <div class="stat-metric">
                <div class="stat-value">
                  {{ statistics.totalPosts }}
                </div>
                <div class="stat-label">
                  总发帖数
                </div>
              </div>
              <div class="stat-metric">
                <div class="stat-value">
                  {{ statistics.todayScenes }}
                </div>
                <div class="stat-label">
                  今日名场面贡献数
                </div>
              </div>
              <div class="stat-metric">
                <div class="stat-value">
                  {{ statistics.todayPosts }}
                </div>
                <div class="stat-label">
                  今日发帖数
                </div>
              </div>
            </div>
            <div class="progress-section">
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  :style="{ width: `${statistics.progress}%` }"
                />
              </div>
              <div class="progress-markers">
                <span>100</span>
                <span>150</span>
                <span>200</span>
              </div>
            </div>
          </div>

          <!-- Activity 面板 -->
          <div class="panel activity-panel">
            <div class="activity-header">
              <h3 class="panel-title">
                Activity
              </h3>
              <el-select
                v-model="activityFilter"
                placeholder="Filter"
                class="activity-filter"
                size="small"
              >
                <el-option label="全部" value="all" />
                <el-option label="帖子" value="posts" />
                <el-option label="社区" value="community" />
                <el-option label="动漫" value="anime" />
                <el-option label="角色" value="characters" />
                <el-option label="名场面" value="scenes" />
              </el-select>
            </div>
            <div class="activity-log">
              <div
                v-for="(activity, index) in activities"
                :key="index"
                class="activity-item"
              >
                <div v-if="activity.thumbnail" class="activity-thumbnail">
                  <img
                    :src="activity.thumbnail"
                    :alt="activity.animeTitle"
                    @error="handleImageError"
                  >
                </div>
                <div class="activity-content">
                  <div class="activity-description">
                    {{ activity.description }}
                  </div>
                  <div class="activity-meta">
                    <span class="activity-time">{{ activity.timeAgo }}</span>
                    <div class="activity-icons">
                      <el-icon class="heart-icon heart-red">
                        <Heart />
                      </el-icon>
                      <el-icon class="heart-icon heart-grey">
                        <Heart />
                      </el-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- 分页器 -->
            <div v-if="totalActivities > pageSize" class="activity-pagination">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[5, 10, 20, 50]"
                :total="totalActivities"
                layout="total, sizes, prev, pager, next, jumper"
                background
                small
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <UserSettings v-model="showUserSettings" />
  <!-- 编辑喜欢的分类对话框 -->
  <el-dialog
    v-model="editGenresVisible"
    title="编辑喜欢的分类"
    width="420px"
    append-to-body
  >
    <div class="edit-genres-content">
      <p class="edit-genres-tip">
        选择你喜欢的番剧分类，这将影响首页推荐与同好匹配结果。
      </p>
      <el-form label-width="80px">
        <el-form-item label="喜欢的分类">
          <el-select
            v-model="selectedGenres"
            multiple
            filterable
            clearable
            :loading="loadingGenres"
            placeholder="选择你常看的番剧类型"
            style="width: 100%;"
          >
            <el-option
              v-for="genre in genreOptions"
              :key="genre.id || genre.name"
              :label="genre.name"
              :value="genre.name"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="editGenresVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="savingGenres"
          @click="handleSaveGenres"
        >
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
  <!-- 编辑兴趣标签对话框 -->
  <el-dialog
    v-model="editTagsVisible"
    title="编辑兴趣标签"
    width="480px"
    append-to-body
  >
    <div class="edit-tags-content">
      <p class="edit-tags-tip">
        选择你感兴趣的主题标签，这将帮助系统为你推荐更合拍的内容与同好。
      </p>
      <el-form label-width="80px">
        <el-form-item label="兴趣标签">
          <el-select
            v-model="selectedTagIds"
            multiple
            filterable
            clearable
            :loading="loadingTags"
            placeholder="选择或搜索你感兴趣的标签"
            style="width: 100%;"
          >
            <el-option
              v-for="tag in tagOptions"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <div v-if="userTags.length" class="current-tags-preview">
        <span class="current-tags-label">当前标签：</span>
        <div class="current-tags-list">
          <el-tag
            v-for="tag in userTags"
            :key="getTagId(tag)"
            size="small"
            class="preview-tag"
          >
            {{ getTagName(tag) }}
          </el-tag>
        </div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="editTagsVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="savingTags"
          @click="handleSaveTags"
        >
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, onMounted, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Heart, ArrowDown } from '@element-plus/icons-vue'
  import { useUserStore } from '@/stores/user'
  import UserSettings from '@/components/UserSettings.vue'
  import { getFavorite } from '@/axios/favorite'
  import { getUserActivities, getUserStatistics } from '@/axios/browse'
  import { 
    getUserInterests, 
    updateUserGenres,
    batchAddInterests,
    removeUserInterest
  } from '@/axios/userInterest'
  import { getAllGenres } from '@/axios/genre'
  import { getTagsList } from '@/axios/tags'

  const activityFilter = ref('all')
  const showUserSettings = ref(false)
  const animeExpanded = ref(false)
  const charactersExpanded = ref(false)
  const userStore = useUserStore()
  // 活动历史数据 - 生成约30天的活动网格（7行，每行约4-5个）
  const activityDays = ref([])

  // 分页相关状态
  const currentPage = ref(1)
  const pageSize = ref(10)
  const totalActivities = ref(0)

  // 生成活动数据
  const generateActivityDays = () => {
    const days = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      // 随机生成活动级别：0=无活动，1=低活动，2=中活动，3=高活动
      const level = Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 0
      days.push({
        date: date.toLocaleDateString(),
        level
      })
    }
    return days
  }

  // 分类数据（喜欢的分类）
  const genres = ref([])

  // 兴趣标签数据
  const userTags = ref([])

  // 编辑喜欢的分类对话框状态
  const editGenresVisible = ref(false)
  const selectedGenres = ref([])
  const genreOptions = ref([])
  const loadingGenres = ref(false)
  const savingGenres = ref(false)

  // 编辑兴趣标签对话框状态
  const editTagsVisible = ref(false)
  const selectedTagIds = ref([])
  const tagOptions = ref([])
  const loadingTags = ref(false)
  const savingTags = ref(false)

  // 收藏的动漫和角色
  const collectedAnime = reactive([])
  const collectedCharacters = reactive([])

  // 统计数据
  const statistics = reactive({
    totalPosts: 0,
    todayScenes: 0,
    todayPosts: 0,
    progress: 75
  })

  // 活动日志
  const activities = ref([])

  // 图片加载错误处理
  const handleImageError = (event) => {
    event.target.src = 'http://localhost:3000/uploads/1769761265557-43060049.png'
  }

  // 编辑个人信息
  const editPersonalSignature = () => {
    showUserSettings.value = true
  }

  // 将后端返回的分类名称转换成展示用数据
  const buildGenreStats = (genreNames) => {
    if (!Array.isArray(genreNames) || genreNames.length === 0) return []
    const count = genreNames.length
    return genreNames.map((name, index) => {
      const progress = Math.round(((count - index) / count) * 100)
      return {
        name,
        entries: '',
        progress
      }
    })
  }

  // 获取用户喜欢的分类和兴趣标签
  const fetchUserGenresAndTags = async () => {
    try {
      const res = await getUserInterests()
      if (res.success) {
        const userGenres = res.data?.genres || []
        genres.value = buildGenreStats(userGenres)
        userTags.value = res.data?.interests || []
      }
    } catch (error) {
      console.error('获取用户喜欢的分类失败:', error)
    }
  }

  // 加载所有可选分类
  const loadAllGenres = async () => {
    loadingGenres.value = true
    try {
      const res = await getAllGenres()
      if (res.success) {
        genreOptions.value = Array.isArray(res.data)
          ? res.data
          : (res.data?.genres || [])
      }
    } catch (error) {
      console.error('获取分类列表失败:', error)
    } finally {
      loadingGenres.value = false
    }
  }

  // 打开编辑喜欢的分类对话框
  const openEditGenres = async () => {
    editGenresVisible.value = true
    // 初始化已选分类
    selectedGenres.value = (genres.value || []).map(g => g.name)
    if (genreOptions.value.length === 0) {
      await loadAllGenres()
    }
  }

  // 保存喜欢的分类
  const handleSaveGenres = async () => {
    try {
      savingGenres.value = true
      await updateUserGenres({
        genres: selectedGenres.value
      })
      ElMessage.success('已更新喜欢的分类')
      genres.value = buildGenreStats(selectedGenres.value)
      editGenresVisible.value = false
    } catch (error) {
      console.error('更新喜欢的分类失败:', error)
      ElMessage.error(error.response?.data?.message || '更新失败，请稍后重试')
    } finally {
      savingGenres.value = false
    }
  }

  // 加载所有可选标签
  const loadAllTags = async () => {
    loadingTags.value = true
    try {
      const res = await getTagsList({ page: 1, pageSize: 100 })
      if (res.success) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.list || [])
        tagOptions.value = list
      }
    } catch (error) {
      console.error('获取标签列表失败:', error)
    } finally {
      loadingTags.value = false
    }
  }

  // 打开编辑兴趣标签对话框
  const openEditTags = async () => {
    editTagsVisible.value = true
    selectedTagIds.value = (userTags.value || []).map(t => getTagId(t))
    if (tagOptions.value.length === 0) {
      await loadAllTags()
    }
  }

  // 保存兴趣标签
  const handleSaveTags = async () => {
    const currentIds = (userTags.value || []).map(t => getTagId(t))
    const toAdd = selectedTagIds.value.filter(id => !currentIds.includes(id))
    const toRemove = currentIds.filter(id => !selectedTagIds.value.includes(id))

    if (!toAdd.length && !toRemove.length) {
      editTagsVisible.value = false
      return
    }

    try {
      savingTags.value = true
      // 批量添加新标签
      if (toAdd.length) {
        await batchAddInterests({ tag_ids: toAdd })
      }
      // 逐个删除取消的标签
      for (const id of toRemove) {
        await removeUserInterest(id)
      }
      ElMessage.success('已更新兴趣标签')
      await fetchUserGenresAndTags()
      editTagsVisible.value = false
    } catch (error) {
      console.error('更新兴趣标签失败:', error)
      ElMessage.error(error.response?.data?.message || '更新失败，请稍后重试')
    } finally {
      savingTags.value = false
    }
  }

  // 辅助：兼容不同字段命名
  const getTagId = (tag) => tag?.id ?? tag?.tag_id
  const getTagName = (tag) => tag?.name ?? tag?.tag_name ?? ''

  // 切换动漫展开状态
  const toggleAnimeExpanded = () => {
    animeExpanded.value = !animeExpanded.value
  }

  // 切换角色展开状态
  const toggleCharactersExpanded = () => {
    charactersExpanded.value = !charactersExpanded.value
  }

  // 处理每页大小变化
  const handleSizeChange = (newSize) => {
    pageSize.value = newSize
    currentPage.value = 1 // 重置到第一页
    fetchUserActivities()
  }

  // 处理当前页变化
  const handleCurrentChange = (newPage) => {
    currentPage.value = newPage
    fetchUserActivities()
  }

  // 获取用户收藏的动漫
  const fetchUserFavoriteAnime = async () => {
    try {
      const response = await getFavorite({
        target_type: 'media',
        page: 1,
        page_size: 6
      })
      if (response.code === 200) {
        collectedAnime.splice(0, collectedAnime.length, ...response.data.items)
      }
    } catch (error) {
      console.error('获取收藏动漫失败:', error)
    }
  }

  // 获取用户收藏的角色
  const fetchUserFavoriteCharacters = async () => {
    try {
      const response = await getFavorite({
        target_type: 'character',
        page: 1,
        page_size: 6
      })
      if (response.code === 200) {
        collectedCharacters.splice(0, collectedCharacters.length, ...response.data.items)
      }
    } catch (error) {
      console.error('获取收藏角色失败:', error)
    }
  }

  // 获取用户活动历史
  const fetchUserActivities = async () => {
    try {
      const response = await getUserActivities({
        page: currentPage.value,
        pageSize: pageSize.value,
        activity_type: activityFilter.value
      })
      if (response.code === 200) {
        activities.value = response.data.activities.map(activity => ({
          description: activity.description,
          timeAgo: formatTimeAgo(activity.activity_time),
          thumbnail: activity.image_url || '',
          animeTitle: activity.title || 'Unknown'
        }))
        totalActivities.value = response.data.pagination.totalItems || 0
      }
    } catch (error) {
      console.error('获取用户活动历史失败:', error)
    }
  }

  // 获取用户统计数据
  const fetchUserStatistics = async () => {
    try {
      const response = await getUserStatistics()
      if (response.code === 200) {
        statistics.totalPosts = response.data.totalPosts
        statistics.todayScenes = response.data.todayScenes
        statistics.todayPosts = response.data.todayPosts
      }
    } catch (error) {
      console.error('获取用户统计数据失败:', error)
    }
  }

  // 格式化时间显示
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return '刚刚'
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}天前`
    }
  }

  onMounted(() => {
    activityDays.value = generateActivityDays()
    fetchUserGenresAndTags()
    fetchUserFavoriteAnime()
    fetchUserFavoriteCharacters()
    fetchUserActivities()
    fetchUserStatistics()
  })

  // 监听活动过滤器变化
  watch(activityFilter, () => {
    currentPage.value = 1 // 切换过滤器时重置到第一页
    fetchUserActivities()
  })
</script>

<style scoped>
.overview-section {
  width: 100%;
  padding: 20px;
  background: var(--card-bg, #1a1a1b);
  min-height: 100vh;
}

.overview-content {
  max-width: 1400px;
  margin: 0 auto;
}

/* 个人简介独立盒子 */
.personal-signature-panel {
  margin-bottom: 20px;
  position: relative;
}

.personal-signature {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.overview-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* 通用面板样式 */
.panel {
  background: var(--card-bg, #1a1a1b);
  border: 1px solid var(--border-color, #343536);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 16px 0;
}

/* 左列样式 */
.left-column {
  display: flex;
  flex-direction: column;
}

/* Activity History 面板 */
.activity-history-panel {
  position: relative;
}

.activity-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 12px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(30, 1fr);
  gap: 3px;
  max-width: 100%;
}

.activity-day {
  aspect-ratio: 1;
  background: #2a2a2e;
  border-radius: 2px;
  min-width: 8px;
  min-height: 8px;
}

.activity-day.activity-level-1 {
  background: #ff9800;
  opacity: 0.6;
}

.activity-day.activity-level-2 {
  background: #ff5722;
  opacity: 0.8;
}

.activity-day.activity-level-3 {
  background: #f44336;
  opacity: 1;
}

/* Genre Overview 面板 */
.panel-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.genre-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}

.genre-tags {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.genre-tag {
  padding: 12px;
  border-radius: 6px;
  color: #ffffff;
}

.genre-tag.genre-fantasy {
  background: rgba(76, 175, 80, 0.2);
  border-left: 4px solid #4caf50;
}

.genre-tag.genre-action {
  background: rgba(33, 150, 243, 0.2);
  border-left: 4px solid #2196f3;
}

.genre-tag.genre-comedy {
  background: rgba(156, 39, 176, 0.2);
  border-left: 4px solid #9c27b0;
}

.genre-tag.genre-adventure {
  background: rgba(233, 30, 99, 0.2);
  border-left: 4px solid #e91e63;
}

.genre-tag.genre-drama {
  background: rgba(255, 152, 0, 0.2);
  border-left: 4px solid #ff9800;
}

.genre-tag.genre-romance {
  background: rgba(255, 64, 129, 0.2);
  border-left: 4px solid #ff4081;
}

.genre-tag.genre-sci-fi {
  background: rgba(0, 188, 212, 0.2);
  border-left: 4px solid #00bcd4;
}

.genre-tag.genre-supernatural {
  background: rgba(103, 58, 183, 0.2);
  border-left: 4px solid #673ab7;
}

.genre-tag.genre-ecchi {
  background: rgba(244, 67, 54, 0.2);
  border-left: 4px solid #f44336;
}

/* "Slice of Life" -> class "genre-slice" when using name.toLowerCase() */
.genre-tag.genre-slice {
  background: rgba(0, 150, 136, 0.2);
  border-left: 4px solid #009688;
}

.genre-tag.genre-psychological {
  background: rgba(63, 81, 181, 0.2);
  border-left: 4px solid #3f51b5;
}

.genre-tag.genre-thriller {
  background: rgba(255, 87, 34, 0.2);
  border-left: 4px solid #ff5722;
}

.genre-tag.genre-mystery {
  background: rgba(96, 125, 139, 0.2);
  border-left: 4px solid #607d8b;
}

.genre-tag.genre-sports {
  background: rgba(205, 220, 57, 0.2);
  border-left: 4px solid #cddc39;
}

.genre-tag.genre-horror {
  background: rgba(183, 28, 28, 0.2);
  border-left: 4px solid #b71c1c;
}

/* "Mahou Shoujo" -> class "genre-mahou" when using name.toLowerCase() */
.genre-tag.genre-mahou {
  background: rgba(255, 111, 0, 0.2);
  border-left: 4px solid #ff6f00;
}

.genre-tag.genre-music {
  background: rgba(139, 195, 74, 0.2);
  border-left: 4px solid #8bc34a;
}

.genre-tag.genre-mecha {
  background: rgba(121, 85, 72, 0.2);
  border-left: 4px solid #795548;
}

.genre-tag.genre-hentai {
  background: rgba(136, 14, 79, 0.2);
  border-left: 4px solid #880e4f;
}

.genre-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.genre-entries {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.genre-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.genre-progress-fill {
  height: 100%;
  background: currentColor;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.genre-fantasy .genre-progress-fill {
  background: #4caf50;
}

.genre-action .genre-progress-fill {
  background: #2196f3;
}

.genre-comedy .genre-progress-fill {
  background: #9c27b0;
}

.genre-adventure .genre-progress-fill {
  background: #e91e63;
}

.genre-drama .genre-progress-fill {
  background: #ff9800;
}

.genre-romance .genre-progress-fill {
  background: #ff4081;
}

.genre-sci-fi .genre-progress-fill {
  background: #00bcd4;
}

.genre-supernatural .genre-progress-fill {
  background: #673ab7;
}

.genre-ecchi .genre-progress-fill {
  background: #f44336;
}

.genre-slice .genre-progress-fill {
  background: #009688;
}

.genre-psychological .genre-progress-fill {
  background: #3f51b5;
}

.genre-thriller .genre-progress-fill {
  background: #ff5722;
}

.genre-mystery .genre-progress-fill {
  background: #607d8b;
}

.genre-sports .genre-progress-fill {
  background: #cddc39;
}

.genre-horror .genre-progress-fill {
  background: #b71c1c;
}

.genre-mahou .genre-progress-fill {
  background: #ff6f00;
}

.genre-music .genre-progress-fill {
  background: #8bc34a;
}

.genre-mecha .genre-progress-fill {
  background: #795548;
}

.genre-hentai .genre-progress-fill {
  background: #880e4f;
}

.edit-genres-content {
  padding-top: 4px;
}

.edit-genres-tip {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  margin-bottom: 16px;
}

/* Anime 面板 */
.anime-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}

/* Characters 面板 */
.characters-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}

.anime-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.anime-cover {
  aspect-ratio: 3/4;
  border-radius: 6px;
  overflow: hidden;
  background: #2a2a2e;
  position: relative;
}

.anime-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.anime-title,
.character-title {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-collections {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  padding: 20px;
}

/* 展开按钮样式 */
.expand-button-container {
  text-align: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #343536);
}

.expand-button {
  color: #ffffff;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.expand-button:hover {
  color: #409eff;
}

.rotate-icon {
  transform: rotate(180deg);
  transition: transform 0.3s ease;
}

/* 右列样式 */
.right-column {
  display: flex;
  flex-direction: column;
}

/* Statistics 面板 */
.statistics-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
}

.statistics-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-metric {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 4px;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-section {
  margin-top: 20px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: #2a2a2e;
  border-radius: 5px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: #f44336;
  border-radius: 5px;
  transition: width 0.3s ease;
}

.progress-markers {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

/* Activity 面板 */
.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.activity-filter {
  width: 120px;
}

.activity-footprint-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 16px;
}

.activity-log {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #343536);
}

.activity-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.activity-thumbnail {
  width: 60px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background: #2a2a2e;
}

.activity-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.activity-description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin-bottom: 8px;
}

.activity-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.activity-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.activity-icons {
  display: flex;
  gap: 8px;
}

.heart-icon {
  font-size: 16px;
  cursor: pointer;
}

.heart-icon.heart-red {
  color: #f44336;
}

.heart-icon.heart-grey {
  color: rgba(255, 255, 255, 0.3);
}

/* Activity 分页器样式 */
.activity-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.activity-pagination .el-pagination {
  --el-pagination-bg-color: var(--card-bg, #1a1a1b);
  --el-pagination-text-color: rgba(255, 255, 255, 0.7);
  --el-pagination-border-color: var(--border-color, #343536);
  --el-pagination-button-color: rgba(255, 255, 255, 0.7);
  --el-pagination-button-bg-color: var(--card-bg, #1a1a1b);
  --el-pagination-button-hover-color: #409eff;
  --el-pagination-button-disabled-color: rgba(255, 255, 255, 0.3);
  --el-pagination-button-disabled-bg-color: rgba(255, 255, 255, 0.1);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .overview-layout {
    grid-template-columns: 1fr;
  }

  .activity-grid {
    grid-template-columns: repeat(20, 1fr);
  }
}

@media (max-width: 768px) {
  .overview-section {
    padding: 12px;
  }

  .panel {
    padding: 16px;
  }

  .statistics-metrics {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .anime-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .activity-grid {
    grid-template-columns: repeat(15, 1fr);
  }
}
</style>
