<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="payment-page">
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

        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">
            立即购买
          </h1>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 支付内容 -->
        <div v-else-if="product" class="payment-content">
          <el-row :gutter="24">
            <!-- 左侧：商品和地址 -->
            <el-col :lg="16" :md="24">
              <!-- 商品信息 -->
              <div class="payment-section">
                <h3 class="section-title">
                  商品信息
                </h3>
                <div class="product-card">
                  <el-image
                    :src="product.cover_image || '/placeholder.png'"
                    :alt="product.name"
                    class="product-image"
                    fit="cover"
                  />
                  <div class="product-info">
                    <div class="product-name">
                      {{ product.name }}
                    </div>
                    <div v-if="product.description" class="product-description">
                      {{ product.description }}
                    </div>
                    <div class="product-price">
                      ￥{{ product.price }}
                    </div>
                  </div>
                  <div class="product-quantity">
                    <span class="quantity-label">数量：</span>
                    <el-input-number
                      v-model="quantity"
                      :min="1"
                      :max="product.stock"
                      :disabled="product.stock === 0"
                      @change="handleQuantityChange"
                    />
                  </div>
                </div>
              </div>

              <!-- 收货地址 -->
              <div class="payment-section">
                <h3 class="section-title">
                  收货地址
                </h3>
                <div v-if="selectedAddress" class="address-card">
                  <div class="address-info">
                    <div class="address-line">
                      <span class="recipient-name">{{ selectedAddress.recipient_name }}</span>
                      <span class="recipient-phone">{{ selectedAddress.phone }}</span>
                      <el-tag v-if="selectedAddress.is_default" type="success" size="small">
                        默认
                      </el-tag>
                    </div>
                    <div class="address-detail">
                      {{ selectedAddress.province }} {{ selectedAddress.city }} {{ selectedAddress.district }} {{ selectedAddress.detail_address }}
                    </div>
                  </div>
                  <el-button link type="primary" @click="showAddressDialog = true">
                    选择其他地址
                  </el-button>
                </div>
                <div v-else class="no-address">
                  <el-empty description="请选择收货地址">
                    <el-button type="primary" @click="showAddressDialog = true">
                      选择地址
                    </el-button>
                  </el-empty>
                </div>
              </div>
            </el-col>

            <!-- 右侧：订单汇总 -->
            <el-col :lg="8" :md="24">
              <div class="payment-summary">
                <h3 class="section-title">
                  订单汇总
                </h3>
                <div class="summary-content">
                  <div class="summary-row">
                    <span class="label">商品单价：</span>
                    <span class="value">￥{{ product.price }}</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">购买数量：</span>
                    <span class="value">{{ quantity }} 件</span>
                  </div>
                  <div class="summary-row">
                    <span class="label">商品总价：</span>
                    <span class="value">￥{{ totalPrice.toFixed(2) }}</span>
                  </div>
                  <el-divider />
                  <div class="summary-row total">
                    <span class="label">应付总额：</span>
                    <span class="value">￥{{ totalPrice.toFixed(2) }}</span>
                  </div>
                </div>
                <el-button
                  type="primary"
                  size="large"
                  :disabled="!selectedAddress || product.stock === 0 || quantity > product.stock"
                  class="pay-button"
                  :loading="submitting"
                  @click="handlePay"
                >
                  立即支付
                </el-button>
              </div>
            </el-col>
          </el-row>
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

        <!-- 地址选择对话框 -->
        <el-dialog
          v-model="showAddressDialog"
          title="选择收货地址"
          width="800px"
        >
          <AddressManage ref="addressManageRef" />
          <template #footer>
            <el-button @click="showAddressDialog = false">
              取消
            </el-button>
            <el-button type="primary" @click="handleSelectAddress">
              确定
            </el-button>
          </template>
        </el-dialog>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ArrowLeft } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import AddressManage from '@/components/AddressManage.vue'
  import { getProductDetail, listAddresses, createOrder } from '@/axios/mall'

  const route = useRoute()
  const router = useRouter()

  const product = ref(null)
  const quantity = ref(1)
  const addresses = ref([])
  const selectedAddress = ref(null)
  const loading = ref(false)
  const submitting = ref(false)
  const showAddressDialog = ref(false)
  const addressManageRef = ref(null)

  const totalPrice = computed(() => {
    if (!product.value) return 0
    return product.value.price * quantity.value
  })

  // 获取商品详情
  const fetchProductDetail = async () => {
    loading.value = true
    try {
      const productId = route.params.id || route.query.product_id
      const qty = route.query.quantity
      
      if (qty) {
        quantity.value = parseInt(qty) || 1
      }

      if (!productId) {
        ElMessage.error('缺少商品ID')
        router.push('/mall')
        return
      }

      const response = await getProductDetail(productId)
      if (response.code === 200) {
        product.value = response.data.product
        // 检查库存
        if (product.value.stock === 0) {
          ElMessage.warning('该商品已缺货')
        } else if (quantity.value > product.value.stock) {
          quantity.value = product.value.stock
          ElMessage.warning(`库存不足，已自动调整为 ${product.value.stock} 件`)
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

  // 获取地址列表
  const fetchAddresses = async () => {
    try {
      const response = await listAddresses()
      if (response.code === 200) {
        addresses.value = response.data || []
        // 自动选择默认地址
        const defaultAddress = addresses.value.find(addr => 
          addr.is_default === 1 || addr.is_default === true
        )
        if (defaultAddress) {
          selectedAddress.value = defaultAddress
        } else if (addresses.value.length > 0) {
          selectedAddress.value = addresses.value[0]
        }
      }
    } catch (error) {
      console.error('获取地址列表失败:', error)
    }
  }

  // 选择地址
  const handleSelectAddress = async () => {
    if (addressManageRef.value) {
      await addressManageRef.value.fetchAddresses()
    }
    await fetchAddresses()
    showAddressDialog.value = false
  }

  // 数量变化
  const handleQuantityChange = () => {
    if (product.value && quantity.value > product.value.stock) {
      quantity.value = product.value.stock
      ElMessage.warning(`库存不足，最多只能购买 ${product.value.stock} 件`)
    }
  }

  // 立即支付
  const handlePay = async () => {
    if (!selectedAddress.value) {
      ElMessage.warning('请选择收货地址')
      return
    }

    if (!product.value) {
      ElMessage.error('商品信息错误')
      return
    }

    if (quantity.value > product.value.stock) {
      ElMessage.warning('库存不足')
      return
    }

    try {
      await ElMessageBox.confirm(`确认支付 ￥${totalPrice.value.toFixed(2)} 吗？`, '确认支付', {
        confirmButtonText: '确认支付',
        cancelButtonText: '取消',
        type: 'warning'
      })

      submitting.value = true

      const cart_items = [{
        product_id: product.value.id,
        quantity: quantity.value,
        price: product.value.price,
        name: product.value.name,
        stock: product.value.stock
      }]

      const response = await createOrder({
        address_id: selectedAddress.value.id,
        payment_method: '模拟支付',
        cart_items
      })

      if (response.code === 200) {
        ElMessage.success('订单创建成功')
        router.push(`/mall/order/${response.data.order_id}`)
      } else {
        ElMessage.error(response.message || '创建订单失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '创建订单失败')
      }
    } finally {
      submitting.value = false
    }
  }

  onMounted(async () => {
    await fetchProductDetail()
    await fetchAddresses()
  })
</script>

<style scoped>
.payment-page {
  padding: 20px 24px;
  min-height: 100vh;
  transition: background-color 0.3s ease;
  max-width: 1200px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.loading-container {
  padding: 40px 0;
}

.payment-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.payment-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.product-card {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 20px;
  align-items: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.product-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.product-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.product-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-danger);
}

.product-quantity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.quantity-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.address-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  color: var(--text-primary);
  border-radius: 8px;
  border: 1px solid var(--card-border);
}

.address-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recipient-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.recipient-phone {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.address-detail {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.no-address {
  padding: 40px 0;
}

.payment-summary {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 20px;
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.summary-row .label {
  color: var(--el-text-color-regular);
}

.summary-row .value {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.summary-row.total {
  font-size: 18px;
  margin-top: 8px;
}

.summary-row.total .value {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.pay-button {
  width: 100%;
  margin-top: 20px;
}

.error-container {
  padding: 60px 20px;
}

@media (max-width: 768px) {
  .payment-summary {
    position: static;
  }

  .product-card {
    grid-template-columns: 100px 1fr;
    grid-template-rows: auto auto;
  }

  .product-quantity {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .product-image {
    width: 100px;
    height: 100px;
  }
}
</style>

