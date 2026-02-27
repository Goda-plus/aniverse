import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminLogin, adminRegister, adminLogout, getCurrentAdmin } from '@/axios/admin'
import router from '@/router'

export const useAdminStore = defineStore('admin', () => {
  // state
  const token = ref(localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token') || '')
  const admin = ref(JSON.parse(localStorage.getItem('admin') || sessionStorage.getItem('admin') || 'null'))
  const remember = ref(localStorage.getItem('admin_remember') === 'true')

  // getters
  const isLoggedIn = computed(() => !!token.value && !!admin.value)
  const username = computed(() => admin.value?.username || '')
  const permissions = computed(() => admin.value?.permissions || [])
  const roleName = computed(() => admin.value?.role_name || '')

  // actions
  function getStorage () {
    return remember.value ? localStorage : sessionStorage
  }

  function setToken (newToken) {
    token.value = newToken
    const storage = getStorage()
    if (newToken) {
      storage.setItem('admin_token', newToken)
    } else {
      localStorage.removeItem('admin_token')
      sessionStorage.removeItem('admin_token')
    }
  }

  function setAdmin (adminInfo) {
    admin.value = adminInfo
    const storage = getStorage()
    if (adminInfo) {
      storage.setItem('admin', JSON.stringify(adminInfo))
    } else {
      localStorage.removeItem('admin')
      sessionStorage.removeItem('admin')
    }
  }

  function setRemember (value) {
    remember.value = value
    localStorage.setItem('admin_remember', value.toString())
    // 如果切换记住我选项，需要迁移数据
    if (token.value) {
      const oldStorage = value ? sessionStorage : localStorage
      const newStorage = value ? localStorage : sessionStorage
      const oldToken = oldStorage.getItem('admin_token')
      const oldAdmin = oldStorage.getItem('admin')
      if (oldToken) {
        newStorage.setItem('admin_token', oldToken)
        oldStorage.removeItem('admin_token')
      }
      if (oldAdmin) {
        newStorage.setItem('admin', oldAdmin)
        oldStorage.removeItem('admin')
      }
    }
  }

  async function login (loginForm) {
    try {
      const res = await adminLogin({
        username: loginForm.username,
        password: loginForm.password
      })
      if (res.success) {
        setToken(res.token)
        setAdmin(res.data)
        setRemember(loginForm.remember || false)
        return { success: true, message: res.message }
      } else {
        return { success: false, message: res.message }
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || '登录失败，请稍后重试'
      }
    }
  }

  async function register (registerForm) {
    try {
      const res = await adminRegister({
        username: registerForm.username,
        password: registerForm.password
      })
      if (res.success) {
        return { success: true, message: res.message }
      } else {
        return { success: false, message: res.message }
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || '注册失败，请稍后重试'
      }
    }
  }

  async function logout () {
    try {
      await adminLogout()
    } catch (error) {
      console.error('退出登录失败:', error)
    } finally {
      setToken('')
      setAdmin(null)
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin')
      localStorage.removeItem('admin_remember')
      sessionStorage.removeItem('admin_token')
      sessionStorage.removeItem('admin')
      router.push('/back/login')
    }
  }

  async function fetchCurrentAdmin () {
    try {
      const res = await getCurrentAdmin()
      if (res.success) {
        setAdmin(res.data)
        return { success: true, data: res.data }
      } else {
        return { success: false, message: res.message }
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || '获取管理员信息失败'
      }
    }
  }

  // 检查权限
  function hasPermission (permission) {
    if (!permissions.value || permissions.value.length === 0) return false
    return permissions.value.includes(permission)
  }

  // 初始化时从存储中恢复状态
  function init () {
    const storage = getStorage()
    const storedToken = storage.getItem('admin_token')
    const storedAdmin = storage.getItem('admin')
    if (storedToken) {
      token.value = storedToken
    }
    if (storedAdmin) {
      try {
        admin.value = JSON.parse(storedAdmin)
      } catch (e) {
        admin.value = null
      }
    }
  }

  return {
    // state
    token,
    admin,
    remember,
    // getters
    isLoggedIn,
    username,
    permissions,
    roleName,
    // actions
    login,
    register,
    logout,
    fetchCurrentAdmin,
    hasPermission,
    setRemember,
    init,
    setToken,
    setAdmin
  }
})





