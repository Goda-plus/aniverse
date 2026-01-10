import request from './api_index'

// 获取用户信息
export const getUserInfo = (data) => request.get('/getUserInfo', { params: data })

// 用户登录
export const userLogin = (data) => request.post('/api/user/login', data)

// 用户注册
export const userRegiest = (data) => request.post('/api/user/register', data)

// 更新用户信息
export const updateUserInfo = (data) => request.post('/my/userinfo', data)

// 单独更新用户头像（支持FormData文件上传）
export const updateUserAvatar = (data) => {
  return request.post('/my/update-avatar', data, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

