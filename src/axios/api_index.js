import Axios from 'axios'

const instance = Axios.create({
  baseURL: 'http://localhost:3000'
})

// 获取存储方式（普通用户）
const getStorage = () => {
  const remember = localStorage.getItem('remember') === 'true'
  return remember ? localStorage : sessionStorage
}

// 获取管理员存储方式
const getAdminStorage = () => {
  const remember = localStorage.getItem('admin_remember') === 'true'
  return remember ? localStorage : sessionStorage
}

// 判断是否是管理员API请求
const isAdminApi = (url) => {
  return url && url.includes('/api/admin/')
}
 
instance.interceptors.request.use((config) => {
  // 判断是否是管理员API
  if (isAdminApi(config.url)) {
    // 管理员token
    const storage = getAdminStorage()
    const token = storage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = token.toLowerCase().startsWith('bearer ')
        ? token
        : `Bearer ${token}`
    }
  } else {
    // 普通用户token
    const storage = getStorage()
    const token = storage.getItem('token')
    if (token) {
      config.headers.Authorization = token.toLowerCase().startsWith('bearer ')
        ? token
        : `Bearer ${token}`
    }
  }
  
  return config
}, err => {
  return Promise.reject(err)
})
 
instance.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      const isAdmin = isAdminApi(err.config?.url)
      
      if (isAdmin) {
        // 管理员登出
        import('@/stores/back/admin').then(({ useAdminStore }) => {
          const adminStore = useAdminStore()
          adminStore.logout()
        }).catch(() => {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('admin')
          localStorage.removeItem('admin_remember')
          sessionStorage.removeItem('admin_token')
          sessionStorage.removeItem('admin')
        })
        // 重定向到管理员登录页面
        if (window.location.pathname.startsWith('/back')) {
          window.location.href = '/back/login'
        }
      } else {
        // 普通用户登出
        import('@/stores/user').then(({ useUserStore }) => {
          const userStore = useUserStore()
          userStore.logout()
        }).catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('remember')
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
        })
        // 重定向到登录页面
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default instance
