import request from './api_index'

// 获取用户信息
export const getUserInfo = (data) => request.get('/my/userinfo', { params: data })

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

// 获取用户主题设置
export const getUserTheme = () => request.get('/my/theme')

// 更新用户主题设置
export const updateUserTheme = (data) => request.post('/my/theme', data)

// 重置用户主题设置
export const resetUserTheme = () => request.post('/my/theme/reset')

// 应用预置主题
export const applyPresetTheme = (data) => request.post('/my/theme/preset', data)

// 获取用户收藏的动漫
export const getUserFavoriteAnime = () => request.get('/favorite/list', { params: { target_type: 'media' } })

// 获取用户收藏的角色
export const getUserFavoriteCharacters = () => request.get('/favorite/list', { params: { target_type: 'character' } })

