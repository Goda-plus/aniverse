import Axios from 'axios'

const instance = Axios.create({
  baseURL: 'http://localhost:3000'
})

// 获取存储方式
const getStorage = () => {
  const remember = localStorage.getItem('remember') === 'true'
  return remember ? localStorage : sessionStorage
}
 
instance.interceptors.request.use((config) => {
  // 从正确的存储中获取 token
  const storage = getStorage()
  const token = storage.getItem('token')
  if (token) {
    config.headers.Authorization = token
  }
  
  return config
}, err => {
  return Promise.reject(err)
})
 
instance.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      // 使用userStore来处理登出，确保数据隔离
      import('@/stores/user').then(({ useUserStore }) => {
        const userStore = useUserStore()
        userStore.logout()
      }).catch(() => {
        // 如果store不可用，直接清除存储
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('remember')
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
      })
      // 重定向到登录页面
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default instance
