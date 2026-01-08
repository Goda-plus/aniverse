<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="product-detail-page">
        <!-- 返回按钮 -->
        <el-button
          link
          type="primary"
          class="back-button"
          @click="$router.back()"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 商品详情 -->
        <div v-else-if="product" class="product-detail">
          <div class="product-main">
            <!-- 商品图片 -->
            <div class="product-images">
              <div class="main-image">
                <el-image
                  :src="currentImage || product.cover_image || '/placeholder.png'"
                  :alt="product.name"
                  fit="contain"
                  :preview-src-list="imageList"
                  :initial-index="currentImageIndex"
                >
                  <template #error>
                    <div class="image-slot">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
              </div>
              <div v-if="images.length > 1" class="thumbnail-list">
                <div
                  v-for="(img, index) in images"
                  :key="img.id"
                  class="thumbnail"
                  :class="{ active: currentImageIndex === index }"
                  @click="currentImageIndex = index"
                >
                  <el-image
                    :src="img.image_url"
                    :alt="`商品图片 ${index + 1}`"
                    fit="cover"
                  />
                </div>
              </div>
            </div>

            <!-- 商品信息 -->
            <div class="product-info">
              <h1 class="product-name">
                {{ product.name }}
              </h1>
              <p v-if="product.description" class="product-description">
                {{ product.description }}
              </p>

              <!-- 价格和评分 -->
              <div class="price-section">
                <div class="price">
                  <span class="current-price">￥{{ product.price }}</span>
                  <span v-if="product.original_price && product.original_price > product.price" class="original-price">
                    ￥{{ product.original_price }}
                  </span>
                  <span v-if="product.original_price && product.original_price > product.price" class="discount">
                    省￥{{ (product.original_price - product.price).toFixed(2) }}
                  </span>
                </div>
                <div class="rating-section">
                  <el-rate
                    v-model="rating"
                    allow-half
                    disabled
                    :max="5"
                  />
                  <span class="rating-text">
                    {{ rating.toFixed(1) }} ({{ product.review_count || 0 }}条评价)
                  </span>
                </div>
              </div>

              <!-- 库存信息 -->
              <div class="stock-section">
                <span class="stock-label">库存：</span>
                <span :class="stockClass">
                  {{ product.stock > 0 ? `${product.stock} 件` : '缺货' }}
                </span>
              </div>

              <!-- 购买操作 -->
              <div class="action-section">
                <div class="quantity-selector">
                  <span class="quantity-label">数量：</span>
                  <el-input-number
                    v-model="quantity"
                    :min="1"
                    :max="product.stock"
                    :disabled="product.stock === 0"
                  />
                </div>
                <div class="action-buttons">
                  <el-button
                    type="primary"
                    size="large"
                    :disabled="product.stock === 0"
                    @click="handleAddToCart"
                  >
                    <el-icon><ShoppingCart /></el-icon>
                    加入购物车
                  </el-button>
                  <el-button
                    type="success"
                    size="large"
                    style="color: #ffffff;"
                    :disabled="product.stock === 0"
                    @click="handleBuyNow"
                  >
                    立即购买
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 商品详情标签页 -->
          <el-tabs v-model="activeTab" class="product-tabs">
            <el-tab-pane label="商品详情" name="detail">
              <div class="detail-content">
                <p v-if="product.description" class="detail-text">
                  {{ product.description }}
                </p>
                <div v-if="images.length > 0" class="detail-images">
                  <el-image
                    v-for="img in images"
                    :key="img.id"
                    :src="img.image_url"
                    fit="contain"
                    class="detail-image"
                  />
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="商品评价" name="reviews">
              <ProductReviews :product-id="productId" />
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 错误状态 -->
        <div v-else class="error-container">
          <el-result
            icon="error"
            title="商品不存在"
            sub-title="该商品可能已下架或不存在"
          >
            <template #extra>
              <el-button type="primary" @click="$router.push('/mall')">
                返回商城
              </el-button>
            </template>
          </el-result>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ArrowLeft, Picture, ShoppingCart } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import ProductReviews from '@/components/ProductReviews.vue'
  import { getProductDetail, addToCart } from '@/axios/mall'

  const route = useRoute()
  const router = useRouter()

  const productId = computed(() => route.params.id)
  const product = ref(null)
  const images = ref([])
  const loading = ref(false)
  const quantity = ref(1)
  const activeTab = ref('detail')
  const currentImageIndex = ref(0)

  const currentImage = computed(() => {
    if (images.value.length > 0 && currentImageIndex.value < images.value.length) {
      return images.value[currentImageIndex.value].image_url
    }
    return product.value?.cover_image
  })

  const imageList = computed(() => {
    if (images.value.length > 0) {
      return images.value.map(img => img.image_url)
    }
    return product.value?.cover_image ? [product.value.cover_image] : []
  })

  const rating = computed(() => {
    return product.value?.avg_rating ? parseFloat(product.value.avg_rating) : 0
  })

  const stockClass = computed(() => {
    if (!product.value || product.value.stock === 0) return 'stock-out'
    if (product.value.stock < 10) return 'stock-low'
    return 'stock-normal'
  })

  // 获取商品详情
  const fetchProductDetail = async () => {
    loading.value = true
    try {
      const response = await getProductDetail(productId.value)
      if (response.code === 200) {
        product.value = response.data.product
        images.value = response.data.images || []
        if (product.value.cover_image && !images.value.find(img => img.image_url === product.value.cover_image)) {
          images.value.unshift({
            id: 0,
            image_url: product.value.cover_image,
            sort_order: 0
          })
        }
      } else {
        ElMessage.error(response.message || '获取商品详情失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取商品详情失败')
    } finally {
      loading.value = false
    }
  }

  // 加入购物车
  const handleAddToCart = async () => {
    try {
      await addToCart({
        product_id: productId.value,
        quantity: quantity.value
      })
      ElMessage.success('已加入购物车')
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '加入购物车失败')
    }
  }

  // 立即购买
  const handleBuyNow = async () => {
    if (product.value.stock === 0) {
      ElMessage.warning('商品已缺货')
      return
    }
    if (quantity.value > product.value.stock) {
      ElMessage.warning('库存不足')
      return
    }
    // 直接跳转到支付页面
    router.push({
      path: `/mall/payment/${productId.value}`,
      query: {
        quantity: quantity.value
      }
    })
  }

  onMounted(() => {
    fetchProductDetail()
  })
</script>

<style scoped>
.product-detail-page {
  padding: 20px 24px;
  min-height: 100vh;
  transition: background-color 0.3s ease;
}

.back-button {
  margin-bottom: 20px;
}

.loading-container {
  padding: 40px 0;
}

.product-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.product-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
  padding: 24px;
  background: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-image {
  width: 100%;
  height: 500px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--el-fill-color-light);
}

.main-image :deep(.el-image) {
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
  font-size: 48px;
}

.thumbnail-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
}

.thumbnail {
  width: 80px;
  height: 80px;
  border: 2px solid transparent;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.3s;
}

.thumbnail:hover,
.thumbnail.active {
  border-color: var(--el-color-primary);
}

.thumbnail :deep(.el-image) {
  width: 100%;
  height: 100%;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.product-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.product-description {
  font-size: 16px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  margin: 0;
}

.price-section {
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.current-price {
  font-size: 32px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.original-price {
  font-size: 18px;
  color: var(--el-text-color-placeholder);
  text-decoration: line-through;
}

.discount {
  font-size: 14px;
  color: var(--el-color-success);
  background: var(--el-color-success-light-9);
  padding: 2px 8px;
  border-radius: 4px;
}

.rating-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rating-text {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.stock-section {
  font-size: 16px;
}

.stock-label {
  color: var(--el-text-color-regular);
}

.stock-normal {
  color: var(--el-color-success);
  font-weight: 600;
}

.stock-low {
  color: var(--el-color-warning);
  font-weight: 600;
}

.stock-out {
  color: var(--el-color-danger);
  font-weight: 600;
}

.action-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.quantity-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quantity-label {
  font-size: 16px;
  color: var(--el-text-color-regular);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-buttons .el-button {
  flex: 1;
}

.product-tabs {
  margin-top: 40px;
}

.detail-content {
  padding: 24px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.detail-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  margin-bottom: 24px;
}

.detail-images {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-image {
  width: 100%;
  max-width: 800px;
  border-radius: 8px;
}

.error-container {
  padding: 60px 20px;
}

@media (max-width: 768px) {
  .product-main {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 16px;
  }

  .main-image {
    height: 300px;
  }

  .product-name {
    font-size: 24px;
  }

  .current-price {
    font-size: 24px;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>


