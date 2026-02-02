<template>
  <el-dialog
    v-model="visible"
    title="用户设置"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    class="user-settings-dialog"
    align-center
  >
    <el-tabs v-model="activeTab" class="user-settings-tabs">
      <!-- 基本信息设置 -->
      <div class="settings-section">
        <el-form
          ref="basicFormRef"
          :model="basicForm"
          :rules="basicRules"
          label-width="80px"
          class="basic-form"
        >
          <el-form-item label="用户名">
            <el-input
              v-model="basicForm.username"
              disabled
              placeholder="用户名不可修改"
            />
          </el-form-item>

          <el-form-item label="昵称" prop="nickname">
            <el-input
              v-model="basicForm.nickname"
              placeholder="请输入昵称"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input
              v-model="basicForm.email"
              placeholder="请输入邮箱"
              type="email"
            />
          </el-form-item>

          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="basicForm.gender">
              <el-radio label="male">
                男
              </el-radio>
              <el-radio label="female">
                女
              </el-radio>
              <el-radio label="other">
                其他
              </el-radio>
              <el-radio label="prefer_not_to_say">
                不愿透露
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="生日" prop="birthday">
            <el-date-picker
              v-model="basicForm.birthday"
              type="date"
              placeholder="请选择生日"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>

          <el-form-item label="个人简介" prop="bio">
            <el-input
              v-model="basicForm.bio"
              type="textarea"
              placeholder="请输入个人简介"
              :rows="4"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="basicLoading" @click="handleBasicSubmit">
              保存修改
            </el-button>
            <el-button @click="handleBasicReset">
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-tabs>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, watch, defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    getUserInfo,
    updateUserInfo
  } from '@/axios/user'
  import { useUserStore } from '@/stores/user'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:modelValue'])

  const visible = ref(false)
  const activeTab = ref('basic')
  const basicLoading = ref(false)

  // 用户仓库
  const userStore = useUserStore()

  // 基本信息表单
  const basicFormRef = ref()
  const basicForm = reactive({
    username: '',
    nickname: '',
    email: '',
    gender: 'prefer_not_to_say',
    birthday: '',
    bio: ''
  })

  // 基本信息验证规则
  const basicRules = {
    nickname: [
      { max: 50, message: '昵称不能超过50个字符', trigger: 'blur' }
    ],
    email: [
      { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
    ]
  }

  // 监听对话框显示状态
  watch(() => props.modelValue, (val) => {
    visible.value = val
    if (val) {
      loadUserData()
    }
  })

  watch(visible, (val) => {
    emit('update:modelValue', val)
  })

  // 加载用户数据
  const loadUserData = async () => {
    try {
      // 加载基本信息
      const userInfoRes = await getUserInfo()
      if (userInfoRes.success) {
        Object.assign(basicForm, userInfoRes.data)
      }
    } catch (error) {
      ElMessage.error('加载用户数据失败')
    }
  }

  // 基本信息提交
  const handleBasicSubmit = async () => {
    try {
      await basicFormRef.value.validate()
      basicLoading.value = true

      // 处理表单数据，将空字符串转换为 null
      const submitData = {
        ...basicForm,
        birthday: basicForm.birthday || null
      }

      const res = await updateUserInfo(submitData)
      if (res.success) {
        ElMessage.success('基本信息更新成功')
        // 更新本地存储的用户信息
        if (res.data) {
          // 更新仓库中的用户信息
          userStore.setUser(res.data)
        }
      } else {
        ElMessage.error(res.message || '更新失败')
      }
    } catch (error) {
      ElMessage.error('表单验证失败')
    } finally {
      basicLoading.value = false
    }
  }

  // 基本信息重置
  const handleBasicReset = () => {
    loadUserData()
  }

  // 关闭对话框
  const handleClose = () => {
    visible.value = false
  }
</script>

<style scoped>
.user-settings-dialog {
  --dialog-max-height: 80vh;
}

.user-settings-tabs {
  height: 100%;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
}

.basic-form {
  max-width: 500px;
}

/* 对话框样式 */
:deep(.el-dialog) {
  height: var(--dialog-max-height);
  max-height: var(--dialog-max-height);
}

:deep(.el-dialog__body) {
  height: calc(var(--dialog-max-height) - 120px);
  overflow-y: auto;
  padding: 20px;
}

:deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow-y: auto;
}

:deep(.el-tab-pane) {
  height: 100%;
}
</style>
