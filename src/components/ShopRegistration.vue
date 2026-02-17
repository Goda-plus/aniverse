<template>
  <div class="shop-registration">
    <el-dialog
      v-model="visible"
      title="入驻商城"
      width="700px"
      :close-on-click-modal="false"
      append-to-body
      @close="handleClose"
    >
      <div v-loading="loading" class="registration-content">
        <!-- 入驻说明 -->
        <div class="registration-intro">
          <el-alert
            type="info"
            :closable="false"
            show-icon
          >
            <template #title>
              <div class="intro-content">
                <h4>欢迎入驻商城！</h4>
                <p>成为卖家后，您可以：</p>
                <ul>
                  <li>发布和管理商品</li>
                  <li>设置店铺信息和装修</li>
                  <li>查看订单和销售数据</li>
                  <li>与买家沟通交流</li>
                </ul>
              </div>
            </template>
          </el-alert>
        </div>

        <!-- 表单 -->
        <el-form
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-width="100px"
          size="large"
          class="registration-form"
        >
          <!-- 基本信息 -->
          <div class="form-section">
            <h3 class="section-title">
              基本信息
            </h3>

            <el-form-item label="店铺名称" prop="shop_name">
              <el-input
                v-model="formData.shop_name"
                placeholder="请输入店铺名称（2-50个字符）"
                maxlength="50"
                show-word-limit
                clearable
              />
            </el-form-item>

            <el-form-item label="店铺简介" prop="description">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="4"
                placeholder="请输入店铺简介，让买家了解您的店铺特色（可选）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="店铺Logo">
              <div class="upload-section">
                <div v-if="formData.logo" class="current-logo">
                  <img :src="formData.logo" alt="店铺Logo">
                  <el-button type="danger" size="small" @click="removeLogo">
                    删除
                  </el-button>
                </div>
                <el-upload
                  ref="uploadRef"
                  class="logo-uploader"
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleLogoSuccess"
                  :on-error="handleLogoError"
                  :before-upload="beforeLogoUpload"
                  accept="image/*"
                >
                  <div class="upload-area">
                    <el-icon class="upload-icon">
                      <Plus />
                    </el-icon>
                    <div class="upload-text">
                      点击上传Logo
                    </div>
                    <div class="upload-hint">
                      建议尺寸：200x200px，支持JPG、PNG格式
                    </div>
                  </div>
                </el-upload>
              </div>
            </el-form-item>
          </div>

          <!-- 联系信息 -->
          <div class="form-section">
            <h3 class="section-title">
              联系信息（可选）
            </h3>
            <p class="section-hint">
              填写联系信息有助于买家与您沟通
            </p>

            <el-form-item label="联系电话">
              <el-input
                v-model="formData.contact_info.phone"
                placeholder="请输入联系电话"
                maxlength="20"
                clearable
              />
            </el-form-item>

            <el-form-item label="邮箱">
              <el-input
                v-model="formData.contact_info.email"
                placeholder="请输入邮箱地址"
                maxlength="50"
                clearable
              />
            </el-form-item>

            <el-form-item label="微信">
              <el-input
                v-model="formData.contact_info.wechat"
                placeholder="请输入微信号"
                maxlength="50"
                clearable
              />
            </el-form-item>

            <el-form-item label="QQ">
              <el-input
                v-model="formData.contact_info.qq"
                placeholder="请输入QQ号"
                maxlength="20"
                clearable
              />
            </el-form-item>
          </div>

          <!-- 协议 -->
          <div class="agreement-section">
            <el-checkbox v-model="agreed" size="large">
              我已阅读并同意
              <el-link type="primary" :underline="false" @click="showAgreement">
                《商城入驻协议》
              </el-link>
            </el-checkbox>
          </div>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleClose">
            取消
          </el-button>
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="!agreed"
            @click="handleSubmit"
          >
            提交申请
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 入驻协议对话框 -->
    <el-dialog
      v-model="agreementVisible"
      title="商城入驻协议"
      width="600px"
    >
      <div class="agreement-content">
        <h3>一、入驻条件</h3>
        <p>1. 您必须是已注册并登录的用户</p>
        <p>2. 每个用户只能创建一个店铺</p>
        <p>3. 店铺名称必须唯一，不能与其他店铺重复</p>

        <h3>二、店铺管理</h3>
        <p>1. 您需要保证店铺信息的真实性和准确性</p>
        <p>2. 您有责任维护店铺的正常运营</p>
        <p>3. 禁止发布违法违规商品</p>

        <h3>三、商品管理</h3>
        <p>1. 您需要保证商品信息的真实性</p>
        <p>2. 商品价格必须合理，不得恶意定价</p>
        <p>3. 需要及时处理订单和买家咨询</p>

        <h3>四、违规处理</h3>
        <p>如发现违规行为，平台有权对店铺进行处罚，包括但不限于警告、限制功能、关闭店铺等。</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="agreementVisible = false">
          我已了解
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch, defineProps, defineEmits } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { useUserStore } from '@/stores/user'
  import { createShop, getMyShop } from '@/axios/shop'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:modelValue', 'success'])

  const router = useRouter()
  const userStore = useUserStore()

  const formRef = ref(null)
  const uploadRef = ref(null)
  const loading = ref(false)
  const submitting = ref(false)
  const agreed = ref(false)
  const agreementVisible = ref(false)

  // 表单数据
  const formData = reactive({
    shop_name: '',
    description: '',
    logo: '',
    contact_info: {
      phone: '',
      email: '',
      wechat: '',
      qq: ''
    }
  })

  // 表单验证规则
  const rules = {
    shop_name: [
      { required: true, message: '请输入店铺名称', trigger: 'blur' },
      { min: 2, max: 50, message: '店铺名称长度在2-50个字符', trigger: 'blur' }
    ],
    description: [
      { max: 200, message: '店铺简介不能超过200个字符', trigger: 'blur' }
    ]
  }

  // 计算属性
  const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  // 上传相关
  const uploadUrl = '/api/upload/image'
  const uploadHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }

  // 检查用户是否已有店铺
  const checkExistingShop = async () => {
    try {
      loading.value = true
      const res = await getMyShop()
      if (res.success) {
        ElMessageBox.confirm(
          '您已经拥有店铺了，是否前往店铺管理？',
          '提示',
          {
            confirmButtonText: '前往店铺',
            cancelButtonText: '取消',
            type: 'info'
          }
        ).then(() => {
          router.push(`/shop/${res.data.shop_id}`)
          handleClose()
        }).catch(() => {
          handleClose()
        })
        return true
      }
      return false
    } catch (error) {
      // 404表示没有店铺，这是正常的
      if (error.response?.status === 404) {
        return false
      }
      console.error('检查店铺失败:', error)
      return false
    } finally {
      loading.value = false
    }
  }

  // 监听对话框打开
  watch(visible, async (newVal) => {
    if (newVal) {
      // 检查登录状态
      if (!userStore.isLoggedIn) {
        ElMessage.warning('请先登录')
        handleClose()
        router.push('/login')
        return
      }

      // 检查是否已有店铺
      const hasShop = await checkExistingShop()
      if (hasShop) {
        return
      }

      // 重置表单
      resetForm()
    }
  })

  // 重置表单
  const resetForm = () => {
    formData.shop_name = ''
    formData.description = ''
    formData.logo = ''
    formData.contact_info = {
      phone: '',
      email: '',
      wechat: '',
      qq: ''
    }
    agreed.value = false
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  }

  // Logo上传处理
  const handleLogoSuccess = (response) => {
    if (response.success) {
      formData.logo = response.data.url
      ElMessage.success('Logo上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  }

  const handleLogoError = () => {
    ElMessage.error('Logo上传失败，请重试')
  }

  const beforeLogoUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt2M = file.size / 1024 / 1024 < 2

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt2M) {
      ElMessage.error('上传图片大小不能超过 2MB!')
      return false
    }
    return true
  }

  const removeLogo = () => {
    formData.logo = ''
  }

  // 显示协议
  const showAgreement = () => {
    agreementVisible.value = true
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return

    // 验证表单
    try {
      await formRef.value.validate()
    } catch (error) {
      return
    }

    // 检查是否同意协议
    if (!agreed.value) {
      ElMessage.warning('请先阅读并同意入驻协议')
      return
    }

    try {
      submitting.value = true

      // 构建提交数据
      const submitData = {
        shop_name: formData.shop_name.trim(),
        description: formData.description.trim() || undefined,
        logo: formData.logo || undefined,
        contact_info: {}
      }

      // 只添加有值的联系信息
      if (formData.contact_info.phone) {
        submitData.contact_info.phone = formData.contact_info.phone.trim()
      }
      if (formData.contact_info.email) {
        submitData.contact_info.email = formData.contact_info.email.trim()
      }
      if (formData.contact_info.wechat) {
        submitData.contact_info.wechat = formData.contact_info.wechat.trim()
      }
      if (formData.contact_info.qq) {
        submitData.contact_info.qq = formData.contact_info.qq.trim()
      }

      // 如果联系信息为空对象，则不传递
      if (Object.keys(submitData.contact_info).length === 0) {
        delete submitData.contact_info
      }

      const res = await createShop(submitData)

      if (res.success) {
        ElMessage.success('店铺创建成功！')
        emit('success', res.data)
        handleClose()
        
        // 延迟跳转，让用户看到成功消息
        setTimeout(() => {
          if (res.data?.shop_id) {
            router.push(`/shop/${res.data.shop_id}`)
          } else {
            router.push('/mall')
          }
        }, 1500)
      } else {
        ElMessage.error(res.message || '创建店铺失败，请重试')
      }
    } catch (error) {
      console.error('创建店铺失败:', error)
      ElMessage.error(error.response?.data?.message || '创建店铺失败，请重试')
    } finally {
      submitting.value = false
    }
  }

  // 关闭对话框
  const handleClose = () => {
    visible.value = false
    resetForm()
  }
</script>

<style lang="scss" scoped>
.shop-registration {
  .registration-content {
    min-height: 400px;
  }

  .registration-intro {
    margin-bottom: 24px;

    .intro-content {
      h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: bold;
        color: var(--el-color-primary);
      }

      p {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: var(--el-text-color-regular);
      }

      ul {
        margin: 8px 0 0 0;
        padding-left: 20px;
        color: var(--el-text-color-regular);

        li {
          margin: 4px 0;
          font-size: 14px;
        }
      }
    }
  }

  .registration-form {
    .form-section {
      margin-bottom: 32px;

      .section-title {
        font-size: 18px;
        font-weight: bold;
        margin: 0 0 8px 0;
        color: var(--el-text-color-primary);
        border-bottom: 2px solid var(--el-color-primary);
        padding-bottom: 8px;
      }

      .section-hint {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin: 0 0 16px 0;
      }
    }

    .upload-section {
      .current-logo {
        position: relative;
        display: inline-block;
        margin-bottom: 12px;

        img {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
          border: 1px solid var(--el-border-color);
          object-fit: cover;
        }

        .el-button {
          position: absolute;
          top: 8px;
          right: 8px;
        }
      }
    }

    .logo-uploader {
      :deep(.el-upload) {
        width: 100%;
      }
    }

    .upload-area {
      border: 2px dashed var(--el-border-color);
      border-radius: 8px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background-color: var(--el-fill-color-lighter);

      &:hover {
        border-color: var(--el-color-primary);
        background-color: var(--el-fill-color);
      }

      .upload-icon {
        font-size: 32px;
        color: var(--el-text-color-secondary);
        margin-bottom: 12px;
      }

      .upload-text {
        font-size: 16px;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        font-weight: 500;
      }

      .upload-hint {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }

    .agreement-section {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--el-border-color);
      text-align: center;

      .el-checkbox {
        font-size: 14px;
      }
    }
  }

  .agreement-content {
    max-height: 500px;
    overflow-y: auto;
    padding: 0 8px;

    h3 {
      font-size: 16px;
      font-weight: bold;
      margin: 20px 0 12px 0;
      color: var(--el-text-color-primary);

      &:first-child {
        margin-top: 0;
      }
    }

    p {
      font-size: 14px;
      line-height: 1.8;
      color: var(--el-text-color-regular);
      margin: 8px 0;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}
</style>



