<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="order-list-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">
            我的订单
          </h1>
        </div>

        <!-- 订单状态筛选 -->
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

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 订单列表 -->
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
              <el-tag :type="getStatusType(order.status)">
                {{ getStatusLabel(order.status) }}
              </el-tag>
            </div>
            <div class="order-content">
              <div class="order-amount">
                <span class="label">订单金额：</span>
                <span class="amount">￥{{ order.total_amount }}</span>
              </div>
              <div class="order-actions">
                <el-button
                  link
                  type="primary"
                  @click="viewDetail(order.id)"
                >
                  查看详情
                </el-button>
                <template v-if="order.status === 'pending'">
                  <el-button
                    link
                    type="primary"
                    @click="handlePay(order.id)"
                  >
                    去支付
                  </el-button>
                  <el-button
                    link
                    type="danger"
                    @click="handleCancel(order.id)"
                  >
                    取消订单
                  </el-button>
                </template>
                <template v-else-if="order.status === 'paid'">
                  <el-button
                    link
                    type="danger"
                    @click="handleCancel(order.id)"
                  >
                    取消订单
                  </el-button>
                </template>
                <template v-else-if="order.status === 'shipped'">
                  <el-button
                    link
                    type="primary"
                    @click="handleConfirm(order.id)"
                  >
                    确认收货
                  </el-button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-container">
          <el-empty description="暂无订单">
            <el-button type="primary" @click="$router.push('/mall')">
              去购物
            </el-button>
          </el-empty>
        </div>

        <!-- 分页 -->
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
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { listOrders, payOrder, cancelOrder, confirmOrder } from '@/axios/mall'

  const router = useRouter()

  const orders = ref([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const selectedStatus = ref(null)

  const orderStatuses = [
    { label: '待支付', value: 'pending' },
    { label: '已支付', value: 'paid' },
    { label: '已发货', value: 'shipped' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' }
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
      cancelled: 'info'
    }
    return typeMap[status] || ''
  }

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

  // 获取订单列表
  const fetchOrders = async () => {
    loading.value = true
    try {
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value
      }
      if (selectedStatus.value) {
        params.status = selectedStatus.value
      }

      const response = await listOrders(params)
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

  // 选择状态
  const selectStatus = (status) => {
    selectedStatus.value = status
    currentPage.value = 1
    fetchOrders()
  }

  // 查看详情
  const viewDetail = (orderId) => {
    router.push(`/mall/order/${orderId}`)
  }

  // 支付订单
  const handlePay = async (orderId) => {
    try {
      await ElMessageBox.confirm('确认支付该订单？', '提示', {
        confirmButtonText: '确认支付',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await payOrder(orderId)
      ElMessage.success('支付成功')
      fetchOrders()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '支付失败')
      }
    }
  }

  // 取消订单
  const handleCancel = async (orderId) => {
    try {
      await ElMessageBox.confirm('确认取消该订单？', '提示', {
        confirmButtonText: '确认取消',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await cancelOrder(orderId)
      ElMessage.success('订单已取消')
      fetchOrders()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '取消订单失败')
      }
    }
  }

  // 确认收货
  const handleConfirm = async (orderId) => {
    try {
      await ElMessageBox.confirm('确认已收到商品？', '提示', {
        confirmButtonText: '确认收货',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await confirmOrder(orderId)
      ElMessage.success('确认收货成功')
      fetchOrders()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '确认收货失败')
      }
    }
  }

  // 分页处理
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

  onMounted(() => {
    fetchOrders()
  })
</script>

<style scoped>
.order-list-page {
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

.status-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  flex-wrap: wrap;
}

.loading-container {
  padding: 40px 0;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-item {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 20px;
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
  border-bottom: 1px solid var(--el-border-color-light);
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.order-time {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.order-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-amount {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.order-amount .label {
  font-size: 14px;
  color: var(--el-text-color-regular);
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


