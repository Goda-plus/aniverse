<template>
  <div class="project-detail">
    <!-- 项目头部信息 -->
    <div class="project-header">
      <div class="project-cover">
        <el-image
          :src="project.cover_image || '/placeholder.png'"
          :alt="project.title"
          class="cover-image"
          fit="cover"
        >
          <template #error>
            <div class="image-slot">
              <el-icon><Picture /></el-icon>
            </div>
          </template>
        </el-image>
      </div>

      <div class="project-info">
        <div class="project-status">
          <el-tag :type="statusType" size="large">
            {{ statusText }}
          </el-tag>
        </div>

        <h1 class="project-title">
          {{ project.title }}
        </h1>

        <div class="project-creator">
          <el-avatar :src="project.creator_avatar" size="small" />
          <span class="creator-name">{{ project.creator_name }}</span>
          <span class="creator-label">发起人</span>
        </div>

        <div class="project-stats">
          <div class="stat-item">
            <div class="stat-value">
              ￥{{ formatNumber(project.current_amount) }}
            </div>
            <div class="stat-label">
              已筹集
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ project.progress_percentage }}%
            </div>
            <div class="stat-label">
              达成率
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ project.backer_count }}
            </div>
            <div class="stat-label">
              支持者
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {{ project.days_remaining }}
            </div>
            <div class="stat-label">
              剩余天数
            </div>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: Math.min(project.progress_percentage, 100) + '%' }"
            />
          </div>
          <div class="progress-text">
            <span>目标: ￥{{ formatNumber(project.goal_amount) }}</span>
            <span v-if="project.progress_percentage >= 100" class="overfunded">
              已超募 ￥{{ formatNumber(project.current_amount - project.goal_amount) }}
            </span>
          </div>
        </div>

        <div class="project-actions">
          <el-button
            v-if="project.status === 'active' && !hasBacked"
            type="primary"
            size="large"
            @click="openSupportDialog"
          >
            <el-icon><Star /></el-icon>
            支持项目
          </el-button>

          <el-button
            v-if="hasBacked"
            type="success"
            size="large"
            disabled
          >
            <el-icon><Check /></el-icon>
            已支持
          </el-button>

          <el-button
            v-if="myProjectBacking && canBuyerRefundOnly(myProjectBacking)"
            type="warning"
            size="large"
            plain
            @click="openBuyerRefundDialogForProject"
          >
            申请退款
          </el-button>
          <el-button
            v-if="myProjectBacking && canBuyerRefundReturn(myProjectBacking)"
            type="warning"
            size="large"
            plain
            @click="openBuyerRefundDialogForProject"
          >
            申请退款退货
          </el-button>
          <el-tag
            v-if="myProjectBacking && buyerRefundCode(myProjectBacking) === 'refund'"
            type="warning"
            size="large"
            effect="plain"
          >
            退款申请处理中
          </el-tag>
          <el-tag
            v-if="myProjectBacking && buyerRefundCode(myProjectBacking) === 'refund_return'"
            type="warning"
            size="large"
            effect="plain"
          >
            退款退货申请处理中
          </el-tag>

          <el-button v-if="isCreator" type="success" size="large" @click="goCreatorOrders">
            <el-icon><List /></el-icon>
            回报订单
          </el-button>

          <el-button v-if="isCreator" type="warning" size="large" @click="editProject">
            <el-icon><Edit /></el-icon>
            编辑项目
          </el-button>

          <el-button :type="isFavorited ? 'warning' : 'info'" size="large" @click="toggleFavorite">
            <el-icon><Star /></el-icon>
            {{ isFavorited ? '已收藏' : '收藏项目' }}
          </el-button>

          <el-button type="info" size="large" @click="shareProject">
            <el-icon><Share /></el-icon>
            分享
          </el-button>

          <el-button
            v-if="userStore.isLoggedIn && !isCreator"
            type="danger"
            plain
            size="large"
            @click="openReportProject"
          >
            举报
          </el-button>
        </div>
      </div>
    </div>

    <!-- 项目内容 -->
    <div class="project-content">
      <el-row :gutter="24">
        <el-col :span="16">
          <!-- 项目详情 -->
          <el-card class="content-card" shadow="never">
            <template #header>
              <div class="card-title">
                项目详情
              </div>
            </template>
            <div class="project-description" v-html="formattedDescription" />
          </el-card>

          <!-- 支持档位 -->
          <el-card class="content-card" shadow="never">
            <template #header>
              <div class="card-title">
                支持档位
              </div>
            </template>
            <div class="tiers-grid">
              <div
                v-for="tier in tiers"
                :key="tier.id"
                class="tier-item"
                :class="{
                  disabled: isTierSoldOut(tier),
                  active: selectedTier && selectedTier.id === tier.id
                }"
                @click="selectTier(tier)"
              >
                <div class="tier-header">
                  <h3 class="tier-title">
                    {{ tier.title }}
                  </h3>
                  <div class="tier-price">
                    ￥{{ tier.amount }}
                  </div>
                </div>

                <div class="tier-content">
                  <p class="tier-description">
                    {{ tier.reward_description }}
                  </p>

                  <div class="tier-meta">
                    <span v-if="tier.estimated_delivery" class="delivery-info">
                      <el-icon><Clock /></el-icon>
                      预计 {{ tier.estimated_delivery }} 发货
                    </span>
                    <span v-if="tier.shipping_included" class="shipping-info">
                      <el-icon><Van /></el-icon>
                      包邮
                    </span>
                  </div>

                  <div v-if="tier.max_backers" class="backer-limit">
                    <span>限额: {{ tier.current_backers }}/{{ tier.max_backers }}</span>
                    <el-progress
                      :percentage="(tier.current_backers / tier.max_backers) * 100"
                      :show-text="false"
                      :stroke-width="4"
                    />
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 项目更新 -->
          <el-card class="content-card" shadow="never">
            <template #header>
              <div class="card-title">
                项目动态
                <el-button
                  v-if="isCreator"
                  type="primary"
                  size="small"
                  @click="showUpdateDialog = true"
                >
                  发布更新
                </el-button>
              </div>
            </template>
            <div v-if="updates.length === 0" class="no-updates">
              <el-empty description="暂无项目动态" />
            </div>
            <div v-else class="updates-list">
              <div
                v-for="update in updates"
                :key="update.id"
                class="update-item"
              >
                <div class="update-header">
                  <h4 class="update-title">
                    {{ update.title }}
                  </h4>
                  <span class="update-date">{{ formatDate(update.created_at) }}</span>
                </div>
                <div class="update-content" v-html="update.content" />
              </div>
            </div>
          </el-card>

          <!-- 评论区 -->
          <el-card class="content-card" shadow="never">
            <template #header>
              <div class="card-title">
                评论区 ({{ comments.length }})
              </div>
            </template>
            <div class="comments-section">
              <!-- 评论列表 -->
              <div class="comments-list">
                <div
                  v-for="comment in comments"
                  :key="comment.id"
                  class="comment-item"
                >
                  <div class="comment-avatar">
                    <el-avatar :src="comment.avatar" size="small" />
                  </div>
                  <div class="comment-content">
                    <div class="comment-info">
                      <span class="comment-author">{{ comment.username }}</span>
                      <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
                    </div>
                    <div class="comment-text">
                      {{ comment.content }}
                    </div>
                    <div class="comment-actions">
                      <el-button size="small" @click="replyToComment(comment)">
                        回复
                      </el-button>
                      <el-button
                        v-if="userStore.isLoggedIn && Number(comment.user_id) !== Number(userStore.user?.id)"
                        size="small"
                        link
                        type="danger"
                        @click="openReportCrowdfundingComment(comment)"
                      >
                        举报
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 评论输入框 -->
              <div class="comment-form">
                <el-input
                  v-model="newComment"
                  type="textarea"
                  :rows="3"
                  placeholder="写下你的评论..."
                  maxlength="500"
                  show-word-limit
                />
                <div class="comment-actions">
                  <el-button v-if="replyingTo" @click="cancelReply">
                    取消回复
                  </el-button>
                  <el-button type="primary" :loading="commentSubmitting" @click="submitComment">
                    {{ commentSubmitting ? '发表中...' : '发表评论' }}
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <!-- 项目信息卡片 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-title">
                项目信息
              </div>
            </template>
            <div class="project-meta">
              <div class="meta-item">
                <label>项目状态:</label>
                <span>{{ statusText }}</span>
              </div>
              <div class="meta-item">
                <label>开始时间:</label>
                <span>{{ formatDate(project.start_date) }}</span>
              </div>
              <div class="meta-item">
                <label>结束时间:</label>
                <span>{{ formatDate(project.end_date) }}</span>
              </div>
              <div class="meta-item">
                <label>项目分类:</label>
                <span>{{ project.category }}</span>
              </div>
              <div class="meta-item">
                <label>浏览次数:</label>
                <span>{{ project.views }}</span>
              </div>
            </div>
          </el-card>

          <!-- 风险提示 -->
          <el-card v-if="project.risk_description" class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-title">
                风险提示
              </div>
            </template>
            <div class="risk-description">
              {{ project.risk_description }}
            </div>
          </el-card>

          <!-- 支持者列表 -->
          <el-card class="sidebar-card" shadow="never">
            <template #header>
              <div class="card-title">
                最新支持者
              </div>
            </template>
            <div v-if="backers.length === 0" class="no-backers">
              <el-empty description="暂无支持者" />
            </div>
            <div v-else class="backers-list">
              <div
                v-for="backer in backers.slice(0, 10)"
                :key="backer.id"
                class="backer-item"
              >
                <el-avatar :src="backer.avatar" size="small" />
                <span class="backer-name">{{ backer.username }}</span>
                <span class="backer-amount">￥{{ backer.amount }}</span>
              </div>
              <div v-if="backers.length > 10" class="more-backers">
                <el-button size="small" @click="showAllBackers = true">
                  查看全部支持者 ({{ backers.length }})
                </el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 支持项目对话框 -->
    <el-dialog
      v-model="showSupportDialog"
      title="支持项目"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedTier">
        <div class="support-summary">
          <h3>{{ selectedTier.title }}</h3>
          <div class="support-amount">
            支持金额: ￥{{ selectedTier.amount }}
          </div>
          <div class="support-reward">
            <h4>回报内容:</h4>
            <p>{{ selectedTier.reward_description }}</p>
          </div>
          <div v-if="selectedTier.estimated_delivery" class="delivery-info">
            预计发货时间: {{ selectedTier.estimated_delivery }}
          </div>
          <div v-if="selectedTier.shipping_included" class="shipping-info">
            ✓ 包含运费
          </div>
        </div>

        <el-divider />

        <el-form :model="supportForm" label-width="120px">
          <el-form-item
            label="收货地址"
            :required="Boolean(selectedTier.shipping_included || selectedTier.estimated_delivery)"
          >
            <el-select
              v-model="supportForm.address_id"
              placeholder="选择收货地址"
              style="width: 100%"
              clearable
            >
              <el-option
                v-for="address in userAddresses"
                :key="address.address_id"
                :label="`${address.recipient_name} ${address.phone} ｜ ${address.province}${address.city}${address.district} ${address.detail_address}`"
                :value="address.address_id"
              />
            </el-select>
            <div
              v-if="!(selectedTier.shipping_included || selectedTier.estimated_delivery)"
              style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;"
            >
              此档位不强制填写；若有实体回报需寄送，可自愿选择或填写默认收货地址
            </div>
          </el-form-item>

          <el-form-item label="支持数量">
            <el-input-number
              v-model="supportForm.quantity"
              :min="1"
              :max="10"
              :precision="0"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="留言">
            <el-input
              v-model="supportForm.notes"
              type="textarea"
              :rows="3"
              placeholder="给项目发起人留言..."
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSupportDialog = false">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="supporting"
            @click="confirmSupport"
          >
            {{ supporting ? '支持中...' : `支持 ￥${supportTotal}` }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 发布更新对话框 -->
    <el-dialog
      v-model="showUpdateDialog"
      title="发布项目更新"
      width="600px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form :model="updateForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input
            v-model="updateForm.title"
            placeholder="更新标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="内容" required>
          <el-input
            v-model="updateForm.content"
            type="textarea"
            :rows="8"
            placeholder="更新内容..."
            maxlength="2000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="公开显示">
          <el-checkbox v-model="updateForm.is_public">
            公开显示此更新
          </el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showUpdateDialog = false">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="updateSubmitting"
            @click="submitUpdate"
          >
            {{ updateSubmitting ? '发布中...' : '发布更新' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <ReportDialog
      v-model="reportDialogVisible"
      :target-type="reportTargetType"
      :target-id="reportTargetId"
    />
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch, provide } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    Picture,
    Star,
    Check,
    Edit,
    List,
    Share,
    Clock,
    Van
  } from '@element-plus/icons-vue'
  import {
    getCrowdfundingProjectDetail,
    listCrowdfundingProjectUpdates,
    listCrowdfundingProjectComments,
    getCrowdfundingProjectBackers,
    backCrowdfundingProject,
    addCrowdfundingComment,
    createCrowdfundingUpdate,
    getMyCrowdfundingBackings,
    requestCrowdfundingBuyerRefund
  } from '@/axios/crowdfunding'
  import {
    buyerRefundCode,
    canBuyerRefundOnly,
    canBuyerRefundReturn
  } from '@/utils/crowdfundingBuyerRefund'
  import { listAddresses } from '@/axios/mall'
  import { useUserStore } from '@/stores/user'
  import ReportDialog from '@/components/ReportDialog.vue'

  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()

  const project = ref({})
  const reportDialogVisible = ref(false)
  const reportTargetType = ref('crowdfunding')
  const reportTargetId = ref(0)

  function openReportProject () {
    reportTargetType.value = 'crowdfunding'
    reportTargetId.value = Number(project.value.id) || 0
    reportDialogVisible.value = true
  }

  function openReportCrowdfundingComment (comment) {
    reportTargetType.value = 'crowdfunding_comment'
    reportTargetId.value = Number(comment.id) || 0
    reportDialogVisible.value = true
  }

  // 提供项目数据给父组件
  provide('projectData', project)
  const tiers = ref([])
  const updates = ref([])
  const comments = ref([])
  const backers = ref([])
  const userAddresses = ref([])

  const showSupportDialog = ref(false)
  const showUpdateDialog = ref(false)
  const showAllBackers = ref(false)

  const selectedTier = ref(null)
  const hasBacked = ref(false)
  const myProjectBacking = ref(null)
  const isFavorited = ref(false)
  const isCreator = ref(false)

  const newComment = ref('')
  const replyingTo = ref(null)
  const commentSubmitting = ref(false)

  const supporting = ref(false)
  const updateSubmitting = ref(false)

  const supportForm = ref({
    address_id: null,
    quantity: 1,
    notes: ''
  })

  // 支持总金额（统一 Number 化，避免字符串/空值导致的 ￥0/NaN）
  const supportTotal = computed(() => {
    if (!selectedTier.value) return 0
    const tierAmount = Number(selectedTier.value.amount || 0)
    const qty = Number(supportForm.value.quantity || 1)
    if (!Number.isFinite(tierAmount) || !Number.isFinite(qty) || qty < 1) return 0
    return tierAmount * qty
  })

  const updateForm = ref({
    title: '',
    content: '',
    is_public: true
  })

  // 计算属性
  const statusType = computed(() => {
    const statusMap = {
      'active': 'success',
      'successful': 'success',
      'failed': 'danger',
      'pending_review': 'warning',
      'draft': 'info',
      'cancelled': 'info',
      'paused': 'warning'
    }
    return statusMap[project.value.status] || 'info'
  })

  const statusText = computed(() => {
    const statusMap = {
      'active': '众筹中',
      'successful': '已成功',
      'failed': '已失败',
      'pending_review': '审核中',
      'draft': '草稿',
      'cancelled': '已取消',
      'paused': '已暂停'
    }
    return statusMap[project.value.status] || '未知状态'
  })

  // 加载项目数据
  async function loadProjectData () {
    try {
      const projectId = route.params.id

      // 检查项目ID是否存在
      if (!projectId || projectId === 'undefined') {
        console.error('项目ID不存在或无效:', projectId)
        ElMessage.error('项目ID无效')
        router.push('/crowdfunding')
        return
      }

      // 并行加载数据
      const [
        projectRes,
        updatesRes,
        commentsRes,
        backersRes
      ] = await Promise.all([
        getCrowdfundingProjectDetail(projectId),
        listCrowdfundingProjectUpdates(projectId),
        listCrowdfundingProjectComments(projectId),
        getCrowdfundingProjectBackers(projectId)
      ])

      // axios 实例在响应拦截器里已 `return res.data`，这里拿到的是后端返回体
      if (projectRes.success) {
        project.value = projectRes.data.project
        tiers.value = projectRes.data.tiers

        await syncMyProjectBacking(projectId)

        // 检查是否为创建者
        isCreator.value = project.value.creator_id === userStore.user?.id

        // 检查是否已收藏
        isFavorited.value = await checkIfFavorited(projectId)
      }

      if (updatesRes.success) {
        updates.value = updatesRes.data.list
      }

      if (commentsRes.success) {
        comments.value = commentsRes.data.list
      }

      if (backersRes.success) {
        backers.value = backersRes.data.list
      }
    } catch (error) {
      console.error('加载项目数据失败:', error)
      ElMessage.error('加载项目数据失败')
    }
  }

  // 监听路由变化
  watch(() => route.params.id, (newId, oldId) => {
    console.log('路由参数变化:', { newId, oldId, fullParams: route.params, fullRoute: route })
    if (newId && newId !== 'undefined') {
      loadProjectData()
    } else if (newId === 'undefined' || !newId) {
      console.error('检测到无效的项目ID:', newId)
      ElMessage.error('项目ID无效')
      router.push('/crowdfunding')
    }
  }, { immediate: true })

  const syncMyProjectBacking = async (projectId) => {
    myProjectBacking.value = null
    hasBacked.value = false
    if (!userStore.isLoggedIn || !projectId) return
    try {
      const response = await getMyCrowdfundingBackings({ page: 1, pageSize: 200 })
      const pid = parseInt(projectId, 10)
      const list = response.data?.list || []
      const found = list.find(b => b.project_id === pid)
      if (found) {
        myProjectBacking.value = found
        hasBacked.value = true
      }
    } catch {
      myProjectBacking.value = null
      hasBacked.value = false
    }
  }

  const openBuyerRefundDialogForProject = async () => {
    const b = myProjectBacking.value
    if (!b) return
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
        await syncMyProjectBacking(project.value.id)
      } else {
        ElMessage.error(res.message || '提交失败')
      }
    } catch (error) {
      if (error === 'cancel') return
      ElMessage.error(error.response?.data?.message || error.message || '提交失败')
    }
  }

  // 检查是否已收藏
  const checkIfFavorited = async (projectId) => {
    // 这里可以实现收藏检查逻辑
    return false
  }

  // 打开支持对话框（必须先选档位）
  const openSupportDialog = () => {
    if (!selectedTier.value) {
      ElMessage.warning('请先在下方选择一个支持档位')
      // 尝试滚动到档位区域，提升可发现性
      const el = document.querySelector('.tiers-grid')
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }
    showSupportDialog.value = true
  }

  // 选择支持档位
  const selectTier = (tier) => {
    if (isTierSoldOut(tier)) return
    selectedTier.value = tier
    showSupportDialog.value = true
  }

  const isTierSoldOut = (tier) => {
    const max = tier?.max_backers
    const current = Number(tier?.current_backers || 0)
    // max_backers 为 null/undefined/<=0 表示不限量
    if (max === null || max === undefined) return false
    const maxNum = Number(max)
    if (!Number.isFinite(maxNum) || maxNum <= 0) return false
    return current >= maxNum
  }

  // 确认支持
  const confirmSupport = async () => {
    if (!selectedTier.value) return
    if (!Number.isFinite(supportTotal.value) || supportTotal.value <= 0) {
      ElMessage.error('该档位支持金额无效')
      return
    }

    const needShippingAddress = Boolean(
      selectedTier.value.shipping_included || selectedTier.value.estimated_delivery
    )

    if (needShippingAddress && !supportForm.value.address_id) {
      ElMessage.error('请选择收货地址')
      return
    }

    supporting.value = true

    try {
      const shippingAddressPayload = supportForm.value.address_id
        ? userAddresses.value.find(addr => addr.address_id === supportForm.value.address_id)
        : null

      const response = await backCrowdfundingProject({
        project_id: project.value.id,
        tier_id: selectedTier.value.id,
        quantity: supportForm.value.quantity,
        shipping_address: shippingAddressPayload,
        notes: supportForm.value.notes
      })

      if (response.success) {
        ElMessage.success('支持成功！')
        showSupportDialog.value = false
        await syncMyProjectBacking(project.value.id)
        // 重新加载项目数据
        loadProjectData()
      } else {
        ElMessage.error(response.message || '支持失败')
      }
    } catch (error) {
      console.error('支持项目失败:', error)
      ElMessage.error('支持失败，请重试')
    } finally {
      supporting.value = false
    }
  }

  // 提交评论
  const submitComment = async () => {
    if (!newComment.value.trim()) {
      ElMessage.error('请输入评论内容')
      return
    }

    commentSubmitting.value = true

    try {
      const response = await addCrowdfundingComment({
        project_id: project.value.id,
        content: newComment.value,
        parent_id: replyingTo.value?.id
      })

      if (response.success) {
        ElMessage.success('评论成功')
        newComment.value = ''
        replyingTo.value = null
        // 重新加载评论
        loadComments()
      } else {
        ElMessage.error(response.message || '评论失败')
      }
    } catch (error) {
      console.error('提交评论失败:', error)
      ElMessage.error('评论失败，请重试')
    } finally {
      commentSubmitting.value = false
    }
  }

  // 回复评论
  const replyToComment = (comment) => {
    replyingTo.value = comment
    newComment.value = `@${comment.username} `
  }

  // 取消回复
  const cancelReply = () => {
    replyingTo.value = null
    newComment.value = ''
  }

  // 发布更新
  const submitUpdate = async () => {
    if (!updateForm.value.title.trim() || !updateForm.value.content.trim()) {
      ElMessage.error('请输入标题和内容')
      return
    }

    updateSubmitting.value = true

    try {
      const response = await createCrowdfundingUpdate({
        project_id: project.value.id,
        ...updateForm.value
      })

      if (response.success) {
        ElMessage.success('更新发布成功')
        showUpdateDialog.value = false
        updateForm.value = { title: '', content: '', is_public: true }
        // 重新加载更新
        loadUpdates()
      } else {
        ElMessage.error(response.message || '发布失败')
      }
    } catch (error) {
      console.error('发布更新失败:', error)
      ElMessage.error('发布失败，请重试')
    } finally {
      updateSubmitting.value = false
    }
  }

  // 加载评论
  const loadComments = async () => {
    try {
      const response = await listCrowdfundingProjectComments(project.value.id)
      if (response.success) {
        comments.value = response.data.list
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }

  // 加载更新
  const loadUpdates = async () => {
    try {
      const response = await listCrowdfundingProjectUpdates(project.value.id)
      if (response.success) {
        updates.value = response.data.list
      }
    } catch (error) {
      console.error('加载更新失败:', error)
    }
  }

  // 发起人：回报订单管理
  const goCreatorOrders = () => {
    router.push({
      name: 'crowdfunding-creator-orders',
      query: { projectId: String(project.value.id) }
    })
  }

  // 编辑项目
  const editProject = () => {
    router.push(`/crowdfunding/edit/${project.value.id}`)
  }

  // 切换收藏
  const toggleFavorite = () => {
    // 实现收藏逻辑
    isFavorited.value = !isFavorited.value
    ElMessage.success(isFavorited.value ? '已收藏' : '已取消收藏')
  }

  // 分享项目
  const shareProject = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      ElMessage.success('链接已复制到剪贴板')
    })
  }

  // 工具函数
  const formatNumber = (num) => {
    if (num === undefined || num === null || num === '') return '0'
    const n = typeof num === 'number' ? num : Number(num)
    if (!Number.isFinite(n)) return '0'
    if (n >= 10000) return (n / 10000).toFixed(1) + '万'
    return String(n)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('zh-CN')
  }

  const formattedDescription = computed(() => {
    return project.value.description?.replace(/\n/g, '<br>') || ''
  })

  // 加载用户地址
  const loadUserAddresses = async () => {
    if (!userStore.isLoggedIn) return
    try {
      // 复用商城地址接口：返回结构为 { code, data }
      const response = await listAddresses()
      if (response?.code === 200) {
        userAddresses.value = response.data || []

        // 自动选中默认地址（或第一个），提升可用性
        if (!supportForm.value.address_id && userAddresses.value.length > 0) {
          const defaultAddr = userAddresses.value.find(a => a.is_default === 1 || a.is_default === true)
          supportForm.value.address_id = (defaultAddr || userAddresses.value[0]).address_id
        }
      } else {
        userAddresses.value = []
      }
    } catch (error) {
      console.error('加载地址失败:', error)
      userAddresses.value = []
    }
  }

  onMounted(() => {
    loadUserAddresses()
  })
</script>

<style scoped>
.project-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.project-header {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  box-shadow: var(--shadow-soft);
}

.project-cover {
  flex-shrink: 0;
}

.cover-image {
  width: 300px;
  height: 225px;
  border-radius: 8px;
}

.image-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 24px;
}

.project-info {
  flex: 1;
}

.project-status {
  margin-bottom: 12px;
}

.project-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text-primary);
  line-height: 1.3;
}

.project-creator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.creator-name {
  font-weight: 500;
  color: var(--text-primary);
}

.creator-label {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
}

.project-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.progress-section {
  margin-bottom: 24px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-blue), var(--primary));
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--text-secondary);
}

.overfunded {
  color: #E6A23C;
  font-weight: 500;
}

.project-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.project-content {
  margin-top: 24px;
}

.content-card {
  margin-bottom: 24px;
}

.sidebar-card {
  margin-bottom: 16px;
}

.card-title {
  font-weight: 600;
  color: var(--text-primary);
}

.project-description {
  line-height: 1.8;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.tiers-grid {
  display: grid;
  gap: 16px;
}

.tier-item {
  border: 2px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tier-item:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-soft);
}

.tier-item.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.4);
  background: linear-gradient(
    135deg,
    rgba(64, 158, 255, 0.08),
    rgba(64, 158, 255, 0.02)
  );
}

.tier-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tier-item.disabled:hover {
  border-color: var(--border-color);
  box-shadow: none;
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tier-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.tier-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary);
}

.tier-content {
  color: var(--text-secondary);
}

.tier-description {
  margin-bottom: 12px;
  line-height: 1.5;
}

.tier-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

.delivery-info,
.shipping-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.backer-limit {
  font-size: 14px;
  color: var(--text-secondary);
}

.no-updates {
  text-align: center;
  padding: 40px 0;
}

.updates-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.update-item {
  padding: 20px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 8px;
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.update-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.update-date {
  font-size: 14px;
  color: var(--text-secondary);
}

.update-content {
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.comments-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 500;
  color: var(--text-primary);
}

.comment-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.comment-text {
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.comment-actions {
  display: flex;
  gap: 8px;
}

.comment-form {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 8px;
  padding: 16px;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-item label {
  font-weight: 500;
  color: var(--text-secondary);
}

.meta-item span {
  color: var(--text-primary);
}

.risk-description {
  line-height: 1.6;
  color: var(--muted);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 12px;
  border-radius: 6px;
  border-left: 4px solid var(--muted);
}

.no-backers {
  text-align: center;
  padding: 20px 0;
}

.backers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.backer-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.backer-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-secondary);
}

.backer-amount {
  font-weight: 500;
  color: var(--primary);
}

.more-backers {
  text-align: center;
  margin-top: 12px;
}

.support-summary {
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  margin-bottom: 20px;
}

.support-summary h3 {
  margin: 0 0 12px 0;
  color: var(--text-primary);
}

.support-amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 16px;
}

.support-reward {
  margin-bottom: 12px;
}

.support-reward h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.support-reward p {
  margin: 0;
  line-height: 1.5;
  color: var(--text-secondary);
}

.delivery-info,
.shipping-info {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
/* 覆盖 Element Plus 默认的按钮间距 - 使用深度选择器 */
.project-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
/* 响应式设计 */
@media (max-width: 768px) {
  .project-header {
    flex-direction: column;
    gap: 16px;
  }

  .cover-image {
    width: 100%;
    height: 200px;
  }

  .project-title {
    font-size: 24px;
  }

  .project-stats {
    flex-wrap: wrap;
    gap: 16px;
  }

  .stat-value {
    font-size: 20px;
  }

  .project-actions {
    flex-direction: column;
  }

  .project-actions .el-button {
    width: 100%;
  }
}
</style>
