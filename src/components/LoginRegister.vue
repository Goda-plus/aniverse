<template>
  <div class="login-register-container">
    <el-card class="auth-card" shadow="always">
      <template #header>
        <div class="card-header">
          <h2>{{ isLogin ? '登录' : '注册' }}</h2>
          <el-button text @click="toggleMode">
            {{ isLogin ? '还没有账号？去注册' : '已有账号？去登录' }}
          </el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="0"
        size="large"
      >
        <!-- 用户名 -->
        <el-form-item prop="username">
          <el-input
            v-model="formData.username"
            placeholder="用户名（3-30位字母或数字）"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <!-- 邮箱（仅注册时显示） -->
        <el-form-item v-if="!isLogin" prop="email">
          <el-input
            v-model="formData.email"
            placeholder="邮箱地址"
            :prefix-icon="Message"
            clearable
          />
        </el-form-item>

        <!-- 密码 -->
        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="密码（6-20位，不能包含空格）"
            :prefix-icon="Lock"
            show-password
            clearable
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <!-- 确认密码（仅注册时显示） -->
        <el-form-item v-if="!isLogin" prop="confirmPassword">
          <el-input
            v-model="formData.confirmPassword"
            type="password"
            placeholder="确认密码"
            :prefix-icon="Lock"
            show-password
            clearable
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <!-- 记住我（仅登录时显示） -->
        <el-form-item v-if="isLogin">
          <el-checkbox v-model="formData.remember">
            记住我
          </el-checkbox>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            class="submit-btn"
            :loading="loading"
            @click="handleSubmit"
          >
            {{ isLogin ? '登录' : '注册' }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
  import { ref, reactive, computed } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { User, Lock, Message } from '@element-plus/icons-vue'
  import { useUserStore } from '@/stores/user'

  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()

  // 根据路由判断是登录还是注册模式
  const isLogin = computed({
    get: () => route.path === '/login',
    set: (value) => {
      // 当切换模式时，更新路由
      if (value) {
        router.push('/login')
      } else {
        router.push('/register')
      }
    }
  })

  const loading = ref(false)
  const formRef = ref(null)

  const formData = reactive({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    remember: false
  })

  // 验证规则
  const validateUsername = (rule, value, callback) => {
    if (!value) {
      callback(new Error('请输入用户名'))
    } else if (!/^[a-zA-Z0-9]{3,30}$/.test(value)) {
      callback(new Error('用户名必须是3-30位字母或数字'))
    } else {
      callback()
    }
  }

  const validatePassword = (rule, value, callback) => {
    if (!value) {
      callback(new Error('请输入密码'))
    } else if (!/^[\S]{6,20}$/.test(value)) {
      callback(new Error('密码必须是6-20位，不能包含空格'))
    } else {
      callback()
    }
  }

  const validateEmail = (rule, value, callback) => {
    if (!value) {
      callback(new Error('请输入邮箱地址'))
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      callback(new Error('请输入正确的邮箱格式'))
    } else {
      callback()
    }
  }

  const validateConfirmPassword = (rule, value, callback) => {
    if (!value) {
      callback(new Error('请再次输入密码'))
    } else if (value !== formData.password) {
      callback(new Error('两次输入的密码不一致'))
    } else {
      callback()
    }
  }

  const rules = computed(() => {
    const baseRules = {
      username: [{ validator: validateUsername, trigger: 'blur' }],
      password: [{ validator: validatePassword, trigger: 'blur' }]
    }

    if (!isLogin.value) {
      return {
        ...baseRules,
        email: [{ validator: validateEmail, trigger: 'blur' }],
        confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
      }
    }

    return baseRules
  })

  // 切换登录/注册模式
  const toggleMode = () => {
    // 通过更新路由来切换模式
    if (isLogin.value) {
      router.push('/register')
    } else {
      router.push('/login')
    }
    // 重置表单
    formRef.value?.resetFields()
    formData.username = ''
    formData.email = ''
    formData.password = ''
    formData.confirmPassword = ''
    formData.remember = false
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
      loading.value = true

      if (isLogin.value) {
        // 登录
        const result = await userStore.login({
          username: formData.username,
          password: formData.password,
          remember: formData.remember
        })

        if (result.success) {
          ElMessage.success(result.message || '登录成功')
          // 跳转到首页或之前访问的页面
          const redirect = router.currentRoute.value.query.redirect || '/'
          router.push(redirect)
        } else {
          ElMessage.error(result.message || '登录失败')
        }
      } else {
        // 注册
        const result = await userStore.register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })

        if (result.success) {
          ElMessage.success(result.message || '注册成功，请登录')
          // 切换到登录模式
          toggleMode()
        } else {
          ElMessage.error(result.message || '注册失败')
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error)
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
.login-register-container {
  min-height: calc(100vh - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: transparent;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

:deep(.auth-card .el-card__header) {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 24px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

:deep(.auth-card .el-card__body) {
  padding: 24px;
  background: var(--bg-secondary);
  transition: background-color 0.3s ease;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.card-header .el-button {
  color: #ff4500;
  padding: 0;
  font-size: 14px;
}

.card-header .el-button:hover {
  color: #ff6314;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input__wrapper) {
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  box-shadow: none;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  border-color: var(--text-secondary);
}

:deep(.el-input__inner) {
  color: var(--text-primary);
  transition: color 0.3s ease;
}

:deep(.el-input__inner::placeholder) {
  color: var(--text-secondary);
}

.submit-btn {
  width: 100%;
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  padding: 12px;
}

.submit-btn:hover {
  background: #ff6314;
  border-color: #ff6314;
}

:deep(.el-checkbox__label) {
  color: var(--text-primary);
  transition: color 0.3s ease;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #ff4500;
  border-color: #ff4500;
}
</style>

