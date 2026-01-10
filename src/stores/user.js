import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userLogin, userRegiest } from '@/axios/api'

export const useUserStore = defineStore('user', () => {
  // state
  const token = ref(localStorage.getItem('token') || sessionStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'))
  const remember = ref(localStorage.getItem('remember') === 'true')

  // getters
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const username = computed(() => user.value?.username || '')
  const avatar = computed(() => user.value?.avatar_url || '')

  // actions
  function getStorage () {
    return remember.value ? localStorage : sessionStorage
  }

  function setToken (newToken) {
    token.value = newToken
    const storage = getStorage()
    if (newToken) {
      storage.setItem('token', newToken)
    } else {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
    }
  }

  function setUser (userInfo) {
    user.value = userInfo
    const storage = getStorage()
    if (userInfo) {
      storage.setItem('user', JSON.stringify(userInfo))
    } else {
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
    }
  }

  function setRemember (value) {
    remember.value = value
    localStorage.setItem('remember', value.toString())
    // 如果切换记住我选项，需要迁移数据
    if (token.value) {
      const oldStorage = value ? sessionStorage : localStorage
      const newStorage = value ? localStorage : sessionStorage
      const oldToken = oldStorage.getItem('token')
      const oldUser = oldStorage.getItem('user')
      if (oldToken) {
        newStorage.setItem('token', oldToken)
        oldStorage.removeItem('token')
      }
      if (oldUser) {
        newStorage.setItem('user', oldUser)
        oldStorage.removeItem('user')
      }
    }
  }

  async function login (loginForm) {
    try {
      const res = await userLogin({
        username: loginForm.username,
        password: loginForm.password
      })
      if (res.success) {
        setToken(res.token)
        setUser(res.data)
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
      const res = await userRegiest({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        avatar_url: registerForm.avatar_url || null,
        bio: registerForm.bio || null
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

  function logout () {
    setToken('')
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('remember')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  }

  // 初始化时从存储中恢复状态
  function init () {
    const storage = getStorage()
    const storedToken = storage.getItem('token')
    const storedUser = storage.getItem('user')
    if (storedToken) {
      token.value = storedToken
    }
    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser)
      } catch (e) {
        user.value = null
      }
    }
  }

  return {
    // state
    token,
    user,
    remember,
    // getters
    isLoggedIn,
    username,
    avatar,
    // actions
    login,
    register,
    logout,
    setRemember,
    init,
    setToken,
    setUser
  }
})

