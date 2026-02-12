<template>
  <div class="shop-settings-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      size="large"
    >
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">
          基本信息
        </h3>

        <el-form-item label="店铺名称" prop="shop_name">
          <el-input
            v-model="formData.shop_name"
            placeholder="请输入店铺名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="店铺简介" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入店铺简介"
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
                  建议尺寸：200x200px
                </div>
              </div>
            </el-upload>
          </div>
        </el-form-item>

        <el-form-item label="店铺横幅">
          <div class="upload-section">
            <div v-if="formData.banner_image" class="current-banner">
              <img :src="formData.banner_image" alt="店铺横幅">
              <el-button type="danger" size="small" @click="removeBanner">
                删除
              </el-button>
            </div>
            <el-upload
              ref="bannerUploadRef"
              class="banner-uploader"
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleBannerSuccess"
              :on-error="handleBannerError"
              :before-upload="beforeBannerUpload"
              accept="image/*"
            >
              <div class="upload-area">
                <el-icon class="upload-icon">
                  <Plus />
                </el-icon>
                <div class="upload-text">
                  点击上传横幅
                </div>
                <div class="upload-hint">
                  建议尺寸：1200x200px
                </div>
              </div>
            </el-upload>
          </div>
        </el-form-item>

        <el-form-item label="店铺公告">
          <el-input
            v-model="formData.announcement"
            type="textarea"
            :rows="2"
            placeholder="请输入店铺公告"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </div>

      <!-- 联系信息 -->
      <div class="form-section">
        <h3 class="section-title">
          联系信息
        </h3>

        <el-form-item label="联系电话">
          <el-input
            v-model="formData.contact_info.phone"
            placeholder="请输入联系电话"
            maxlength="20"
          />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input
            v-model="formData.contact_info.email"
            placeholder="请输入邮箱地址"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item label="微信">
          <el-input
            v-model="formData.contact_info.wechat"
            placeholder="请输入微信号"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item label="QQ">
          <el-input
            v-model="formData.contact_info.qq"
            placeholder="请输入QQ号"
            maxlength="20"
          />
        </el-form-item>
      </div>

      <!-- 表单操作 -->
      <div class="form-actions">
        <el-button @click="handleCancel">
          取消
        </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          保存设置
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
  import { ref, reactive, watch, onMounted, defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { updateShop } from '@/axios/shop'

  const props = defineProps({
    shop: {
      type: Object,
      required: true
    }
  })

  const emit = defineEmits(['success', 'cancel'])

  const formRef = ref(null)
  const uploadRef = ref(null)
  const bannerUploadRef = ref(null)
  const submitting = ref(false)

  // 表单数据
  const formData = reactive({
    shop_name: '',
    description: '',
    logo: '',
    banner_image: '',
    announcement: '',
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

  // 上传相关
  const uploadUrl = '/api/upload/image'
  const uploadHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }

  // 初始化表单数据
  const initFormData = () => {
    formData.shop_name = props.shop.shop_name || ''
    formData.description = props.shop.description || ''
    formData.logo = props.shop.logo || ''
    formData.banner_image = props.shop.banner_image || ''
    formData.announcement = props.shop.announcement || ''

    // 解析联系信息
    const contactInfo = props.shop.contact_info || {}
    formData.contact_info = {
      phone: contactInfo.phone || '',
      email: contactInfo.email || '',
      wechat: contactInfo.wechat || '',
      qq: contactInfo.qq || ''
    }
  }

  // 监听props变化
  watch(() => props.shop, () => {
    initFormData()
  }, { immediate: true })

  // 上传处理方法
  const handleLogoSuccess = (response) => {
    if (response.success) {
      formData.logo = response.data.url
      ElMessage.success('Logo上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  }

  const handleLogoError = () => {
    ElMessage.error('Logo上传失败')
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

  const handleBannerSuccess = (response) => {
    if (response.success) {
      formData.banner_image = response.data.url
      ElMessage.success('横幅上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  }

  const handleBannerError = () => {
    ElMessage.error('横幅上传失败')
  }

  const beforeBannerUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('上传图片大小不能超过 5MB!')
      return false
    }
    return true
  }

  const removeLogo = () => {
    formData.logo = ''
  }

  const removeBanner = () => {
    formData.banner_image = ''
  }

  // 表单操作
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
    } catch (error) {
      return
    }

    try {
      submitting.value = true

      const submitData = {
        ...formData,
        contact_info: formData.contact_info
      }

      const res = await updateShop(props.shop.shop_id, submitData)

      if (res.success) {
        ElMessage.success('店铺设置保存成功')
        emit('success')
      } else {
        ElMessage.error(res.message || '保存失败')
      }
    } catch (error) {
      ElMessage.error('保存失败，请重试')
      console.error(error)
    } finally {
      submitting.value = false
    }
  }

  const handleCancel = () => {
    emit('cancel')
  }

  onMounted(() => {
    initFormData()
  })
</script>

<style lang="scss" scoped>
.shop-settings-form {
  .form-section {
    margin-bottom: 32px;

    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin: 0 0 20px 0;
      color: var(--text-primary);
      border-bottom: 2px solid var(--el-color-primary);
      padding-bottom: 8px;
    }
  }

  .upload-section {
    .current-logo, .current-banner {
      position: relative;
      display: inline-block;
      margin-bottom: 12px;

      img {
        max-width: 200px;
        max-height: 200px;
        border-radius: 8px;
        border: 1px solid var(--border-color);
      }

      .el-button {
        position: absolute;
        top: 8px;
        right: 8px;
      }
    }

    .current-banner img {
      max-width: 300px;
      max-height: 100px;
    }
  }

  .logo-uploader, .banner-uploader {
    :deep(.el-upload) {
      width: 100%;
    }
  }

  .upload-area {
    border: 2px dashed var(--border-color);
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary);
      background-color: var(--bg-hover);
    }

    .upload-icon {
      font-size: 32px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .upload-text {
      font-size: 16px;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .upload-hint {
      font-size: 12px;
      color: var(--text-secondary);
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }
}
</style>
