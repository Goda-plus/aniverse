import request from './api_index'

// 获取所有帖子（带用户信息）
export const getAllPostsWithUser = (data) => request.get('/api/post/listwu', { params: data })

// 根据子版块获取帖子
export const getPostsBySubreddit = (data) => request.get('/api/post/list', { params: data })

// 获取访客帖子详情
export const getGuestPostDetail = (data) => request.get('/api/post/GuestPostDetail', { params: data })

// 获取帖子详情
export const getPostDetail = (data) => request.get('api/post/getUserPostDetail', { params: data })

// 创建帖子
export const createPost = (data) => request.post('/api/post/create', data)

// 删除帖子
export const deletePost = (post_id) => request.delete('/api/post/delete', { data: { post_id } })

// 帖子图片上传
export const uploadPostImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return request.post('/api/post/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 帖子视频上传
export const uploadPostVideo = (file) => {
  const formData = new FormData()
  formData.append('video', file)
  return request.post('/api/post/upload-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

