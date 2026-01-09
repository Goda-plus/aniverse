<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="order-detail-page">
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

        <!-- 订单详情 -->
        <div v-else-if="order" class="order-detail">
          <!-- 订单状态 -->
          <div class="order-status-card">
            <div class="status-info">
              <el-icon class="status-icon" :class="statusIconClass">
                <component :is="statusIcon" />
              </el-icon>
              <div class="status-text">
                <div class="status-label">
                  {{ getStatusLabel(order.status) }}
                </div>
                <div v-if="order.status === 'shipped'" class="status-desc">
                  商品已发货，请注意查收
                </div>
                <div v-else-if="order.status === 'paid'" class="status-desc">
                  订单已支付，等待商家发货
                </div>
                <div v-else-if="order.status === 'pending'" class="status-desc">
                  请尽快完成支付
                </div>
                <div v-else-if="order.status === 'completed'" class="status-desc">
                  订单已完成，感谢您的购买
                </div>
              </div>
            </div>
            <div class="status-actions">
              <template v-if="order.status === 'pending'">
                <el-button type="primary" @click="handlePay">
                  去支付
                </el-button>
                <el-button style="background-color: var(--bg-tertiary);border-color: var(--bg-tertiary);" @click="handleCancel">
                  取消订单
                </el-button>
              </template>
              <template v-else-if="order.status === 'paid'">
                <el-button type="danger" @click="handleCancel">
                  取消订单
                </el-button>
              </template>
              <template v-else-if="order.status === 'shipped'">
                <el-button type="primary" @click="handleConfirm">
                  确认收货
                </el-button>
              </template>
            </div>
          </div>

          <!-- 订单信息 -->
          <div class="order-info-card">
            <h3 class="card-title">
              订单信息
            </h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">订单号：</span>
                <span class="info-value">{{ order.order_number }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">下单时间：</span>
                <span class="info-value">{{ formatDate(order.created_at) }}</span>
              </div>
              <div v-if="order.payment_time" class="info-item">
                <span class="info-label">支付时间：</span>
                <span class="info-value">{{ formatDate(order.payment_time) }}</span>
              </div>
              <div v-if="order.shipped_time" class="info-item">
                <span class="info-label">发货时间：</span>
                <span class="info-value">{{ formatDate(order.shipped_time) }}</span>
              </div>
              <div v-if="order.delivered_time" class="info-item">
                <span class="info-label">完成时间：</span>
                <span class="info-value">{{ formatDate(order.delivered_time) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">支付方式：</span>
                <span class="info-value">{{ order.payment_method || '模拟支付' }}</span>
              </div>
            </div>
          </div>

          <!-- 收货地址 -->
          <div class="address-card">
            <h3 class="card-title">
              收货地址
            </h3>
            <el-descriptions
              :column="2"
              border
              class="address-descriptions"
            >
              <el-descriptions-item label="收货人">
                {{ order.recipient_name }}
              </el-descriptions-item>
              <el-descriptions-item label="联系电话">
                {{ order.phone }}
              </el-descriptions-item>
              <el-descriptions-item label="收货地址">
                {{ order.province }} {{ order.city }} {{ order.district }}
              </el-descriptions-item>
              <el-descriptions-item label="详细地址">
                {{ order.detail_address }}
              </el-descriptions-item>
              <el-descriptions-item v-if="order.postal_code" label="邮编">
                {{ order.postal_code }}
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- 商品列表 -->
          <div class="items-card">
            <h3 class="card-title">
              商品清单
            </h3>
            <div class="items-list">
              <div
                v-for="item in orderItems"
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
                  <div class="item-name" @click="goToProduct(item.product_id)">
                    {{ item.name }}
                  </div>
                  <div class="item-price">
                    ￥{{ item.unit_price.toFixed(2) }}
                  </div>
                </div>
                <div class="item-quantity">
                  x{{ item.quantity }}
                </div>
                <div class="item-total">
                  ￥{{ item.total_price.toFixed(2) }}
                </div>
              </div>
            </div>
            <div class="items-footer">
              <div class="total-amount">
                <span class="label">订单总额：</span>
                <span class="amount">￥{{ order.total_amount }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 错误状态 -->
        <div v-else class="error-container">
          <el-result
            icon="error"
            title="订单不存在"
            sub-title="该订单可能不存在或已被删除"
          >
            <template #extra>
              <el-button type="primary" @click="$router.push('/mall/orders')">
                返回订单列表
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
  import { ArrowLeft, CircleCheck, Clock, Box, Close } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { getOrderDetail, payOrder, cancelOrder, confirmOrder } from '@/axios/mall'

  const route = useRoute()
  const router = useRouter()

  const order = ref(null)
  const orderItems = ref([])
  const loading = ref(false)

  const statusIcon = computed(() => {
    const iconMap = {
      pending: Clock,
      paid: Clock,
      shipped: Box,
      completed: CircleCheck,
      cancelled: Close
    }
    return iconMap[order.value?.status] || Clock
  })

  const statusIconClass = computed(() => {
    const classMap = {
      pending: 'status-warning',
      paid: 'status-info',
      shipped: 'status-primary',
      completed: 'status-success',
      cancelled: 'status-info'
    }
    return classMap[order.value?.status] || ''
  })

  const getStatusLabel = (status) => {
    const labelMap = {
      pending: '待支付',
      paid: '已支付',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消'
    }
    return labelMap[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

  // 获取订单详情
  const fetchOrderDetail = async () => {
    loading.value = true
    try {
      const response = await getOrderDetail(route.params.id)
      if (response.code === 200) {
        order.value = response.data.order
        orderItems.value = response.data.items || []
        console.log('orderItems', orderItems.value)
      } else {
        ElMessage.error(response.message || '获取订单详情失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取订单详情失败')
    } finally {
      loading.value = false
    }
  }

  // 支付订单
  const handlePay = async () => {
    try {
      await ElMessageBox.confirm('确认支付该订单？', '提示', {
        confirmButtonText: '确认支付',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await payOrder(order.value.id)
      ElMessage.success('支付成功')
      fetchOrderDetail()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '支付失败')
      }
    }
  }

  // 取消订单
  const handleCancel = async () => {
    try {
      await ElMessageBox.confirm('确认取消该订单？', '提示', {
        confirmButtonText: '确认取消',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await cancelOrder(order.value.id)
      ElMessage.success('订单已取消')
      fetchOrderDetail()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '取消订单失败')
      }
    }
  }

  // 确认收货
  const handleConfirm = async () => {
    try {
      await ElMessageBox.confirm('确认已收到商品？', '提示', {
        confirmButtonText: '确认收货',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await confirmOrder(order.value.id)
      ElMessage.success('确认收货成功')
      fetchOrderDetail()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '确认收货失败')
      }
    }
  }

  // 跳转到商品详情
  const goToProduct = (productId) => {
    router.push(`/mall/product/${productId}`)
  }

  onMounted(() => {
    fetchOrderDetail()
  })
</script>

<style scoped>
.order-detail-page {
  padding: 20px 24px;
  min-height: 100vh;
  transition: background-color 0.3s ease;
  max-width: 1200px;
  margin: 0 auto;
}

.back-button {
  margin-bottom: 20px;
}

.loading-container {
  padding: 40px 0;
}

.order-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-status-card,
.order-info-card,
.address-card,
.items-card {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.order-status-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-icon {
  font-size: 48px;
}

.status-icon.status-success {
  color: var(--el-color-success);
}

.status-icon.status-primary {
  color: var(--el-color-primary);
}

.status-icon.status-warning {
  color: var(--el-color-warning);
}

.status-icon.status-info {
  color: var(--el-color-info);
}

.status-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.status-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.status-actions {
  display: flex;
  gap: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: var(--text-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-label {
  color: var(--text-primary);
}

.info-value {
  color: var(--text-secondary);
  font-weight: 500;
}

.address-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-line {
  display: flex;
  gap: 16px;
  align-items: center;
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

.postal-code {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.item-row {
  display: grid;
  grid-template-columns: 80px 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border-radius: 8px;
}

.item-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
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
  color: var(--text-primary);
  cursor: pointer;
  transition: color 0.3s;
}

.item-name:hover {
  color: var(--el-color-primary);
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

.items-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-light);
}

.total-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.total-amount .label {
  font-size: 16px;
  color: var(--text-primary);
}

.total-amount .amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--el-color-danger);
}

.error-container {
  padding: 60px 20px;
}

@media (max-width: 768px) {
  .order-status-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }

  .status-actions {
    width: 100%;
    justify-content: stretch;
  }

  .status-actions .el-button {
    flex: 1;
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


