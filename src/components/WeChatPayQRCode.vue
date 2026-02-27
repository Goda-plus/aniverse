<template>
  <div class="wechat-pay-qrcode">
    <el-dialog
      v-model="visible"
      title="微信扫码支付"
      width="420px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="!isPaying"
      @close="handleClose"
    >
      <div class="pay-content">
        <!-- 支付金额 -->
        <div class="pay-amount">
          <span class="amount-label">支付金额</span>
          <span class="amount-value">￥{{ amount.toFixed(2) }}</span>
        </div>

        <!-- 二维码区域 -->
        <div class="qrcode-container">
          <div v-if="loading" class="qrcode-loading">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            <p>正在生成支付二维码...</p>
          </div>
          
          <div v-else-if="qrCodeUrl" class="qrcode-wrapper">
            <div class="qrcode-box" @click="handleQRCodeClick">
              <img :src="qrCodeUrl" alt="微信支付二维码" class="qrcode-image">
              <div v-if="isPaying && !isScanned" class="qrcode-overlay">
                <el-icon class="scan-icon">
                  <Search />
                </el-icon>
                <p>请使用微信扫码支付</p>
                <p class="scan-hint">
                  （点击二维码可模拟扫描）
                </p>
              </div>
              <div v-else-if="isPaying && isScanned" class="qrcode-overlay processing">
                <el-icon class="scan-icon is-loading">
                  <Loading />
                </el-icon>
                <p>支付处理中...</p>
              </div>
            </div>
            <p class="qrcode-tip">
              请使用微信扫描上方二维码完成支付
            </p>
            <div v-if="countdown > 0" class="countdown">
              二维码有效期：<span class="countdown-time">{{ formatTime(countdown) }}</span>
            </div>
          </div>

          <!-- 支付成功 -->
          <div v-else-if="payStatus === 'success'" class="pay-result success">
            <el-icon class="result-icon">
              <CircleCheck />
            </el-icon>
            <p class="result-title">
              支付成功
            </p>
            <p class="result-desc">
              订单已支付完成，请稍候...
            </p>
          </div>

          <!-- 支付失败 -->
          <div v-else-if="payStatus === 'failed'" class="pay-result failed">
            <el-icon class="result-icon">
              <CircleClose />
            </el-icon>
            <p class="result-title">
              支付失败
            </p>
            <p class="result-desc">
              {{ errorMessage || '支付过程中出现错误，请重试' }}
            </p>
          </div>

          <!-- 支付超时 -->
          <div v-else-if="payStatus === 'timeout'" class="pay-result timeout">
            <el-icon class="result-icon">
              <Clock />
            </el-icon>
            <p class="result-title">
              支付超时
            </p>
            <p class="result-desc">
              二维码已过期，请刷新后重新支付
            </p>
          </div>
        </div>

        <!-- 订单信息 -->
        <div v-if="orderNo" class="order-info">
          <p>订单号：{{ orderNo }}</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button
            v-if="payStatus === 'failed' || payStatus === 'timeout'"
            type="primary"
            @click="handleRetry"
          >
            重新支付
          </el-button>
          <el-button
            v-if="payStatus === 'success'"
            type="primary"
            @click="handleConfirm"
          >
            确定
          </el-button>
          <el-button
            v-if="!isPaying && payStatus !== 'success'"
            @click="handleClose"
          >
            取消支付
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Loading, Search, CircleCheck, CircleClose, Clock } from '@element-plus/icons-vue'
  import QRCode from 'qrcode'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      required: true
    },
    orderNo: {
      type: String,
      default: ''
    },
    // 支付成功回调前的延迟时间（毫秒），用于模拟支付处理时间
    successDelay: {
      type: Number,
      default: 2000
    },
    // 二维码有效期（秒）
    qrcodeExpire: {
      type: Number,
      default: 300
    },
    // 支付状态检查API（可选，如果提供则使用真实API，否则使用模拟）
    checkPaymentStatusApi: {
      type: Function,
      default: null
    }
  })

  const emit = defineEmits(['update:modelValue', 'success', 'cancel', 'failed'])

  const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const loading = ref(false)
  const qrCodeUrl = ref('')
  const isPaying = ref(false)
  const payStatus = ref('') // 'success' | 'failed' | 'timeout' | ''
  const errorMessage = ref('')
  const countdown = ref(0)
  const countdownTimer = ref(null)
  const payCheckTimer = ref(null)
  const payPollingTimer = ref(null)
  const isScanned = ref(false) // 是否已扫描
  const scanTime = ref(null) // 扫描时间

  // 格式化倒计时时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 生成二维码
  const generateQRCode = async () => {
    loading.value = true
    qrCodeUrl.value = ''
    payStatus.value = ''
    errorMessage.value = ''
    countdown.value = props.qrcodeExpire

    try {
      // 模拟生成支付链接（实际项目中应该调用后端API获取真实的支付链接）
      const paymentUrl = `weixin://wxpay/bizpayurl?pr=${props.orderNo || Date.now()}`
    
      // 生成二维码
      const url = await QRCode.toDataURL(paymentUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    
      qrCodeUrl.value = url
      isPaying.value = true
      loading.value = false

      // 开始倒计时
      startCountdown()

      // 开始支付状态轮询检查（实际项目中应该通过WebSocket或轮询检查支付状态）
      startPaymentPolling()
    } catch (error) {
      console.error('生成二维码失败:', error)
      ElMessage.error('生成支付二维码失败，请重试')
      loading.value = false
      payStatus.value = 'failed'
      errorMessage.value = '生成二维码失败'
    }
  }

  // 开始倒计时
  const startCountdown = () => {
    if (countdownTimer.value) {
      clearInterval(countdownTimer.value)
    }

    countdownTimer.value = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
        handleTimeout()
      }
    }, 1000)
  }

  // 开始支付状态轮询检查
  const startPaymentPolling = () => {
    // 清除之前的定时器
    if (payPollingTimer.value) {
      clearInterval(payPollingTimer.value)
    }
    if (payCheckTimer.value) {
      clearTimeout(payCheckTimer.value)
    }

    // 重置扫描状态
    isScanned.value = false
    scanTime.value = null

    // 模拟：监听二维码扫描事件
    // 在实际项目中，这里应该通过后端API轮询或WebSocket来检测支付状态
    // 为了演示，我们模拟一个"扫描检测"机制
    // 当用户"扫描"二维码后（这里用点击二维码来模拟），立即检测到并显示支付成功
  
    // 轮询检查支付状态（每1秒检查一次）
    let checkCount = 0
    payPollingTimer.value = setInterval(async () => {
      checkCount++
    
      // 如果提供了真实的支付状态检查API，使用API检查
      if (props.checkPaymentStatusApi && typeof props.checkPaymentStatusApi === 'function') {
        try {
          const status = await props.checkPaymentStatusApi(props.orderNo)
          if (status === 'paid' || status === 'success') {
            clearInterval(payPollingTimer.value)
            payPollingTimer.value = null
            handlePaymentSuccess()
            return
          } else if (status === 'failed') {
            clearInterval(payPollingTimer.value)
            payPollingTimer.value = null
            handlePaymentFailed('支付失败，请重试')
            return
          }
        } catch (error) {
          console.error('检查支付状态失败:', error)
        // 继续轮询，不中断
        }
      } else {
        // 模拟模式：如果已扫描，立即显示支付成功
        if (isScanned.value && scanTime.value) {
          const timeSinceScan = Date.now() - scanTime.value
          // 扫描后立即显示支付成功（可以设置一个很短的延迟，比如500ms，模拟支付处理）
          if (timeSinceScan >= 500) {
            clearInterval(payPollingTimer.value)
            payPollingTimer.value = null
            handlePaymentSuccess()
            return
          }
        }
      }
    }, 1000) // 每1秒检查一次
  }

  // 模拟扫描事件（实际项目中应该由支付系统回调触发）
  const simulateScan = () => {
    if (!isScanned.value && isPaying.value) {
      isScanned.value = true
      scanTime.value = Date.now()
      console.log('检测到二维码已被扫描')
    }
  }

  // 监听二维码点击事件（用于模拟扫描）
  const handleQRCodeClick = () => {
    if (isPaying.value && !isScanned.value) {
      isScanned.value = true
      scanTime.value = Date.now()
      console.log('模拟：二维码已被扫描')
    }
  }

  // 处理支付成功
  const handlePaymentSuccess = () => {
    clearTimers()
    isPaying.value = false
    qrCodeUrl.value = ''
    payStatus.value = 'success'

    // 延迟后触发成功回调
    setTimeout(() => {
      emit('success', {
        orderNo: props.orderNo,
        amount: props.amount
      })
    }, props.successDelay)
  }

  // 处理支付失败
  const handlePaymentFailed = (message = '支付失败') => {
    clearTimers()
    isPaying.value = false
    payStatus.value = 'failed'
    errorMessage.value = message
    emit('failed', {
      orderNo: props.orderNo,
      amount: props.amount,
      message
    })
  }

  // 处理支付超时
  const handleTimeout = () => {
    clearTimers()
    isPaying.value = false
    payStatus.value = 'timeout'
    emit('failed', {
      orderNo: props.orderNo,
      amount: props.amount,
      message: '支付超时'
    })
  }

  // 清除所有定时器
  const clearTimers = () => {
    if (countdownTimer.value) {
      clearInterval(countdownTimer.value)
      countdownTimer.value = null
    }
    if (payCheckTimer.value) {
      clearTimeout(payCheckTimer.value)
      payCheckTimer.value = null
    }
    if (payPollingTimer.value) {
      clearInterval(payPollingTimer.value)
      payPollingTimer.value = null
    }
  }

  // 重新支付
  const handleRetry = () => {
    generateQRCode()
  }

  // 确认（支付成功后）
  const handleConfirm = () => {
    visible.value = false
    resetState()
  }

  // 关闭对话框
  const handleClose = () => {
    if (isPaying.value) {
      ElMessage.warning('支付进行中，无法关闭')
      return
    }
    visible.value = false
    emit('cancel')
    resetState()
  }

  // 重置状态
  const resetState = () => {
    clearTimers()
    loading.value = false
    qrCodeUrl.value = ''
    isPaying.value = false
    payStatus.value = ''
    errorMessage.value = ''
    countdown.value = 0
    isScanned.value = false
    scanTime.value = null
  }

  // 监听对话框显示状态
  watch(visible, (newVal) => {
    if (newVal) {
      generateQRCode()
    } else {
      resetState()
    }
  })

  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearTimers()
  })
</script>

<style scoped>
.wechat-pay-qrcode {
  --pay-primary-color: #07c160;
  --pay-success-color: #67c23a;
  --pay-danger-color: #f56c6c;
  --pay-warning-color: #e6a23c;
}

.pay-content {
  padding: 10px 0;
}

.pay-amount {
  text-align: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--el-border-color-light);
  margin-bottom: 20px;
}

.amount-label {
  display: block;
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.amount-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--pay-primary-color);
}

.qrcode-container {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
}

.qrcode-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--el-text-color-regular);
}

.qrcode-loading .el-icon {
  font-size: 48px;
  color: var(--pay-primary-color);
}

.qrcode-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qrcode-box {
  position: relative;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-image {
  width: 250px;
  height: 250px;
  display: block;
}

.qrcode-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border-radius: 8px;
  animation: pulse 2s ease-in-out infinite;
}

.qrcode-overlay .scan-icon {
  font-size: 48px;
  color: var(--pay-primary-color);
}

.qrcode-overlay p {
  margin: 0;
  font-size: 16px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.qrcode-overlay .scan-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 400;
  margin-top: 8px;
}

.qrcode-overlay.processing {
  background: rgba(7, 193, 96, 0.1);
}

.qrcode-overlay.processing .scan-icon {
  color: var(--pay-primary-color);
}

.qrcode-box {
  cursor: pointer;
  transition: transform 0.2s;
}

.qrcode-box:hover {
  transform: scale(1.02);
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.95;
  }
  50% {
    opacity: 0.85;
  }
}

.qrcode-tip {
  font-size: 14px;
  color: var(--el-text-color-regular);
  text-align: center;
  margin: 0;
}

.countdown {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.countdown-time {
  color: var(--pay-warning-color);
  font-weight: 600;
}

.pay-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
}

.result-icon {
  font-size: 64px;
}

.pay-result.success .result-icon {
  color: var(--pay-success-color);
}

.pay-result.failed .result-icon {
  color: var(--pay-danger-color);
}

.pay-result.timeout .result-icon {
  color: var(--pay-warning-color);
}

.result-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.result-desc {
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin: 0;
  text-align: center;
}

.order-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-light);
  text-align: center;
}

.order-info p {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .qrcode-box {
    background: var(--bg-secondary);
  }
  
  .qrcode-overlay {
    background: rgba(0, 0, 0, 0.8);
  }
}
</style>














