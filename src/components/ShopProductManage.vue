<template>
  <div class="shop-product-manage">
    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="left-actions">
        <el-button type="primary" icon="Plus" @click="showAddProductDialog">
          添加商品
        </el-button>
        <el-button type="danger" :disabled="selectedProducts.length === 0" @click="batchDeleteProducts">
          批量删除
        </el-button>
      </div>

      <div class="right-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索商品名称"
          clearable
          style="width: 200px"
          @keyup.enter="loadProducts"
          @clear="loadProducts"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="filterStatus" placeholder="状态筛选" clearable @change="loadProducts">
          <el-option label="全部" value="" />
          <el-option label="上架中" value="active" />
          <el-option label="已下架" value="inactive" />
        </el-select>
      </div>
    </div>

    <!-- 商品表格 -->
    <div class="product-table">
      <el-table
        v-loading="loading"
        :data="products"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />

        <el-table-column label="商品信息" min-width="300">
          <template #default="scope">
            <div class="product-info">
              <div class="product-image">
                <img :src="getProductImage(scope.row.images)" :alt="scope.row.name">
              </div>
              <div class="product-details">
                <div class="product-name">
                  {{ scope.row.name }}
                </div>
                <div v-if="scope.row.category_name" class="product-category">
                  分类：{{ scope.row.category_name }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="价格" width="120">
          <template #default="scope">
            <div class="price-info">
              <div class="current-price">
                ¥{{ scope.row.price }}
              </div>
              <div v-if="scope.row.original_price" class="original-price">
                ¥{{ scope.row.original_price }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="库存" width="100">
          <template #default="scope">
            <span :class="{ 'low-stock': scope.row.stock < 10 }">
              {{ scope.row.stock }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="销量" width="100">
          <template #default="scope">
            {{ scope.row.sales_count || 0 }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="推荐" width="80">
          <template #default="scope">
            <el-tag v-if="scope.row.is_featured" type="success">
              推荐
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="150">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <div class="action-buttons">
              <el-button size="small" @click="editProduct(scope.row)">
                编辑
              </el-button>
              <el-button
                size="small"
                :type="scope.row.status === 'active' ? 'warning' : 'success'"
                @click="toggleProductStatus(scope.row)"
              >
                {{ scope.row.status === 'active' ? '下架' : '上架' }}
              </el-button>
              <el-button size="small" type="danger" @click="DeleteProduct(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 添加/编辑商品对话框 -->
    <el-dialog
      v-model="showProductDialog"
      :title="dialogMode === 'add' ? '添加商品' : '编辑商品'"
      width="800px"
      append-to-body
      :close-on-click-modal="false"
      top="5vh"
    >
      <ProductForm
        v-if="showProductDialog"
        :product="editingProduct"
        :shop-id="shopId"
        :mode="dialogMode"
        @success="handleProductSuccess"
        @cancel="showProductDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted, defineProps, defineEmits } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, Search } from '@element-plus/icons-vue'
  import { getShopProducts, deleteProduct, updateProduct } from '@/axios/shop'
  import ProductForm from './ProductForm.vue'

  const props = defineProps({
    shopId: {
      type: [String, Number],
      required: true
    }
  })

  const emit = defineEmits(['success', 'cancel'])

  const products = ref([])
  const selectedProducts = ref([])
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const searchKeyword = ref('')
  const filterStatus = ref('')
  const showProductDialog = ref(false)
  const editingProduct = ref(null)
  const dialogMode = ref('add')

  // 加载商品列表
  const loadProducts = async () => {
    try {
      loading.value = true
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value,
        status: filterStatus.value
      }

      const res = await getShopProducts(props.shopId, params)
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

  // 工具方法
  const getProductImage = (images) => {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return '/default-product.jpg'
    }
    return images[0]
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN')
  }

  const getStatusType = (status) => {
    const typeMap = {
      active: 'success',
      inactive: 'warning',
      deleted: 'danger'
    }
    return typeMap[status] || 'info'
  }

  const getStatusText = (status) => {
    const textMap = {
      active: '上架中',
      inactive: '已下架',
      deleted: '已删除'
    }
    return textMap[status] || status
  }

  // 事件处理
  const handleSelectionChange = (selection) => {
    selectedProducts.value = selection
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

  const showAddProductDialog = () => {
    editingProduct.value = null
    dialogMode.value = 'add'
    showProductDialog.value = true
  }

  const editProduct = (product) => {
    editingProduct.value = { ...product }
    dialogMode.value = 'edit'
    showProductDialog.value = true
  }

  const toggleProductStatus = async (product) => {
    try {
      const newStatus = product.status === 'active' ? 'inactive' : 'active'
      const actionText = newStatus === 'active' ? '上架' : '下架'

      const res = await updateProduct(product.product_id, { status: newStatus })

      if (res.success) {
        ElMessage.success(`${actionText}成功`)
        loadProducts()
      } else {
        ElMessage.error(res.message || `${actionText}失败`)
      }
    } catch (error) {
      ElMessage.error('操作失败，请重试')
      console.error(error)
    }
  }

  const DeleteProduct = async (product) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除商品"${product.name}"吗？此操作不可恢复。`,
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      const res = await deleteProduct(product.product_id)

      if (res.success) {
        ElMessage.success('删除成功')
        loadProducts()
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
        console.error(error)
      }
    }
  }

  const batchDeleteProducts = async () => {
    if (selectedProducts.value.length === 0) return

    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedProducts.value.length} 个商品吗？此操作不可恢复。`,
        '批量删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      let successCount = 0
      let failCount = 0

      for (const product of selectedProducts.value) {
        try {
          const res = await deleteProduct(product.product_id)
          if (res.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        }
      }

      if (successCount > 0) {
        ElMessage.success(`成功删除 ${successCount} 个商品`)
        if (failCount > 0) {
          ElMessage.warning(`有 ${failCount} 个商品删除失败`)
        }
        loadProducts()
      } else {
        ElMessage.error('删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('批量删除失败')
        console.error(error)
      }
    }
  }

  const handleProductSuccess = () => {
    showProductDialog.value = false
    loadProducts()
    emit('success')
  }

  // 初始化
  onMounted(() => {
    loadProducts()
  })
</script>

<style lang="scss" scoped>
.shop-product-manage {
  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;

    .left-actions {
      display: flex;
      gap: 12px;
    }

    .right-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  }

  .product-table {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    overflow: hidden;

    :deep(.el-table) {
      .product-info {
        display: flex;
        align-items: center;
        gap: 12px;

        .product-image {
          width: 60px;
          height: 60px;
          border-radius: 4px;
          overflow: hidden;
          flex-shrink: 0;

          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .product-details {
          flex: 1;

          .product-name {
            font-weight: 500;
            margin-bottom: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .product-category {
            font-size: 12px;
            color: var(--text-secondary);
          }
        }
      }

      .price-info {
        .current-price {
          font-weight: bold;
          color: #e74c3c;
        }

        .original-price {
          font-size: 12px;
          color: var(--text-secondary);
          text-decoration: line-through;
        }
      }

      .low-stock {
        color: #e74c3c;
        font-weight: bold;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
      }
    }
  }

  .pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
}
</style>
