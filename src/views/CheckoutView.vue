<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="checkout-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">
            结算
          </h1>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 结算内容 -->
        <div v-else class="checkout-content">
          <el-row :gutter="24">
            <!-- 左侧：商品和地址 -->
            <el-col :lg="16" :md="24">
              <!-- 收货地址 -->
              <div class="checkout-section">
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

              <!-- 商品清单 -->
              <div class="checkout-section">
                <h3 class="section-title">
                  商品清单
                </h3>
                <div class="items-list">
                  <div
                    v-for="item in cartItems"
                    :key="item.id"
                    class="item-row"
                  >
                    <el-image
                      :src="item.cover_image || '/placeholder.png'"
                      :alt="item.name"
                      class="item-image"
                      fit="cover"
                    />
                    <div class="item-info">
                      <div class="item-name">
                        {{ item.name }}
                      </div>
                      <div class="item-price">
                        ￥{{ item.price }}
                      </div>
                    </div>
                    <div class="item-quantity">
                      x{{ item.quantity }}
                    </div>
                    <div class="item-total">
                      ￥{{ (item.price * item.quantity).toFixed(2) }}
                    </div>
                  </div>
                </div>
              </div>
            </el-col>

            <!-- 右侧：订单汇总 -->
            <el-col :lg="8" :md="24">
              <div class="checkout-summary">
                <h3 class="section-title">
                  订单汇总
                </h3>
                <div class="summary-content">
                  <div class="summary-row">
                    <span class="label">商品件数：</span>
                    <span class="value">{{ totalQuantity }} 件</span>
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
                  :disabled="!selectedAddress || cartItems.length === 0"
                  class="submit-button"
                  @click="handleSubmitOrder"
                >
                  提交订单
                </el-button>
              </div>
            </el-col>
          </el-row>
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
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import AddressManage from '@/components/AddressManage.vue'
  import { getCart, listAddresses, createOrder } from '@/axios/mall'

  const router = useRouter()

  const cartItems = ref([])
  const addresses = ref([])
  const selectedAddress = ref(null)
  const loading = ref(false)
  const showAddressDialog = ref(false)
  const addressManageRef = ref(null)

  const totalQuantity = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.quantity, 0)
  })

  const totalPrice = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  })

  // 获取购物车（只获取选中的商品）
  const fetchCart = async () => {
    loading.value = true
    try {
      const response = await getCart()
      if (response.code === 200) {
        // 只显示选中的商品
        cartItems.value = (response.data || []).filter(item => 
          item.selected === 1 || item.selected === true
        )
        if (cartItems.value.length === 0) {
          ElMessage.warning('请先在购物车中选择要结算的商品')
          router.push('/mall/cart')
        }
      } else {
        ElMessage.error(response.message || '获取购物车失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取购物车失败')
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
      // 获取用户在对话框中选中的地址
      const selected = addressManageRef.value.getSelectedAddress()
      if (selected) {
        selectedAddress.value = selected
        console.log('更新选中地址:', selected)
        // 同时更新地址列表，但不自动选择（保持用户的选择）
        const response = await listAddresses()
        if (response.code === 200) {
          addresses.value = response.data || []
        }
      } else {
        ElMessage.warning('请先选择一个地址')
        return
      }
    }
    showAddressDialog.value = false
  }

  // 提交订单
  const handleSubmitOrder = async () => {
    if (!selectedAddress.value) {
      ElMessage.warning('请选择收货地址')
      return
    }

    try {
      await ElMessageBox.confirm('确认提交订单？', '提示', {
        confirmButtonText: '确认提交',
        cancelButtonText: '取消',
        type: 'warning'
      })

      const cart_items = cartItems.value.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        stock: item.stock
      }))

      const response = await createOrder({
        address_id: selectedAddress.value.address_id,
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
    }
  }

  onMounted(async () => {
    await fetchCart()
    await fetchAddresses()
  })
</script>

<style scoped>
.checkout-page {
  padding: 20px 24px;
  min-height: 100vh;
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
  color: var(--text-primary);
}

.loading-container {
  padding: 40px 0;
}

.checkout-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.checkout-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 24px;
  color: var(--text-primary);
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.address-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--card-border-color);
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
  color: var(--text-primary);
}

.recipient-phone {
  font-size: 14px;
  color: var(--text-secondary);
}

.address-detail {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.no-address {
  padding: 40px 0;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.item-row {
  display: grid;
  grid-template-columns: 80px 1fr auto auto;
  gap: 16px;
  align-items: center;
  color: var(--text-primary);
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.item-price {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.item-quantity {
  font-size: 16px;
  color: var(--el-text-color-regular);
}

.item-total {
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.checkout-summary {
  background: var(--bg-secondary);
  color: var(--text-primary);
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
  color: var(--text-primary);
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

.submit-button {
  width: 100%;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .checkout-summary {
    position: static;
  }

  .item-row {
    grid-template-columns: 60px 1fr;
    grid-template-rows: auto auto;
  }

  .item-quantity,
  .item-total {
    grid-column: 2;
    justify-self: flex-end;
  }
}
</style>


