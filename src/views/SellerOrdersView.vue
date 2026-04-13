<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="seller-orders-page">
        <div class="page-header">
          <h1 class="page-title">
            店铺订单管理
          </h1>
        </div>

        <div class="status-filter">
          <el-button
            :type="selectedStatus === null ? 'primary' : 'default'"
            :plain="selectedStatus !== null"
            @click="selectStatus(null)"
          >
            全部
          </el-button>
          <el-button
            v-for="status in orderStatuses"
            :key="status.value"
            :type="selectedStatus === status.value ? 'primary' : 'default'"
            :plain="selectedStatus !== status.value"
            @click="selectStatus(status.value)"
          >
            {{ status.label }}
          </el-button>
        </div>

        <div class="search-bar">
          <el-input
            v-model.trim="searchOrderNumber"
            placeholder="搜索订单号"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleClearSearch"
          >
            <template #append>
              <el-button @click="handleSearch">
                搜索
              </el-button>
            </template>
          </el-input>
        </div>

        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else-if="orders.length > 0" class="orders-list">
          <div
            v-for="order in orders"
            :key="order.id"
            class="order-item"
          >
            <div class="order-header">
              <div class="order-info">
                <span class="order-number">
                  订单号：{{ order.order_number }}
                </span>
                <span class="order-time">
                  {{ formatDate(order.created_at) }}
                </span>
              </div>

              <div class="order-tags">
                <el-tag :type="getStatusType(order.status)">
                  {{ getStatusLabel(order.status) }}
                </el-tag>
                <el-tag
                  v-if="mallBuyerRefundLabel(order)"
                  type="warning"
                  effect="plain"
                >
                  {{ mallBuyerRefundLabel(order) }}
                </el-tag>
              </div>
            </div>

            <div class="order-content">
              <div class="order-amount">
                <span class="label">订单金额：</span>
                <span class="amount">￥{{ order.total_amount }}</span>
              </div>

              <div class="order-actions">
                <el-button link type="primary" @click="viewDetail(order.id)">
                  查看详情
                </el-button>

                <!-- 待支付：只提供取消 -->
                <template v-if="order.status === 'pending'">
                  <el-button link type="danger" @click="handleUpdate(order.id, 'cancelled')">
                    取消订单
                  </el-button>
                </template>

                <!-- 已支付：发货 / 退款 / 取消 -->
                <template v-else-if="order.status === 'paid'">
                  <el-button link type="primary" @click="handleUpdate(order.id, 'shipped')">
                    确认发货
                  </el-button>
                  <el-button link type="warning" @click="handleUpdate(order.id, 'refunded')">
                    退款/售后
                  </el-button>
                  <el-button link type="danger" @click="handleUpdate(order.id, 'cancelled')">
                    取消订单
                  </el-button>
                </template>

                <!-- 已发货：完成 / 退款 -->
                <template v-else-if="order.status === 'shipped'">
                  <el-button link type="primary" @click="handleUpdate(order.id, 'completed')">
                    确认完成
                  </el-button>
                  <el-button link type="warning" @click="handleUpdate(order.id, 'refunded')">
                    退款/售后
                  </el-button>
                </template>
                <el-button link type="primary" @click="contactBuyer(order)">
                  联系顾客
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-container">
          <el-empty description="暂无订单">
            <el-button type="primary" @click="$router.push('/mall')">
              去购物
            </el-button>
          </el-empty>
        </div>

        <div v-if="total > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { listSellerOrders, updateSellerOrderStatus } from '@/axios/shop'
  import { createRoom } from '@/axios/chat'

  const router = useRouter()
  const route = useRoute()

  const shopId = computed(() => {
    if (!route.query.shopId) return null
    const n = Number(route.query.shopId)
    return Number.isFinite(n) ? n : null
  })

  const orders = ref([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const selectedStatus = ref(null)
  const searchOrderNumber = ref('')

  const orderStatuses = [
    { label: '待支付', value: 'pending' },
    { label: '已支付', value: 'paid' },
    { label: '已发货', value: 'shipped' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
    { label: '已退款', value: 'refunded' }
  ]

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

  const getStatusType = (status) => {
    const typeMap = {
      pending: 'warning',
      paid: 'info',
      shipped: '',
      completed: 'success',
      cancelled: 'info',
      refunded: 'danger'
    }
    return typeMap[status] || ''
  }

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

  const mallBuyerRefundLabel = (row) => {
    const r = row?.buyer_refund_request
    if (r == null || r === '' || r === 'none') return ''
    if (String(r).trim() === 'refund') return '买家申请：退款'
    if (String(r).trim() === 'refund_return') return '买家申请：退款退货'
    return ''
  }

  const fetchOrders = async () => {
    loading.value = true
    try {
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value
      }
      if (selectedStatus.value) params.status = selectedStatus.value
      if (shopId.value) params.shop_id = shopId.value
      if (searchOrderNumber.value) params.order_number = searchOrderNumber.value

      const response = await listSellerOrders(params)
      if (response.code === 200) {
        orders.value = response.data.list || []
        total.value = response.data.total || 0
      } else {
        ElMessage.error(response.message || '获取订单列表失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取订单列表失败')
    } finally {
      loading.value = false
    }
  }

  const selectStatus = (status) => {
    selectedStatus.value = status
    currentPage.value = 1
    fetchOrders()
  }

  const handleSearch = () => {
    currentPage.value = 1
    fetchOrders()
  }

  const handleClearSearch = () => {
    searchOrderNumber.value = ''
    currentPage.value = 1
    fetchOrders()
  }

  const viewDetail = (orderId) => {
    router.push({
      name: 'seller-order-detail',
      params: { id: orderId },
      query: shopId.value ? { shopId: String(shopId.value) } : {}
    })
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

  const handleUpdate = async (orderId, nextStatus) => {
    try {
      await ElMessageBox.confirm(getConfirmTitle(nextStatus), '提示', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      })

      const params = shopId.value ? { shop_id: shopId.value } : undefined
      await updateSellerOrderStatus(orderId, { status: nextStatus }, params)
      ElMessage.success('操作成功')
      fetchOrders()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '操作失败')
      }
    }
  }

  const handleSizeChange = (size) => {
    pageSize.value = size
    currentPage.value = 1
    fetchOrders()
  }

  const handlePageChange = (page) => {
    currentPage.value = page
    fetchOrders()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const contactBuyer = async (order) => {
    const buyerId = Number(order?.buyer_user_id)
    const currentShopId = Number(shopId.value)
    if (!Number.isFinite(buyerId) || buyerId <= 0) {
      ElMessage.warning('当前订单缺少顾客信息，无法发起聊天')
      return
    }
    if (!Number.isFinite(currentShopId) || currentShopId <= 0) {
      ElMessage.warning('缺少店铺信息，无法发起客服会话')
      return
    }

    try {
      const res = await createRoom({
        memberIds: [buyerId],
        scene: 'shop_service',
        shopId: currentShopId,
        shopName: `店铺${currentShopId}`
      })

      if (!res.success || !res.data?.roomId) {
        ElMessage.error(res.message || '创建客服会话失败')
        return
      }

      window.dispatchEvent(new CustomEvent('open-shop-service-chat', {
        detail: { roomId: Number(res.data.roomId) }
      }))
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建客服会话失败')
    }
  }

  onMounted(() => {
    fetchOrders()
  })
</script>

<style scoped>
  .seller-orders-page {
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

  .status-filter {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    flex-wrap: wrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  :deep(.status-filter .el-button) {
    color: var(--bg-secondary);
  }

  .loading-container {
    padding: 40px 0;
  }

  .search-bar {
    max-width: 520px;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .orders-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .order-item {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.3s;
  }

  .order-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .order-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .order-number {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .order-time {
    font-size: 14px;
    color: var(--text-secondary);
  }

  .order-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .order-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .order-amount {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }

  .order-amount .label {
    font-size: 14px;
    color: var(--text-primary);
  }

  .order-amount .amount {
    font-size: 20px;
    font-weight: 700;
    color: var(--el-color-danger);
  }

  .order-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
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

  :deep(.search-bar .el-input__wrapper),
  :deep(.search-bar .el-input-group__append) {
    background: var(--bg-tertiary);
    box-shadow: none;
    border-color: transparent;
  }

  @media (max-width: 768px) {
    .order-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .order-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }
</style>

