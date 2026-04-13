<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="creator-orders-page">
        <div class="page-header">
          <h1 class="page-title">
            众筹回报订单
          </h1>
          <p v-if="projectId" class="page-sub">
            当前项目筛选：可在下方清除筛选查看全部
          </p>
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
            v-for="s in shippingStatuses"
            :key="s.value"
            :type="selectedStatus === s.value ? 'primary' : 'default'"
            :plain="selectedStatus !== s.value"
            @click="selectStatus(s.value)"
          >
            {{ s.label }}
          </el-button>
        </div>

        <div class="search-bar">
          <el-input
            v-model.trim="keyword"
            placeholder="搜索支持者用户名或支持单号"
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
            v-for="row in orders"
            :key="row.id"
            class="order-item"
          >
            <div class="order-header">
              <div class="order-info">
                <span class="order-number">
                  支持单号 #{{ row.id }}
                </span>
                <span class="order-meta">
                  {{ row.project_title }} · {{ row.tier_title }}
                </span>
                <span class="order-time">
                  {{ formatDate(row.created_at) }}
                </span>
              </div>
              <el-tag :type="getStatusType(row.shipping_status)">
                {{ getShippingLabel(row.shipping_status) }}
              </el-tag>
              <el-tag
                v-if="buyerRefundBadge(row)"
                type="danger"
                effect="dark"
                size="small"
              >
                {{ buyerRefundBadge(row) }}
              </el-tag>
            </div>

            <div class="order-content">
              <div class="order-amount">
                <span class="label">支持者：</span>
                <span>{{ row.username }}</span>
                <span class="sep">·</span>
                <span class="label">金额：</span>
                <span class="amount">￥{{ row.amount }}</span>
              </div>

              <div class="order-actions">
                <el-button link type="primary" @click="viewDetail(row.id)">
                  查看详情
                </el-button>

                <template v-if="normalizeShipping(row.shipping_status) === 'pending'">
                  <el-button link type="primary" @click="handleUpdate(row.id, 'shipped')">
                    确认发货
                  </el-button>
                  <el-button link type="warning" @click="handleUpdate(row.id, 'refunded')">
                    退款处理
                  </el-button>
                </template>

                <template v-else-if="['shipped', 'delivered'].includes(normalizeShipping(row.shipping_status))">
                  <el-button link type="primary" @click="handleUpdate(row.id, 'completed')">
                    确认完成
                  </el-button>
                  <el-button link type="warning" @click="handleUpdate(row.id, 'refunded')">
                    退款处理
                  </el-button>
                </template>

                <el-button link type="primary" @click="contactBacker(row)">
                  联系支持者
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="empty-container">
          <el-empty description="暂无支持订单" />
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
  import {
    listCrowdfundingCreatorBackings,
    updateCrowdfundingCreatorBackingShipping
  } from '@/axios/crowdfunding'
  import { createRoom } from '@/axios/chat'

  const router = useRouter()
  const route = useRoute()

  const projectId = computed(() => {
    const q = route.query.projectId
    if (q === undefined || q === null || q === '') return null
    const n = Number(q)
    return Number.isFinite(n) ? n : null
  })

  const orders = ref([])
  const loading = ref(false)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(10)
  const selectedStatus = ref(null)
  const keyword = ref('')

  const shippingStatuses = [
    { label: '待发货', value: 'pending' },
    { label: '已发货', value: 'shipped' },
    { label: '已完成', value: 'completed' },
    { label: '已退款', value: 'refunded' }
  ]

  const normalizeShipping = (s) => {
    if (s == null || s === '') return 'pending'
    const t = String(s).trim()
    if (t === 'not_shipped' || t === 'NOT_SHIPPED') return 'pending'
    return t
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const getStatusType = (status) => {
    const s = normalizeShipping(status)
    const typeMap = {
      pending: 'warning',
      shipped: 'info',
      delivered: 'info',
      completed: 'success',
      refunded: 'danger'
    }
    return typeMap[s] || ''
  }

  const getShippingLabel = (status) => {
    const s = normalizeShipping(status)
    const labelMap = {
      pending: '待发货',
      shipped: '已发货',
      delivered: '已送达',
      completed: '已完成',
      refunded: '已退款'
    }
    return labelMap[s] || s
  }

  const buyerRefundBadge = (row) => {
    const r = row?.buyer_refund_request
    if (r == null || r === '' || r === 'none') return ''
    if (r === 'refund') return '买家申请：退款'
    if (r === 'refund_return') return '买家申请：退款退货'
    return ''
  }

  const fetchOrders = async () => {
    loading.value = true
    try {
      const params = {
        page: currentPage.value,
        pageSize: pageSize.value
      }
      if (selectedStatus.value) params.shipping_status = selectedStatus.value
      if (projectId.value) params.project_id = projectId.value
      if (keyword.value) params.keyword = keyword.value

      const response = await listCrowdfundingCreatorBackings(params)
      if (response.success && response.code === 200) {
        orders.value = response.data?.list || []
        total.value = response.data?.total || 0
      } else {
        ElMessage.error(response.message || '获取列表失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取列表失败')
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
    keyword.value = ''
    currentPage.value = 1
    fetchOrders()
  }

  const viewDetail = (id) => {
    router.push({
      name: 'crowdfunding-creator-order-detail',
      params: { id: String(id) },
      query: projectId.value ? { projectId: String(projectId.value) } : {}
    })
  }

  const getConfirmTitle = (next) => {
    const map = {
      shipped: '确认已发货？',
      completed: '确认支持者已收到回报？',
      refunded: '确认已处理退款？'
    }
    return map[next] || '确认操作？'
  }

  const handleUpdate = async (backingId, nextStatus) => {
    try {
      await ElMessageBox.confirm(getConfirmTitle(nextStatus), '提示', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await updateCrowdfundingCreatorBackingShipping(backingId, { shipping_status: nextStatus })
      ElMessage.success('操作成功')
      fetchOrders()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '操作失败')
      }
    }
  }

  const contactBacker = async (row) => {
    const uid = Number(row?.user_id)
    const pid = Number(row?.project_id)
    if (!Number.isFinite(uid) || uid <= 0) {
      ElMessage.warning('缺少支持者信息，无法发起聊天')
      return
    }
    if (!Number.isFinite(pid) || pid <= 0) {
      ElMessage.warning('缺少项目信息，无法打开众筹沟通窗口')
      return
    }
    try {
      const res = await createRoom({
        memberIds: [uid],
        scene: 'crowdfunding_support',
        projectId: pid
      })
      if (!res.success || !res.data?.roomId) {
        ElMessage.error(res.message || '创建会话失败')
        return
      }
      window.dispatchEvent(new CustomEvent('open-crowdfunding-support-chat', {
        detail: { roomId: Number(res.data.roomId) }
      }))
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建会话失败')
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

  onMounted(() => {
    fetchOrders()
  })
</script>

<style scoped>
  .creator-orders-page {
    padding: 20px 24px;
    min-height: 100vh;
    max-width: 1200px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    color: var(--text-primary);
  }

  .page-sub {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }

  .status-filter {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
    flex-wrap: wrap;
  }

  .search-bar {
    max-width: 520px;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
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
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .order-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .order-number {
    font-weight: 600;
    color: var(--text-primary);
  }

  .order-meta {
    font-size: 13px;
    color: var(--el-text-color-regular);
  }

  .order-time {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .order-content {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .order-amount .label {
    color: var(--el-text-color-secondary);
  }

  .order-amount .sep {
    margin: 0 6px;
    color: var(--el-text-color-placeholder);
  }

  .order-amount .amount {
    font-weight: 600;
    color: var(--el-color-danger);
  }

  .order-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pagination-container {
    margin-top: 24px;
    display: flex;
    justify-content: center;
  }

  .empty-container {
    padding: 48px 0;
  }
</style>
