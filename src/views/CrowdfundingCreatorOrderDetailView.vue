<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="backing-detail-page">
        <el-button
          link
          type="primary"
          class="back-button"
          @click="goBack"
        >
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>

        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="6" animated />
        </div>

        <div v-else-if="backing" class="backing-detail">
          <el-alert
            v-if="buyerRefundAlertText"
            type="warning"
            :closable="false"
            show-icon
            class="buyer-refund-alert"
            :title="buyerRefundAlertText"
          />
          <div class="status-card">
            <div class="status-info">
              <el-icon class="status-icon" :class="statusIconClass">
                <component :is="statusIcon" />
              </el-icon>
              <div class="status-text">
                <div class="status-label">
                  {{ getShippingLabel(normalizeShipping(backing.shipping_status)) }}
                </div>
                <div class="status-desc">
                  {{ getShippingDesc(normalizeShipping(backing.shipping_status)) }}
                </div>
              </div>
            </div>
            <div class="status-actions">
              <template v-if="normalizeShipping(backing.shipping_status) === 'pending'">
                <el-button type="primary" @click="handleUpdate('shipped')">
                  确认发货
                </el-button>
                <el-button type="warning" @click="handleUpdate('refunded')">
                  退款处理
                </el-button>
              </template>
              <template v-else-if="['shipped', 'delivered'].includes(normalizeShipping(backing.shipping_status))">
                <el-button type="primary" @click="handleUpdate('completed')">
                  确认完成
                </el-button>
                <el-button type="warning" @click="handleUpdate('refunded')">
                  退款处理
                </el-button>
              </template>
              <el-button @click="contactBacker">
                联系支持者
              </el-button>
            </div>
          </div>

          <div class="info-card">
            <h3 class="card-title">
              支持信息
            </h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">支持单号</span>
                <span class="info-value">#{{ backing.id }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">项目</span>
                <span class="info-value">{{ backing.project_title }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">档位</span>
                <span class="info-value">{{ backing.tier_title }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">支持者</span>
                <span class="info-value">{{ backing.username }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">金额</span>
                <span class="info-value amount">￥{{ backing.amount }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">数量</span>
                <span class="info-value">{{ backing.quantity }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">支持时间</span>
                <span class="info-value">{{ formatDate(backing.created_at) }}</span>
              </div>
              <div v-if="backing.payment_time" class="info-item">
                <span class="info-label">支付时间</span>
                <span class="info-value">{{ formatDate(backing.payment_time) }}</span>
              </div>
            </div>
          </div>

          <div v-if="backing.reward_description" class="info-card">
            <h3 class="card-title">
              档位说明
            </h3>
            <p class="reward-text">
              {{ backing.reward_description }}
            </p>
          </div>

          <div v-if="addrLines.length" class="info-card">
            <h3 class="card-title">
              收货信息
            </h3>
            <el-descriptions :column="1" border>
              <el-descriptions-item
                v-for="(line, idx) in addrLines"
                :key="idx"
                :label="line.label"
              >
                {{ line.value }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>

        <div v-else class="error-container">
          <el-result
            icon="error"
            title="记录不存在"
            sub-title="该支持订单不存在或您无权限查看"
          >
            <template #extra>
              <el-button type="primary" @click="goBack">
                返回列表
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
  import {
    getCrowdfundingCreatorBackingDetail,
    updateCrowdfundingCreatorBackingShipping
  } from '@/axios/crowdfunding'
  import { createRoom } from '@/axios/chat'

  const route = useRoute()
  const router = useRouter()

  const projectId = computed(() => {
    const q = route.query.projectId
    if (q === undefined || q === null || q === '') return null
    const n = Number(q)
    return Number.isFinite(n) ? n : null
  })

  const backing = ref(null)
  const loading = ref(false)

  const normalizeShipping = (s) => {
    if (s == null || s === '') return 'pending'
    const t = String(s).trim()
    if (t === 'not_shipped' || t === 'NOT_SHIPPED') return 'pending'
    return t
  }

  const buyerRefundAlertText = computed(() => {
    const b = backing.value
    if (!b) return ''
    const r = b.buyer_refund_request
    if (r == null || r === '' || r === 'none') return ''
    const time = b.buyer_refund_requested_at ? formatDate(b.buyer_refund_requested_at) : ''
    const reason = b.buyer_refund_reason ? `说明：${b.buyer_refund_reason}` : ''
    if (r === 'refund') {
      return `买家已发起「退款」申请${time ? `（${time}）` : ''}${reason ? `。${reason}` : ''}`
    }
    if (r === 'refund_return') {
      return `买家已发起「退款退货」申请${time ? `（${time}）` : ''}${reason ? `。${reason}` : ''}`
    }
    return ''
  })

  const addrLines = computed(() => {
    const raw = backing.value?.shipping_address_parsed
    if (!raw || typeof raw !== 'object') return []
    const labels = {
      recipient_name: '收货人',
      phone: '电话',
      province: '省',
      city: '市',
      district: '区',
      detail_address: '详细地址',
      postal_code: '邮编'
    }
    const lines = []
    for (const [k, label] of Object.entries(labels)) {
      if (raw[k] != null && raw[k] !== '') {
        lines.push({ label, value: String(raw[k]) })
      }
    }
    if (lines.length === 0) {
      try {
        lines.push({ label: '内容', value: JSON.stringify(raw) })
      } catch {
        lines.push({ label: '内容', value: String(raw) })
      }
    }
    return lines
  })

  const statusIcon = computed(() => {
    const s = normalizeShipping(backing.value?.shipping_status)
    const iconMap = {
      pending: Clock,
      shipped: Box,
      delivered: Box,
      completed: CircleCheck,
      refunded: Close
    }
    return iconMap[s] || Clock
  })

  const statusIconClass = computed(() => {
    const s = normalizeShipping(backing.value?.shipping_status)
    const classMap = {
      pending: 'status-warning',
      shipped: 'status-primary',
      delivered: 'status-primary',
      completed: 'status-success',
      refunded: 'status-error'
    }
    return classMap[s] || ''
  })

  const getShippingLabel = (s) => {
    const labelMap = {
      pending: '待发货',
      shipped: '已发货',
      delivered: '已送达',
      completed: '已完成',
      refunded: '已退款'
    }
    return labelMap[s] || s
  }

  const getShippingDesc = (s) => {
    const descMap = {
      pending: '请尽快履行档位承诺并发货',
      shipped: '回报已发出，确认完成后可结案',
      delivered: '回报已送达，确认完成后可结案',
      completed: '该支持订单已完结',
      refunded: '已处理退款'
    }
    return descMap[s] || ''
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const fetchDetail = async () => {
    loading.value = true
    try {
      const response = await getCrowdfundingCreatorBackingDetail(route.params.id)
      if (response.success && response.code === 200) {
        backing.value = response.data?.backing || null
      } else {
        backing.value = null
        ElMessage.error(response.message || '获取详情失败')
      }
    } catch (error) {
      backing.value = null
      ElMessage.error(error.response?.data?.message || '获取详情失败')
    } finally {
      loading.value = false
    }
  }

  const getConfirmTitle = (next) => {
    const map = {
      shipped: '确认已发货？',
      completed: '确认支持者已收到回报？',
      refunded: '确认已处理退款？'
    }
    return map[next] || '确认操作？'
  }

  const handleUpdate = async (nextStatus) => {
    try {
      await ElMessageBox.confirm(getConfirmTitle(nextStatus), '提示', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await updateCrowdfundingCreatorBackingShipping(backing.value.id, { shipping_status: nextStatus })
      ElMessage.success('操作成功')
      fetchDetail()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '操作失败')
      }
    }
  }

  const goBack = () => {
    router.push({
      name: 'crowdfunding-creator-orders',
      query: projectId.value ? { projectId: String(projectId.value) } : {}
    })
  }

  const contactBacker = async () => {
    const uid = Number(backing.value?.user_id)
    const pid = Number(backing.value?.project_id)
    if (!Number.isFinite(uid) || uid <= 0) {
      ElMessage.warning('缺少支持者信息')
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

  onMounted(() => {
    fetchDetail()
  })
</script>

<style scoped>
  .backing-detail-page {
    padding: 20px 24px;
    min-height: 100vh;
    max-width: 1200px;
    margin: 0 auto;
  }

  .back-button {
    margin-bottom: 20px;
  }

  .loading-container {
    padding: 40px 0;
  }

  .backing-detail {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .buyer-refund-alert {
    margin-bottom: 0;
  }

  .status-card,
  .info-card {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .status-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .status-info {
    display: flex;
    align-items: center;
    gap: 16px;
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
  .status-icon.status-error {
    color: var(--el-color-danger);
  }

  .status-label {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .status-desc {
    font-size: 14px;
    color: var(--el-text-color-regular);
    margin-top: 4px;
  }

  .status-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .card-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 16px;
    color: var(--text-primary);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .info-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .info-value {
    color: var(--text-primary);
  }

  .info-value.amount {
    font-weight: 600;
    color: var(--el-color-danger);
  }

  .reward-text {
    margin: 0;
    line-height: 1.6;
    color: var(--el-text-color-regular);
    white-space: pre-wrap;
  }

  .error-container {
    padding: 48px 0;
  }
</style>
