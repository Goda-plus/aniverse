<template>
  <div class="product-reviews">
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
            allow-half
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
  import { ref, onMounted, watch ,defineProps} from 'vue'
  import { listProductReviews } from '@/axios/mall'

  const props = defineProps({
    productId: {
      type: [String, Number],
      required: true
    }
  })

  const reviews = ref([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)

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
      }
    } catch (error) {
      console.error('获取评价失败:', error)
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
</style>


