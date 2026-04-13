<template>
  <div class="my-orders-tab">
    <section class="block">
      <h3 class="block-title">
        支持的众筹项目
      </h3>
      <div v-if="cfLoading" class="loading-row">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="backings.length" class="card-list">
        <div
          v-for="b in backings"
          :key="b.id"
          class="order-card"
        >
          <div class="card-main" @click="goCrowdfundingProject(b.project_id)">
            <div class="card-cover">
              <img
                v-if="b.project_image"
                :src="resolveUrl(b.project_image)"
                alt=""
              >
              <div v-else class="cover-placeholder">
                众筹
              </div>
            </div>
            <div class="card-body">
              <div class="card-title">
                {{ b.project_title }}
              </div>
              <div class="card-meta">
                <span>{{ b.tier_title }}</span>
                <span class="amount">￥{{ b.amount }} × {{ b.quantity }}</span>
              </div>
              <div class="card-tags">
                <el-tag size="small" type="info">
                  {{ projectStatusLabel(b.project_status) }}
                </el-tag>
                <el-tag v-if="b.status" size="small">
                  {{ backingStatusLabel(b.status) }}
                </el-tag>
                <el-tag v-if="b.shipping_status" size="small" effect="plain">
                  物流：{{ shippingStatusLabel(b.shipping_status) }}
                </el-tag>
              </div>
              <div class="card-time">
                {{ formatDate(b.created_at) }}
              </div>
            </div>
          </div>
          <div class="card-actions" @click.stop>
            <template v-if="canBuyerRefundOnly(b)">
              <el-button
                type="warning"
                size="small"
                plain
                @click="openBuyerRefundDialog(b)"
              >
                申请退款
              </el-button>
            </template>
            <template v-else-if="canBuyerRefundReturn(b)">
              <el-button
                type="warning"
                size="small"
                plain
                @click="openBuyerRefundDialog(b)"
              >
                申请退款退货
              </el-button>
            </template>
            <template v-else-if="buyerRefundCode(b) === 'refund'">
              <el-tag type="warning" size="small">
                退款申请处理中
              </el-tag>
            </template>
            <template v-else-if="buyerRefundCode(b) === 'refund_return'">
              <el-tag type="warning" size="small">
                退款退货申请处理中
              </el-tag>
            </template>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无众筹支持记录" />
      <div v-if="!cfLoading && cfTotal > cfPageSize" class="pager">
        <el-pagination
          v-model:current-page="cfPage"
          :page-size="cfPageSize"
          layout="total, prev, pager, next"
          :total="cfTotal"
          @current-change="loadBackings"
        />
      </div>
    </section>

    <section class="block">
      <h3 class="block-title">
        商城订单
      </h3>
      <div v-if="mallLoading" class="loading-row">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="orders.length" class="mall-list">
        <div
          v-for="o in orders"
          :key="o.id"
          class="mall-row"
        >
          <div class="mall-row-main">
            <span class="order-no">订单号 {{ o.order_number }}</span>
            <el-tag :type="orderStatusType(o.status)" size="small">
              {{ orderStatusLabel(o.status) }}
            </el-tag>
          </div>
          <div class="mall-row-sub">
            <span class="amount">￥{{ o.total_amount }}</span>
            <span class="time">{{ formatDate(o.created_at) }}</span>
            <el-button link type="primary" @click="goOrderDetail(o.id)">
              查看详情
            </el-button>
          </div>
          <div class="mall-row-actions" @click.stop>
            <template v-if="canMallRefundOnly(o)">
              <el-button
                type="warning"
                size="small"
                plain
                @click="openMallBuyerRefundDialog(o)"
              >
                申请退款
              </el-button>
            </template>
            <template v-else-if="canMallRefundReturn(o)">
              <el-button
                type="warning"
                size="small"
                plain
                @click="openMallBuyerRefundDialog(o)"
              >
                申请退款退货
              </el-button>
            </template>
            <template v-else-if="mallBuyerRefundCode(o) === 'refund'">
              <el-tag type="warning" size="small">
                退款申请处理中
              </el-tag>
            </template>
            <template v-else-if="mallBuyerRefundCode(o) === 'refund_return'">
              <el-tag type="warning" size="small">
                退款退货申请处理中
              </el-tag>
            </template>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无商城订单">
        <el-button type="primary" @click="$router.push('/mall')">
          去购物
        </el-button>
      </el-empty>
      <div v-if="!mallLoading && mallTotal > mallPageSize" class="pager">
        <el-pagination
          v-model:current-page="mallPage"
          :page-size="mallPageSize"
          layout="total, prev, pager, next"
          :total="mallTotal"
          @current-change="loadOrders"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Loading } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { getMyCrowdfundingBackings, requestCrowdfundingBuyerRefund } from '@/axios/crowdfunding'
  import { listOrders, requestMallBuyerRefund } from '@/axios/mall'
  import {
    normalizeBackingShip,
    buyerRefundCode,
    canBuyerRefundOnly,
    canBuyerRefundReturn
  } from '@/utils/crowdfundingBuyerRefund'

  const router = useRouter()

  const backings = ref([])
  const cfLoading = ref(false)
  const cfPage = ref(1)
  const cfPageSize = ref(10)
  const cfTotal = ref(0)

  const orders = ref([])
  const mallLoading = ref(false)
  const mallPage = ref(1)
  const mallPageSize = ref(10)
  const mallTotal = ref(0)

  const resolveUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/uploads/')) return `http://localhost:3000${path}`
    return path
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const projectStatusLabel = (s) => {
    const m = {
      draft: '草稿',
      pending_review: '待审核',
      active: '进行中',
      funded: '已成功',
      successful: '已成功',
      failed: '未达标',
      completed: '已完成',
      cancelled: '已取消'
    }
    return m[s] || s || '—'
  }

  const shippingStatusLabel = (raw) => {
    if (raw == null || raw === '') return '—'
    const key = normalizeBackingShip(raw)
    const m = {
      pending: '待发货',
      shipped: '已发货',
      delivered: '已送达',
      completed: '已完成',
      refunded: '已退款'
    }
    return m[key] || String(raw) || '—'
  }

  const openBuyerRefundDialog = async (b) => {
    const isReturn = canBuyerRefundReturn(b)
    const title = isReturn ? '申请退款退货' : '申请退款'
    const unpaid = String(b?.status || '').toLowerCase() === 'pending'
    const message = isReturn
      ? '当前为已发货/已送达/已完成，将发起退款退货申请。请后续与发起人沟通退回商品及退款事宜。'
      : unpaid
        ? '当前为待支付或未发货，将发起退款/关单申请。发起人可在回报订单中处理。'
        : '当前为未发货，将发起退款申请。发起人可在回报订单中处理。'
    try {
      const { value } = await ElMessageBox.prompt(
        `${message}\n\n说明（选填，500 字内）：`,
        title,
        {
          confirmButtonText: '提交申请',
          cancelButtonText: '取消',
          inputPlaceholder: '选填',
          inputPattern: /^[\s\S]{0,500}$/,
          inputErrorMessage: '说明过长'
        }
      )
      const res = await requestCrowdfundingBuyerRefund(b.id, { reason: value || '' })
      if (res.success && res.code === 200) {
        ElMessage.success(res.message || '提交成功')
        loadBackings()
      } else {
        ElMessage.error(res.message || '提交失败')
      }
    } catch (error) {
      if (error === 'cancel') return
      ElMessage.error(error.response?.data?.message || error.message || '提交失败')
    }
  }

  const backingStatusLabel = (s) => {
    const m = {
      pending: '待支付',
      paid: '已支付',
      cancelled: '已取消',
      refunded: '已退款'
    }
    return m[s] || s || '—'
  }

  const orderStatusLabel = (status) => {
    const labelMap = {
      pending: '待支付',
      paid: '已支付',
      shipped: '已发货',
      completed: '已完成',
      cancelled: '已取消'
    }
    return labelMap[status] || status || '—'
  }

  const orderStatusType = (status) => {
    const typeMap = {
      pending: 'warning',
      paid: 'info',
      shipped: '',
      completed: 'success',
      cancelled: 'info'
    }
    return typeMap[status] || ''
  }

  const loadBackings = async () => {
    cfLoading.value = true
    try {
      const res = await getMyCrowdfundingBackings({
        page: cfPage.value,
        pageSize: cfPageSize.value
      })
      if (res.success && res.data) {
        backings.value = res.data.list || []
        cfTotal.value = Number(res.data.total) || 0
      } else {
        backings.value = []
        cfTotal.value = 0
      }
    } catch (e) {
      console.error(e)
      ElMessage.error(e.response?.data?.message || '加载众筹支持记录失败')
      backings.value = []
    } finally {
      cfLoading.value = false
    }
  }

  const loadOrders = async () => {
    mallLoading.value = true
    try {
      const res = await listOrders({
        page: mallPage.value,
        pageSize: mallPageSize.value
      })
      if (res.success && res.data) {
        orders.value = res.data.list || []
        mallTotal.value = Number(res.data.total) || 0
      } else {
        orders.value = []
        mallTotal.value = 0
      }
    } catch (e) {
      console.error(e)
      ElMessage.error(e.response?.data?.message || '加载商城订单失败')
      orders.value = []
    } finally {
      mallLoading.value = false
    }
  }

  const goCrowdfundingProject = (projectId) => {
    router.push({ name: 'crowdfunding-project', params: { id: projectId } })
  }

  const goOrderDetail = (id) => {
    router.push({ name: 'order-detail', params: { id } })
  }

  const mallBuyerRefundCode = (o) => {
    const r = o?.buyer_refund_request
    if (r == null || r === '' || r === 'none') return null
    return String(r).trim()
  }

  const canMallRefundOnly = (o) =>
    String(o?.status || '').toLowerCase() === 'paid' && !mallBuyerRefundCode(o)

  const canMallRefundReturn = (o) =>
    String(o?.status || '').toLowerCase() === 'shipped' && !mallBuyerRefundCode(o)

  const openMallBuyerRefundDialog = async (o) => {
    const isReturn = canMallRefundReturn(o)
    const title = isReturn ? '申请退款退货' : '申请退款'
    const message = isReturn
      ? '当前订单已发货，将发起退款退货申请。请后续与商家沟通退回商品及退款事宜。'
      : '当前订单已支付、商家未发货，将发起仅退款申请。商家可在店铺订单中处理。'
    try {
      const { value } = await ElMessageBox.prompt(
        `${message}\n\n说明（选填，500 字内）：`,
        title,
        {
          confirmButtonText: '提交申请',
          cancelButtonText: '取消',
          inputPlaceholder: '选填',
          inputPattern: /^[\s\S]{0,500}$/,
          inputErrorMessage: '说明过长'
        }
      )
      const res = await requestMallBuyerRefund(o.id, { reason: value || '' })
      if (res.success && res.code === 200) {
        ElMessage.success(res.message || '提交成功')
        loadOrders()
      } else {
        ElMessage.error(res.message || '提交失败')
      }
    } catch (error) {
      if (error === 'cancel') return
      ElMessage.error(error.response?.data?.message || error.message || '提交失败')
    }
  }

  onMounted(() => {
    loadBackings()
    loadOrders()
  })
</script>

<style scoped>
.my-orders-tab {
  padding: 8px 0 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.block-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text-primary, #fff);
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.6));
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  background: var(--card-bg, #252529);
  transition: border-color 0.2s;
}

.order-card:hover {
  border-color: rgba(255, 105, 180, 0.45);
}

.card-main {
  display: flex;
  gap: 16px;
  cursor: pointer;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--card-border, rgba(255, 255, 255, 0.08));
}

.card-cover {
  width: 100px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #2a2a2e;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-weight: 600;
  color: var(--text-primary, #fff);
  margin-bottom: 6px;
  line-height: 1.35;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 13px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.65));
  margin-bottom: 8px;
}

.card-meta .amount {
  color: #ff69b4;
  font-weight: 500;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.card-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}

.mall-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mall-row {
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--card-border, rgba(255, 255, 255, 0.1));
  background: var(--card-bg, #252529);
}

.mall-row-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.order-no {
  font-size: 13px;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
}

.mall-row-sub {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
}

.mall-row-sub .amount {
  color: #ff69b4;
  font-weight: 600;
}

.mall-row-sub .time {
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}

.mall-row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--card-border, rgba(255, 255, 255, 0.08));
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
