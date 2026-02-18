<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div v-loading="loading" class="shop-detail-page">
        <!-- 店铺头部 -->
        <div v-if="shop" class="shop-header">
          <!-- 店铺横幅 -->
          <div class="shop-banner" :style="{ backgroundImage: `url(${shop.banner_image || '/default-banner.jpg'})` }">
            <div class="shop-banner-overlay">
              <div class="shop-basic-info">
                <div class="shop-logo">
                  <img :src="shop.logo || '/default-shop-logo.png'" :alt="shop.shop_name">
                </div>
                <div class="shop-info">
                  <h1 class="shop-name">
                    {{ shop.shop_name }}
                  </h1>
                  <div class="shop-stats">
                    <span class="rating">
                      <el-rate
                        v-model="shop.rating"
                        disabled
                        show-score
                        :score-template="`${shop.rating}分`"
                        size="small"
                      />
                    </span>
                    <span class="sales">销量 {{ shop.total_sales || 0 }}</span>
                    <span class="level" :class="`level-${shop?.level || 'default'}`">{{ getLevelText(shop?.level) }}</span>
                  </div>
                  <p v-if="shop.description" class="shop-description">
                    {{ shop.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 店铺导航 -->
          <div class="shop-nav">
            <div class="nav-container">
              <el-tabs v-model="activeTab" @tab-click="handleTabClick">
                <el-tab-pane label="首页" name="home" />
                <el-tab-pane label="全部商品" name="products" />
                <el-tab-pane label="店铺动态" name="news" />
                <el-tab-pane label="联系客服" name="contact" />
              </el-tabs>

              <!-- 店铺操作按钮 -->
              <div v-if="!isOwner" class="shop-actions">
                <el-button type="primary" icon="Star">
                  收藏店铺
                </el-button>
                <el-button icon="ChatDotRound">
                  联系卖家
                </el-button>
              </div>

              <!-- 卖家操作按钮 -->
              <div v-if="isOwner" class="shop-actions">
                <el-button type="primary" @click="showShopSettings">
                  店铺设置
                </el-button>
                <el-button @click="showProductManage">
                  商品管理
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 店铺内容区域 -->
        <div v-if="shop" class="shop-content">
          <!-- 首页标签页 -->
          <div v-if="activeTab === 'home'" class="tab-content">
            <!-- 橱窗推荐 -->
            <div v-if="featuredProducts.length > 0" class="featured-section">
              <div class="section-header">
                <h2 class="section-title">
                  橱窗推荐
                </h2>
                <p class="section-desc">
                  店主精选商品
                </p>
              </div>
              <div class="featured-products">
                <div
                  v-for="product in featuredProducts"
                  :key="product.product_id"
                  class="featured-product-card"
                  @click="goToProduct(product.product_id)"
                >
                  <div class="product-image">
                    <img :src="getProductImage(product.images)" :alt="product.name">
                  </div>
                  <div class="product-info">
                    <h3 class="product-name">
                      {{ product.name }}
                    </h3>
                    <div class="product-price">
                      <span class="price">¥{{ product.price }}</span>
                      <span class="sales">销量 {{ product.sales_count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 店铺信息 -->
            <div class="shop-info-section">
              <div class="section-header">
                <h2 class="section-title">
                  店铺信息
                </h2>
              </div>
              <div class="shop-info-content">
                <div class="info-item">
                  <span class="label">店铺等级：</span>
                  <span class="value">{{ getLevelText(shop?.level) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">开店时间：</span>
                  <span class="value">{{ formatDate(shop?.created_at) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">商品数量：</span>
                  <span class="value">{{ shop?.product_count || 0 }} 件</span>
                </div>
                <div class="info-item">
                  <span class="label">累计销量：</span>
                  <span class="value">{{ shop?.total_sales || 0 }} 件</span>
                </div>
                <div v-if="shop?.announcement" class="info-item">
                  <span class="label">店铺公告：</span>
                  <span class="value">{{ shop.announcement }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 商品列表标签页 -->
          <div v-if="activeTab === 'products'" class="tab-content">
            <!-- 商品筛选 -->
            <div class="product-filters">
              <div class="filter-group">
                <span class="filter-label">分类：</span>
                <el-select v-model="productFilters.category_id" placeholder="选择分类" clearable @change="loadProducts">
                  <el-option
                    v-for="category in productCategories"
                    :key="category.category_id"
                    :label="category.category_name"
                    :value="category.category_id"
                  />
                </el-select>
              </div>
              <div class="filter-group">
                <span class="filter-label">排序：</span>
                <el-select v-model="productFilters.sort" @change="loadProducts">
                  <el-option label="综合排序" value="default" />
                  <el-option label="销量优先" value="sales" />
                  <el-option label="价格从低到高" value="price_asc" />
                  <el-option label="价格从高到低" value="price_desc" />
                  <el-option label="最新上架" value="newest" />
                </el-select>
              </div>
            </div>

            <!-- 商品网格 -->
            <div class="products-section">
              <div v-if="products.length === 0 && !loading" class="empty-state">
                <el-empty description="暂无商品" />
              </div>
              <div v-else class="products-grid">
                <ProductCard
                  v-for="product in products"
                  :key="product.product_id"
                  :product="product"
                  @click="goToProduct(product.product_id)"
                />
              </div>

              <!-- 分页 -->
              <div v-if="total > pageSize" class="pagination-container">
                <el-pagination
                  v-model:current-page="currentPage"
                  v-model:page-size="pageSize"
                  :page-sizes="[12, 24, 36]"
                  :total="total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </div>
          </div>

          <!-- 其他标签页占位 -->
          <div v-if="activeTab === 'news'" class="tab-content">
            <el-empty description="暂无店铺动态" />
          </div>

          <div v-if="activeTab === 'contact'" class="tab-content">
            <div class="contact-section">
              <h3>联系我们</h3>
              <p>如有问题请通过以下方式联系：</p>
              <div v-if="shop?.contact_info" class="contact-info">
                <div v-for="(value, key) in shop.contact_info" :key="key" class="contact-item">
                  <span class="contact-label">{{ getContactLabel(key) }}：</span>
                  <span class="contact-value">{{ value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 店铺设置对话框 -->
        <el-dialog
          v-model="showSettingsDialog"
          title="店铺设置"
          width="600px"
          :close-on-click-modal="false"
        >
          <ShopSettingsForm
            v-if="showSettingsDialog"
            :shop="shop"
            @success="handleSettingsSuccess"
            @cancel="showSettingsDialog = false"
          />
        </el-dialog>

        <!-- 商品管理对话框 -->
        <el-dialog
          v-model="showProductDialog"
          title="商品管理"
          width="80%"
          :close-on-click-modal="false"
          top="5vh"
        >
          <ShopProductManage
            v-if="showProductDialog"
            :shop-id="shopId"
            @success="handleProductSuccess"
            @cancel="showProductDialog = false"
          />
        </el-dialog>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, computed, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Search, Star, ChatDotRound } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import ProductCard from '@/components/ProductCard.vue'
  import ShopSettingsForm from '@/components/ShopSettingsForm.vue'
  import ShopProductManage from '@/components/ShopProductManage.vue'
  import { getShopDetail, getShopProducts, getShopFeaturedProducts } from '@/axios/shop'
  import { useUserStore } from '@/stores/user'

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  const shopId = ref(route.params.id)
  const shop = ref(null)
  const featuredProducts = ref([])
  const products = ref([])
  const productCategories = ref([])
  const loading = ref(false)
  const activeTab = ref('home')
  const currentPage = ref(1)
  const pageSize = ref(12)
  const total = ref(0)
  const showSettingsDialog = ref(false)
  const showProductDialog = ref(false)

  const productFilters = ref({
    category_id: null,
    sort: 'default'
  })

  // 计算属性
  const isOwner = computed(() => {
    return userStore.userInfo?.id && shop.value?.seller_id === userStore.userInfo.id
  })

  // 方法
  const loadShopDetail = async () => {
    try {
      loading.value = true
      const res = await getShopDetail(shopId.value)
      if (res.success) {
        shop.value = res.data.shop
        featuredProducts.value = res.data.featuredProducts || []
      } else {
        ElMessage.error(res.message || '获取店铺信息失败')
      }
    } catch (error) {
      ElMessage.error('获取店铺信息失败')
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  const loadProducts = async () => {
    try {
      loading.value = true
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value,
        ...productFilters.value
      }

      const res = await getShopProducts(shopId.value, params)
      if (res.success) {
        products.value = res.data.list || []
        total.value = res.data.total || 0
      } else {
        ElMessage.error(res.message || '获取商品列表失败')
      }
    } catch (error) {
      ElMessage.error('获取商品列表失败')
      console.error(error)
    } finally {
      loading.value = false
    }
  }

  const getLevelText = (level) => {
    if (!level) return '普通店铺'
    const levelMap = {
      bronze: '青铜店铺',
      silver: '白银店铺',
      gold: '黄金店铺',
      diamond: '钻石店铺'
    }
    return levelMap[level] || '普通店铺'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN')
  }

  const getProductImage = (images) => {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return '/default-product.jpg'
    }
    return images[0]
  }

  const goToProduct = (productId) => {
    router.push(`/product/${productId}`)
  }

  const handleTabClick = (tab) => {
    if (tab.props.name === 'products') {
      loadProducts()
    }
  }

  const showShopSettings = () => {
    showSettingsDialog.value = true
  }

  const showProductManage = () => {
    showProductDialog.value = true
  }

  const handleSettingsSuccess = () => {
    showSettingsDialog.value = false
    loadShopDetail() // 重新加载店铺信息
  }

  const handleProductSuccess = () => {
    showProductDialog.value = false
    if (activeTab.value === 'products') {
      loadProducts() // 重新加载商品列表
    }
  }

  const handleSizeChange = (newSize) => {
    pageSize.value = newSize
    currentPage.value = 1
    loadProducts()
  }

  const handleCurrentChange = (newPage) => {
    currentPage.value = newPage
    loadProducts()
  }

  const getContactLabel = (key) => {
    const labelMap = {
      phone: '联系电话',
      email: '邮箱',
      wechat: '微信',
      qq: 'QQ'
    }
    return labelMap[key] || key
  }

  // 监听路由变化
  watch(() => route.params.id, (newId) => {
    if (newId && newId !== shopId.value) {
      shopId.value = newId
      loadShopDetail()
      if (activeTab.value === 'products') {
        loadProducts()
      }
    }
  })

  // 初始化
  onMounted(() => {
    loadShopDetail()
  })
</script>

<style lang="scss" scoped>
.shop-detail-page {
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.shop-header {
  margin-bottom: 24px;
}

.shop-banner {
  height: 200px;
  background-size: cover;
  background-position: center;
  background-color: #f5f5f5;
  position: relative;

  .shop-banner-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    padding: 20px;
  }

  .shop-basic-info {
    display: flex;
    align-items: center;
    gap: 16px;
    color: white;

    .shop-logo {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      border: 3px solid rgba(255, 255, 255, 0.3);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .shop-info {
      flex: 1;

      .shop-name {
        font-size: 24px;
        font-weight: bold;
        margin: 0 0 8px 0;
      }

      .shop-stats {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;

        .rating {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sales, .level {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
        }

        .level {
          padding: 2px 8px;
          border-radius: 12px;
          background-color: rgba(255, 255, 255, 0.2);
        }

        .level-bronze { background-color: #cd7f32; }
        .level-silver { background-color: #c0c0c0; }
        .level-gold { background-color: #ffd700; color: #333; }
        .level-diamond { background-color: #b9f2ff; color: #333; }
      }

      .shop-description {
        font-size: 14px;
        opacity: 0.9;
        margin: 0;
      }
    }
  }
}

.shop-nav {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);

  .nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .shop-actions {
      display: flex;
      gap: 12px;
    }
  }
}

.shop-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px;
}

.tab-content {
  .featured-section {
    margin-bottom: 32px;

    .section-header {
      margin-bottom: 16px;

      .section-title {
        font-size: 20px;
        font-weight: bold;
        margin: 0 0 4px 0;
      }

      .section-desc {
        color: var(--text-secondary);
        margin: 0;
      }
    }

    .featured-products {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;

      .featured-product-card {
        background: var(--card-bg);
        border: 1px solid var(--card-border);
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .product-image {
          height: 150px;
          overflow: hidden;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .product-info {
          padding: 12px;

          .product-name {
            font-size: 14px;
            font-weight: 500;
            margin: 0 0 8px 0;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .product-price {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .price {
              font-size: 16px;
              font-weight: bold;
              color: #e74c3c;
            }

            .sales {
              font-size: 12px;
              color: var(--text-secondary);
            }
          }
        }
      }
    }
  }

  .shop-info-section {
    .section-header {
      margin-bottom: 16px;

      .section-title {
        font-size: 20px;
        font-weight: bold;
        margin: 0;
      }
    }

    .shop-info-content {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 20px;

      .info-item {
        display: flex;
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }

        .label {
          width: 100px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .value {
          color: var(--text-primary);
        }
      }
    }
  }

  .product-filters {
    display: flex;
    gap: 24px;
    margin-bottom: 24px;
    flex-wrap: wrap;

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;

      .filter-label {
        font-weight: 500;
        color: var(--text-primary);
      }
    }
  }

  .products-section {
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .pagination-container {
      display: flex;
      justify-content: center;
    }
  }

  .contact-section {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    padding: 24px;

    h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
    }

    p {
      margin: 0 0 16px 0;
      color: var(--text-secondary);
    }

    .contact-info {
      .contact-item {
        display: flex;
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }

        .contact-label {
          width: 100px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .contact-value {
          color: var(--text-primary);
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .shop-banner {
    height: 150px;

    .shop-basic-info {
      flex-direction: column;
      text-align: center;

      .shop-logo {
        width: 60px;
        height: 60px;
      }

      .shop-info .shop-name {
        font-size: 20px;
      }
    }
  }

  .shop-nav .nav-container {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;

    .shop-actions {
      width: 100%;
      justify-content: center;
    }
  }

  .shop-content {
    padding: 16px;
  }

  .product-filters {
    flex-direction: column;
    gap: 12px;

    .filter-group {
      width: 100%;
    }
  }

  .featured-products {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
}
</style>
