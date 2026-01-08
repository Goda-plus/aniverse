<template>
  <el-card shadow="hover" class="product-card" @click="goToDetail">
    <div class="product-image-wrapper">
      <el-image
        :src="product.cover_image || '/placeholder.png'"
        :alt="product.name"
        class="product-image"
        fit="cover"
        :lazy="true"
      >
        <template #error>
          <div class="image-slot">
            <el-icon><Picture /></el-icon>
          </div>
        </template>
      </el-image>
      <div v-if="product.original_price && product.original_price > product.price" class="discount-badge">
        {{ Math.round((1 - product.price / product.original_price) * 100) }}% OFF
      </div>
    </div>
    <div class="product-info">
      <h3 class="product-name" :title="product.name">
        {{ product.name }}
      </h3>
      <p v-if="product.description" class="product-description" :title="product.description">
        {{ product.description.length > 50 ? product.description.substring(0, 50) + '...' : product.description }}
      </p>
      <div class="product-price">
        <span class="current-price">￥{{ product.price }}</span>
        <span v-if="product.original_price && product.original_price > product.price" class="original-price">
          ￥{{ product.original_price }}
        </span>
      </div>
      <div class="product-meta">
        <div class="rating-info">
          <el-rate
            v-model="rating"
            allow-half
            disabled
            :max="5"
            size="small"
          />
          <span v-if="product.review_count" class="review-count">
            ({{ product.review_count }})
          </span>
        </div>
        <div class="stock-info">
          <span :class="stockClass">库存: {{ product.stock }}</span>
        </div>
      </div>
      <el-button
        type="primary"
        size="small"
        :disabled="product.stock === 0"
        @click.stop="handleAddToCart"
      >
        {{ product.stock === 0 ? '缺货' : '加入购物车' }}
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
  import { computed,defineExpose ,defineProps} from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Picture } from '@element-plus/icons-vue'
  import { addToCart } from '@/axios/mall'

  const props = defineProps({
    product: {
      type: Object,
      required: true
    }
  })

  const router = useRouter()

  const rating = computed(() => {
    return props.product.avg_rating ? parseFloat(props.product.avg_rating) : 0
  })

  const stockClass = computed(() => {
    if (props.product.stock === 0) return 'stock-out'
    if (props.product.stock < 10) return 'stock-low'
    return 'stock-normal'
  })

  const goToDetail = () => {
    router.push(`/mall/product/${props.product.id}`)
  }

  const handleAddToCart = async () => {
    try {
      await addToCart({
        product_id: props.product.id,
        quantity: 1
      })
      ElMessage.success('已加入购物车')
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '加入购物车失败')
    }
  }
</script>

<style scoped>
.product-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.product-image-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 4px;
  margin-bottom: 12px;
}

.product-image {
  width: 100%;
  height: 100%;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-placeholder);
  font-size: 30px;
}

.discount-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--el-color-danger);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.product-description {
  font-size: 13px;
  color: var(--el-text-color-regular);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
}

.product-price {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.original-price {
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  text-decoration: line-through;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.review-count {
  color: var(--el-text-color-secondary);
}

.stock-info {
  font-size: 12px;
}

.stock-normal {
  color: var(--el-color-success);
}

.stock-low {
  color: var(--el-color-warning);
}

.stock-out {
  color: var(--el-color-danger);
}
</style>


