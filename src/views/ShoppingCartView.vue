<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="shopping-cart-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">
            购物车
          </h1>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 购物车内容 -->
        <div v-else-if="cartItems.length > 0" class="cart-content">
          <!-- 全选和操作栏 -->
          <div class="cart-toolbar">
            <el-checkbox
              v-model="selectAll"
              @change="handleSelectAll"
            >
              全选
            </el-checkbox>
            <el-button
              link
              type="danger"
              :disabled="selectedItems.length === 0"
              @click="handleBatchRemove"
            >
              删除选中 ({{ selectedItems.length }})
            </el-button>
          </div>

          <!-- 购物车商品列表 -->
          <div class="cart-items">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="cart-item"
            >
              <el-checkbox
                v-model="item.selected"
                @change="handleItemSelect(item)"
              />
              <el-image
                :src="item.cover_image || '/placeholder.png'"
                :alt="item.name"
                class="item-image"
                fit="cover"
              />
              <div class="item-info">
                <h3 class="item-name" @click="goToProduct(item.product_id)">
                  {{ item.name }}
                </h3>
                <div class="item-price">
                  ￥{{ item.price }}
                </div>
                <div class="item-stock">
                  库存: {{ item.stock }}
                </div>
              </div>
              <div class="item-actions">
                <el-input-number
                  v-model="item.quantity"
                  :min="1"
                  :max="item.stock"
                  :disabled="item.stock === 0"
                  size="small"
                  @change="handleQuantityChange(item)"
                />
                <el-button
                  link
                  type="danger"
                  @click="handleRemove(item)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>

          <!-- 结算栏 -->
          <div class="cart-footer">
            <div class="footer-info">
              <div class="selected-count">
                已选 {{ selectedItems.length }} 件商品
              </div>
              <div class="total-price">
                <span class="label">合计：</span>
                <span class="price">￥{{ totalPrice.toFixed(2) }}</span>
              </div>
            </div>
            <el-button
              type="primary"
              size="large"
              :disabled="selectedItems.length === 0"
              @click="handleCheckout"
            >
              去结算 ({{ selectedItems.length }})
            </el-button>
          </div>
        </div>

        <!-- 空购物车 -->
        <div v-else class="empty-container">
          <el-empty description="购物车是空的">
            <el-button type="primary" @click="$router.push('/mall')">
              去购物
            </el-button>
          </el-empty>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { getCart, updateCartItem, removeCartItem } from '@/axios/mall'

  const router = useRouter()

  const cartItems = ref([])
  const loading = ref(false)

  const selectAll = computed({
    get: () => cartItems.value.length > 0 && cartItems.value.every(item => item.selected),
    set: (value) => {
      cartItems.value.forEach(item => {
        item.selected = value
        updateCartItemSelection(item)
      })
    }
  })

  const selectedItems = computed(() => {
    return cartItems.value.filter(item => item.selected)
  })

  const totalPrice = computed(() => {
    return selectedItems.value.reduce((sum, item) => {
      return sum + item.price * item.quantity
    }, 0)
  })

  // 获取购物车
  const fetchCart = async () => {
    loading.value = true
    try {
      const response = await getCart()
      if (response.code === 200) {
        cartItems.value = (response.data || []).map(item => ({
          ...item,
          selected: item.selected === 1 || item.selected === true
        }))
      } else {
        ElMessage.error(response.message || '获取购物车失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取购物车失败')
    } finally {
      loading.value = false
    }
  }

  // 更新商品数量
  const handleQuantityChange = async (item) => {
    try {
      await updateCartItem({
        product_id: item.product_id,
        quantity: item.quantity
      })
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '更新失败')
      // 恢复原值
      fetchCart()
    }
  }

  // 更新选中状态
  const handleItemSelect = async (item) => {
    await updateCartItemSelection(item)
  }

  const updateCartItemSelection = async (item) => {
    try {
      await updateCartItem({
        product_id: item.product_id,
        selected: item.selected ? 1 : 0
      })
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '更新失败')
      fetchCart()
    }
  }

  // 全选/取消全选
  const handleSelectAll = () => {
  // selectAll computed setter 已处理
  }

  // 删除商品
  const handleRemove = async (item) => {
    try {
      await ElMessageBox.confirm('确定要删除这个商品吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await removeCartItem({ product_id: item.product_id })
      ElMessage.success('已删除')
      fetchCart()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '删除失败')
      }
    }
  }

  // 批量删除
  const handleBatchRemove = async () => {
    try {
      await ElMessageBox.confirm(`确定要删除选中的 ${selectedItems.value.length} 个商品吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      const promises = selectedItems.value.map(item =>
        removeCartItem({ product_id: item.product_id })
      )
      await Promise.all(promises)
      ElMessage.success('已删除')
      fetchCart()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '删除失败')
      }
    }
  }

  // 去结算
  const handleCheckout = () => {
    if (selectedItems.value.length === 0) {
      ElMessage.warning('请选择要结算的商品')
      return
    }
    router.push('/mall/checkout')
  }

  // 跳转到商品详情
  const goToProduct = (productId) => {
    router.push(`/mall/product/${productId}`)
  }

  onMounted(() => {
    fetchCart()
  })
</script>

<style scoped>
.shopping-cart-page {
  padding: 20px 24px;
  min-height: 100vh;
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--el-text-color-primary);
}

.loading-container {
  padding: 40px 0;
}

.cart-content {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.cart-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 20px;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.cart-item {
  display: grid;
  grid-template-columns: auto 120px 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  transition: background-color 0.3s;
}

.cart-item:hover {
  background: var(--el-fill-color);
}

.item-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  cursor: pointer;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  cursor: pointer;
  color: var(--el-text-color-primary);
  transition: color 0.3s;
}

.item-name:hover {
  color: var(--el-color-primary);
}

.item-price {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.item-stock {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.item-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.footer-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-count {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.total-price {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.total-price .label {
  font-size: 16px;
  color: var(--el-text-color-regular);
}

.total-price .price {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.empty-container {
  padding: 60px 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .cart-item {
    grid-template-columns: auto 80px 1fr;
    grid-template-rows: auto auto;
  }

  .item-actions {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .item-image {
    width: 80px;
    height: 80px;
  }

  .cart-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
</style>


