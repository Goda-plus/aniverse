<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="mall-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <div class="header-content">
            <div class="header-text">
              <h1 class="page-title">
                周边商城
              </h1>
              <p class="page-description">
                发现你喜欢的动漫周边商品
              </p>
            </div>
            <el-button
              type="primary"
              size="large"
              @click="showRegistrationDialog = true"
            >
              <el-icon><DocumentAdd /></el-icon>
              入驻商城
            </el-button>
          </div>
        </div>

        <!-- 搜索和筛选栏 -->
        <div class="filter-section setting-control">
          <div class="search-bar">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索商品..."
              clearable
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #append>
                <el-button @click="handleSearch">
                  搜索
                </el-button>
              </template>
            </el-input>
          </div>

          <!-- 分类筛选 -->
          <div v-if="categories.length > 0" class="categories-section">
            <div class="categories-label">
              分类：
            </div>
            <div class="categories-list">
              <el-button
                :type="selectedCategoryId === null ? 'primary' : 'default'"
                :plain="selectedCategoryId !== null"
                size="small"
                @click="selectCategory(null)"
              >
                全部
              </el-button>
              <el-button
                v-for="category in categories"
                :key="category.id"
                :type="selectedCategoryId === category.id ? 'primary' : 'default'"
                :plain="selectedCategoryId !== category.id"
                size="small"
                @click="selectCategory(category.id)"
              >
                {{ category.name }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="4" animated />
        </div>

        <!-- 商品列表 -->
        <div v-else-if="products.length > 0" class="products-grid">
          <ProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
          />
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-container">
          <el-empty description="暂无商品">
            <el-button type="primary" @click="resetFilters">
              重置筛选
            </el-button>
          </el-empty>
        </div>

        <!-- 分页 -->
        <div v-if="total > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[12, 24, 48, 96]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 入驻商城对话框 -->
      <ShopRegistration
        v-model="showRegistrationDialog"
        @success="handleRegistrationSuccess"
      />
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { Search, DocumentAdd } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import ProductCard from '@/components/ProductCard.vue'
  import ShopRegistration from '@/components/ShopRegistration.vue'
  import { listProducts, listCategories } from '@/axios/mall'

  const route = useRoute()
  const router = useRouter()

  // 数据
  const products = ref([])
  const categories = ref([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(12)
  const searchKeyword = ref('')
  const selectedCategoryId = ref(null)
  const showRegistrationDialog = ref(false)

  // 获取分类列表
  const fetchCategories = async () => {
    try {
      const response = await listCategories({ pageSize: 100 })
      if (response.code === 200) {
        categories.value = response.data.list || []
      }
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  // 获取商品列表
  const fetchProducts = async () => {
    loading.value = true
    try {
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value
      }
    
      if (selectedCategoryId.value) {
        params.category_id = selectedCategoryId.value
      }
    
      if (searchKeyword.value) {
        params.keyword = searchKeyword.value
      }

      const response = await listProducts(params)
      if (response.code === 200) {
        products.value = response.data.list || []
        total.value = response.data.total || 0
      } else {
        ElMessage.error(response.message || '获取商品列表失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取商品列表失败')
    } finally {
      loading.value = false
    }
  }

  // 选择分类
  const selectCategory = (categoryId) => {
    selectedCategoryId.value = categoryId
    currentPage.value = 1
    fetchProducts()
  }

  // 搜索
  const handleSearch = () => {
    currentPage.value = 1
    fetchProducts()
  }

  // 重置筛选
  const resetFilters = () => {
    searchKeyword.value = ''
    selectedCategoryId.value = null
    currentPage.value = 1
    fetchProducts()
  }

  // 分页处理
  const handleSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = 1
    fetchProducts()
  }

  const handlePageChange = (page) => {
    currentPage.value = page
    fetchProducts()
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 入驻成功回调
  const handleRegistrationSuccess = (data) => {
    ElMessage.success('恭喜您成功入驻商城！')
    // 可以在这里刷新页面数据或执行其他操作
  }

  // 初始化
  onMounted(() => {
    fetchCategories()
    fetchProducts()
  })
</script>

<style scoped>
.mall-page {
  padding: 20px 24px;
  min-height: 100vh;
  transition: background-color 0.3s ease;
}

.mall-page .el-button--primary {
  background: var(--btn-orange);
  border-color: var(--btn-orange);
}

.mall-page .el-button.el-button--default {
  background: var(--bg-tertiary);
  border-color: var(--card-border);
}

::v-deep(.mall-page .el-input-group__append)
{
  background: var(--bg-tertiary);
  border-color: var(--card-border);
}

::v-deep(.mall-page .el-pagination .btn-prev)
{
  background: var(--bg-tertiary);
  border-color: var(--card-border);
}

::v-deep(.mall-page .el-pagination .btn-next)
{
  background: var(--bg-tertiary);
  border-color: var(--card-border);
}

::v-deep(.mall-page .el-pagination .el-pager li){
  background: none;
  border-color: var(--card-border);
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.header-text {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.page-description {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin: 0;
}

.filter-section {
  margin-bottom: 24px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border-color: var(--card-border);
}

.search-bar {
  margin-bottom: 16px;
}

.categories-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.categories-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-primary);
  white-space: nowrap;
}

.categories-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.loading-container {
  padding: 20px 0;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.empty-container {
  padding: 60px 20px;
  text-align: center;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

@media (max-width: 768px) {
  .mall-page {
    padding: 12px 16px;
  }

  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }

  .page-title {
    font-size: 24px;
  }
}
</style>
