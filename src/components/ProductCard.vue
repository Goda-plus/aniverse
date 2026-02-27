<template>
  <el-card shadow="hover" class="product-card" @click="goToDetail">
    <div class="product-image-wrapper">
      <el-image
        :src="coverImage"
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
          <span :class="stockClass">库存: {{ stock }}</span>
        </div>
      </div>
      <el-button
        type="primary"
        size="small"
        :disabled="action !== 'edit' && stock === 0"
        @click.stop="handlePrimaryAction"
      >
        {{ action === 'edit' ? '编辑商品' : (stock === 0 ? '缺货' : '加入购物车') }}
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
  import { computed, defineProps, defineEmits } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Picture } from '@element-plus/icons-vue'
  import { addToCart } from '@/axios/mall'

  const props = defineProps({
    product: {
      type: Object,
      required: true
    },
    action: {
      type: String,
      default: 'cart',
      validator: (v) => ['cart', 'edit', 'none'].includes(v)
    }
  })

  const emit = defineEmits(['edit'])
  const router = useRouter()

  const rating = computed(() => {
    const v = props.product.avg_rating ?? props.product.rating ?? props.product.avg_product_rating ?? 0
    const n = typeof v === 'string' ? parseFloat(v) : Number(v)
    return Number.isFinite(n) ? n : 0
  })

  const productId = computed(() => {
    return props.product?.id ?? props.product?.product_id
  })

  const stock = computed(() => {
    const v = props.product?.stock
    const n = typeof v === 'string' ? parseInt(v, 10) : Number(v)
    return Number.isFinite(n) ? n : 0
  })

  const stockClass = computed(() => {
    if (stock.value === 0) return 'stock-out'
    if (stock.value < 10) return 'stock-low'
    return 'stock-normal'
  })

  const coverImage = computed(() => {
    try {
      JSON.parse(props.product?.cover_image)
      return JSON.parse(props.product?.cover_image)[0]
    } catch (e) {
      return props.product?.cover_image || '/placeholder.png'
    }
  })

  const goToDetail = () => {
    if (!productId.value) return
    router.push(`/mall/product/${productId.value}`)
  }

  const handlePrimaryAction = async () => {
    if (props.action === 'none') return
    if (props.action === 'edit') {
      emit('edit', props.product)
      return
    }
    if (!productId.value) {
      ElMessage.error('商品ID缺失，无法加入购物车')
      return
    }
    try {
      await addToCart({
        product_id: productId.value,
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


