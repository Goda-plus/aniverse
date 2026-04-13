<template>
  <div class="product-reviews">
    <!-- 评价编辑区域 -->
    <div class="review-editor-card">
      <div v-if="userStore.isLoggedIn" class="editor-inner">
        <div class="editor-header">
          <div class="editor-user">
            <el-avatar :src="userStore.avatar" :size="40">
              {{ userStore.username?.[0]?.toUpperCase() || 'U' }}
            </el-avatar>
            <div class="editor-user-meta">
              <div class="nickname">
                {{ userStore.username || '当前用户' }}
              </div>
              <div class="hint-text">
                为本商品打个分吧（1-5星）
              </div>
            </div>
          </div>
          <div class="editor-rating">
            <span class="rating-label">评分：</span>
            <el-rate
              v-model="newRating"
              :max="5"
              allow-half="{false}"
            />
            <span v-if="newRating" class="rating-score">
              {{ newRating.toFixed(1) }} 分
            </span>
          </div>
        </div>

        <el-input
          v-model="newContent"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="说说你对这个商品的真实感受吧~"
        />

        <div class="editor-images">
          <div class="editor-images-header">
            <span>评价图片（可选，最多 6 张）</span>
            <span class="images-count">{{ newImages.length }}/6</span>
          </div>
          <div class="editor-images-body">
            <el-upload
              class="review-uploader"
              action="#"
              list-type="picture-card"
              :show-file-list="false"
              :before-upload="beforeImageUpload"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <div v-if="newImages.length" class="editor-preview-list">
              <div
                v-for="(img, index) in newImages"
                :key="index"
                class="editor-preview-item"
              >
                <el-image :src="img" fit="cover" class="editor-preview-image" />
                <div class="remove-image" @click.stop="removeImage(index)">
                  <el-icon><Close /></el-icon>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="editor-actions">
          <span class="editor-tip">
            商品评价将会展示给所有用户，请理性、客观地发表看法。
          </span>
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            发表评价
          </el-button>
        </div>
      </div>

      <div v-else class="editor-login-tip">
        <span>登录后才能发表商品评价。</span>
        <el-button type="primary" link @click="$router.push('/login')">
          去登录
        </el-button>
      </div>
    </div>

    <!-- 评价列表 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="3" animated />
    </div>

    <div v-else-if="reviews.length === 0" class="empty-container">
      <el-empty description="暂无评价" />
    </div>

    <div v-else class="reviews-list">
      <div
        v-for="review in reviews"
        :key="review.id"
        class="review-item"
      >
        <div class="review-header">
          <div class="user-info">
            <el-avatar :src="review.avatar" :size="40">
              {{ review.username?.[0]?.toUpperCase() || 'U' }}
            </el-avatar>
            <div class="user-details">
              <div class="username">
                {{ review.username || '匿名用户' }}
              </div>
              <div class="review-time">
                {{ formatDate(review.created_at) }}
              </div>
            </div>
          </div>
          <el-rate
            v-model="review.rating"
            disabled
            :max="5"
            size="small"
          />
        </div>
        <div v-if="review.content" class="review-content">
          {{ review.content }}
        </div>
        <div v-if="review.images && review.images.length > 0" class="review-images">
          <el-image
            v-for="(img, index) in review.images"
            :key="index"
            :src="img"
            fit="cover"
            class="review-image"
            :preview-src-list="review.images"
            :initial-index="index"
          />
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, watch, computed, defineProps } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Plus, Close } from '@element-plus/icons-vue'
  import { listProductReviews, addProductReview } from '@/axios/mall'
  import { uploadPostImage } from '@/axios/post'
  import { useUserStore } from '@/stores/user'

  const props = defineProps({
    productId: {
      type: [String, Number],
      required: true
    }
  })

  const router = useRouter()
  const userStore = useUserStore()

  const reviews = ref([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

  // 新评价相关
  const newRating = ref(0)
  const newContent = ref('')
  const newImages = ref([])
  const submitting = ref(false)

  const canSubmit = computed(() => {
    return newRating.value > 0 && newContent.value.trim().length > 0 && !submitting.value
  })

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return `${minutes}分钟前`
      }
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const fetchReviews = async () => {
    loading.value = true
    try {
      const response = await listProductReviews({
        product_id: props.productId,
        page: currentPage.value,
        pageSize: pageSize.value
      })
      if (response.code === 200) {
        reviews.value = (response.data.list || []).map(review => ({
          ...review,
          images: review.images ? (typeof review.images === 'string' ? JSON.parse(review.images) : review.images) : []
        }))
        total.value = response.data.total || 0
      } else {
        ElMessage.error(response.message || '获取评价失败')
      }
    } catch (error) {
      console.error('获取评价失败:', error)
      ElMessage.error(error.response?.data?.message || '获取评价失败')
    } finally {
      loading.value = false
    }
  }

  const handleSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = 1
    fetchReviews()
  }

  const handlePageChange = (page) => {
    currentPage.value = page
    fetchReviews()
  }

  const beforeImageUpload = async (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5

    if (!isImage) {
      ElMessage.error('只能上传图片文件')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('上传图片大小不能超过 5MB')
      return false
    }
    if (newImages.value.length >= 6) {
      ElMessage.error('最多只能上传 6 张图片')
      return false
    }

    try {
      const res = await uploadPostImage(file)
      if (res.success) {
        newImages.value.push(res.data.url)
        ElMessage.success('图片上传成功')
      } else {
        ElMessage.error(res.message || '上传失败')
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      ElMessage.error('图片上传失败')
    }

    // 阻止 el-upload 默认上传
    return false
  }

  const removeImage = (index) => {
    newImages.value.splice(index, 1)
  }

  const resetEditor = () => {
    newRating.value = 0
    newContent.value = ''
    newImages.value = []
  }

  const handleSubmit = async () => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录后再评价')
      router.push('/login')
      return
    }

    if (!canSubmit.value) return

    submitting.value = true
    try {
      const response = await addProductReview({
        product_id: props.productId,
        rating: newRating.value,
        content: newContent.value.trim(),
        images: newImages.value
      })

      if (response.code === 200 || response.success) {
        ElMessage.success(response.message || '评价成功')
        resetEditor()
        currentPage.value = 1
        fetchReviews()
      } else {
        ElMessage.error(response.message || '评价失败')
      }
    } catch (error) {
      console.error('评价失败:', error)
      ElMessage.error(error.response?.data?.message || '评价失败')
    } finally {
      submitting.value = false
    }
  }

  watch(() => props.productId, () => {
    currentPage.value = 1
    fetchReviews()
  })

  onMounted(() => {
    fetchReviews()
  })
</script>

<style scoped>
.product-reviews {
  padding: 20px 0;
}

.review-editor-card {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.editor-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.editor-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.editor-user-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nickname {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.hint-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.editor-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.rating-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.rating-score {
  font-size: 12px;
  color: var(--el-color-primary);
}

.editor-images {
  margin-top: 4px;
}

.editor-images-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.images-count {
  font-size: 12px;
}

.editor-images-body {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.editor-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.editor-preview-item {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
}

.editor-preview-image {
  width: 100%;
  height: 100%;
}

.remove-image {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
}

.editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
}

.editor-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.editor-login-tip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.loading-container {
  padding: 20px 0;
}

.empty-container {
  padding: 40px 0;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-item {
  padding: 20px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.username {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.review-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.review-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.review-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.review-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .editor-rating {
    margin-top: 8px;
  }
}
</style>

