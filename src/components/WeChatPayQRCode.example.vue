<template>
  <div class="example-page">
    <h2>微信扫码支付组件使用示例</h2>
    
    <el-card class="example-card">
      <template #header>
        <span>基础用法</span>
      </template>
      
      <div class="example-content">
        <el-form :model="form" label-width="100px">
          <el-form-item label="支付金额">
            <el-input-number
              v-model="form.amount"
              :min="0.01"
              :precision="2"
              :step="0.01"
            />
          </el-form-item>
          
          <el-form-item label="订单号">
            <el-input v-model="form.orderNo" placeholder="请输入订单号" />
          </el-form-item>
          
          <el-form-item>
            <el-button type="primary" @click="showPayDialog = true">
              打开支付对话框
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 微信支付二维码组件 -->
    <WeChatPayQRCode
      v-model="showPayDialog"
      :amount="form.amount"
      :order-no="form.orderNo"
      :success-delay="2000"
      :qrcode-expire="300"
      @success="handlePaySuccess"
      @cancel="handlePayCancel"
      @failed="handlePayFailed"
    />
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import WeChatPayQRCode from './WeChatPayQRCode.vue'

  const showPayDialog = ref(false)
  const form = ref({
    amount: 99.99,
    orderNo: `ORDER${Date.now()}`
  })

  // 支付成功回调
  const handlePaySuccess = (data) => {
    console.log('支付成功:', data)
    ElMessage.success(`支付成功！订单号：${data.orderNo}，金额：￥${data.amount}`)
  // 这里可以跳转到订单详情页或支付成功页
  // router.push(`/order/${data.orderNo}`)
  }

  // 支付取消回调
  const handlePayCancel = () => {
    console.log('用户取消支付')
    ElMessage.info('已取消支付')
  }

  // 支付失败回调
  const handlePayFailed = (data) => {
    console.log('支付失败:', data)
    ElMessage.error(`支付失败：${data.message}`)
  }
</script>

<style scoped>
.example-page {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.example-page h2 {
  margin-bottom: 20px;
  color: var(--text-primary);
}

.example-card {
  margin-bottom: 20px;
}

.example-content {
  padding: 20px 0;
}
</style>









