<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="order-detail-page">
        <el-button
          link
          type="primary"
          class="back-button"
          @click="$router.push({ name: 'seller-orders', query: shopId ? { shopId: String(shopId) } : {} })"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>

        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else-if="order" class="order-detail">
          <el-alert
            v-if="buyerRefundAlertText"
            type="warning"
            :closable="false"
            show-icon
            class="buyer-refund-alert"
            :title="buyerRefundAlertText"
          />
          <div class="order-status-card">
            <div class="status-info">
              <el-icon class="status-icon" :class="statusIconClass">
                <component :is="statusIcon" />
              </el-icon>
              <div class="status-text">
                <div class="status-label">
                  {{ getStatusLabel(order.status) }}
                </div>
                <div class="status-desc">
                  {{ getStatusDesc(order.status) }}
                </div>
              </div>
            </div>

            <div class="status-actions">
              <template v-if="order.status === 'pending'">
                <el-button type="danger" @click="handleUpdate('cancelled')">
                  取消订单
                </el-button>
              </template>

              <template v-else-if="order.status === 'paid'">
                <el-button type="primary" @click="handleUpdate('shipped')">
                  确认发货
                </el-button>
                <el-button type="warning" @click="handleUpdate('refunded')">
                  退款/售后
                </el-button>
                <el-button style="background-color: var(--bg-tertiary);border-color: var(--bg-tertiary);" @click="handleUpdate('cancelled')">
                  取消订单
                </el-button>
              </template>

              <template v-else-if="order.status === 'shipped'">
                <el-button type="primary" @click="handleUpdate('completed')">
                  确认完成
                </el-button>
                <el-button type="warning" @click="handleUpdate('refunded')">
                  退款/售后
                </el-button>
              </template>
            </div>
          </div>

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
                  :src="firstProductImageUrl(item.cover_image)"
                  :alt="item.name"
                  class="item-image"
                  fit="cover"
                />
                <div class="item-info">
                  <div class="item-name" @click="goToProduct(item.product_id)">
                    {{ item.name }}
                  </div>
                  <div class="item-price">
                    ￥{{ item.unit_price?.toFixed(2) }}
                  </div>
                </div>
                <div class="item-quantity">
                  x{{ item.quantity }}
                </div>
                <div class="item-total">
                  ￥{{ item.total_price?.toFixed(2) }}
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

        <div v-else class="error-container">
          <el-result
            icon="error"
            title="订单不存在"
            sub-title="该订单可能不存在或已被删除"
          >
            <template #extra>
              <el-button type="primary" @click="$router.push({ name: 'seller-orders', query: shopId ? { shopId: String(shopId) } : {} })">
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
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { ArrowLeft, CircleCheck, Clock, Box, Close } from '@element-plus/icons-vue'
  import { getSellerOrderDetail, updateSellerOrderStatus } from '@/axios/shop'
  import { firstProductImageUrl } from '@/utils/productImages'

  const route = useRoute()
  const router = useRouter()

  const shopId = computed(() => {
    if (!route.query.shopId) return null
    const n = Number(route.query.shopId)
    return Number.isFinite(n) ? n : null
  })

  const order = ref(null)
  const orderItems = ref([])
  const loading = ref(false)

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

  const buyerRefundAlertText = computed(() => {
    const o = order.value
    if (!o) return ''
    const r = o.buyer_refund_request
    if (r == null || r === '' || r === 'none') return ''
    const code = String(r).trim()
    const time = o.buyer_refund_requested_at ? formatDate(o.buyer_refund_requested_at) : ''
    const reason = o.buyer_refund_reason ? `说明：${o.buyer_refund_reason}` : ''
    if (code === 'refund') {
      return `买家已发起「退款」申请${time ? `（${time}）` : ''}${reason ? `。${reason}` : ''}`
    }
    if (code === 'refund_return') {
      return `买家已发起「退款退货」申请${time ? `（${time}）` : ''}${reason ? `。${reason}` : ''}`
    }
    return ''
  })

  const statusIcon = computed(() => {
    const iconMap = {
      pending: Clock,
      paid: Clock,
      shipped: Box,
      completed: CircleCheck,
      cancelled: Close,
      refunded: Close
    }
    return iconMap[order.value?.status] || Clock
  })

  const statusIconClass = computed(() => {
    const classMap = {
      pending: 'status-warning',
      paid: 'status-info',
      shipped: 'status-primary',
      completed: 'status-success',
      cancelled: 'status-info',
      refunded: 'status-error'
    }
    return classMap[order.value?.status] || ''
  })

  const getStatusLabel = (status) => {
    const labelMap = {
      pending: '待支付',
      paid: '已支付',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    }
    return labelMap[status] || status
  }

  const getStatusDesc = (status) => {
    const descMap = {
      pending: '等待买家支付',
      paid: '订单已支付，等待发货',
      shipped: '已发货，等待完成',
      completed: '订单已完成',
      cancelled: '订单已取消',
      refunded: '已退款/售后完成'
    }
    return descMap[status] || ''
  }

  const fetchOrderDetail = async () => {
    loading.value = true
    try {
      const params = shopId.value ? { shop_id: shopId.value } : undefined
      const response = await getSellerOrderDetail(route.params.id, params)
      if (response.code === 200) {
        order.value = response.data.order
        orderItems.value = response.data.items || []
      } else {
        ElMessage.error(response.message || '获取订单详情失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取订单详情失败')
    } finally {
      loading.value = false
    }
  }

  const getConfirmTitle = (nextStatus) => {
    const map = {
      shipped: '确认发货？',
      completed: '确认完成？',
      cancelled: '确认取消该订单？',
      refunded: '确认退款/售后完成？'
    }
    return map[nextStatus] || '确认操作？'
  }

  const handleUpdate = async (nextStatus) => {
    try {
      await ElMessageBox.confirm(getConfirmTitle(nextStatus), '提示', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      })

      const params = shopId.value ? { shop_id: shopId.value } : undefined
      await updateSellerOrderStatus(order.value.id, { status: nextStatus }, params)
      ElMessage.success('操作成功')
      fetchOrderDetail()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '操作失败')
      }
    }
  }

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

  .buyer-refund-alert {
    margin-bottom: 0;
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
  .status-icon.status-error {
    color: var(--el-color-danger);
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

  .empty-container {
    padding: 60px 20px;
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

