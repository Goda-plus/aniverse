import request from './api_index'
 
export const getUserInfo = (data) => request.get('/getUserInfo', { params: data })
export const getAllPostsWithUser = (data)=>request.get('/api/post/listwu',{params:data})
export const getPostsBySubreddit = (data)=>request.get('/api/post/list',{params:data})
export const getGuestPostDetail = (data)=>request.get('/api/post/GuestPostDetail',{params:data})
export const getCommentsByPostId = (data)=>request.get('/api/comment/list',{params:data})
export const getAllCategories = ()=>request.get('/api/category/list')
export const getAllSubreddits = ()=>request.get('/api/subreddit/list')
export const searchSubreddits = (data)=>request.get('/api/subreddit/search',{params:data})
export const getSubredditsByCategory = (data)=>request.get('/api/subreddit/sortlist',{params:data})
export const getSubredditDetail = (data)=>request.get('/api/subreddit/detail',{params:data})
export const userLogin = (data) => request.post('/api/user/login', data)
export const userRegiest = (data) => request.post('/api/user/register', data )
export const createPost = (data) =>request.post('/api/post/create',data)
export const getUserVoteStatus= (data)=>request.get('/api/vote/votelist',{params:data})
export const userVote = (data) => request.post('/api/vote/vote',data)
export const getVoteStats = (data) =>request.get('/api/vote/count',{params:data})
export const getPostDetail = (data) =>request.get('api/post/getUserPostDetail',{params:data})
export const createComment = (data) => request.post('/api/comment/create', data)
export const getTopLevelComments = (data) =>request.get('/api/comment/top',{params:data})
export const getRepliesByParentId = (data) =>request.get('/api/comment/child',{params:data})
export const toggleFavorite = (data)=>request.post('/api/favorite/toggle',data)
export const getFavorite = (data)=>request.get('/api/favorite/list',{params:data})
export const createSubreddit = (data)=>request.post('/api/subreddit/create',data)
export const toggleMember = (data)=>request.post('/api/subredditMember/toggle',data)
export const addBrowse = (data)=>request.post('/api/browse/add',data)
export const deleteHistoryItem = (data)=>request.delete('/api/browse/delete',data) 
export const clearAllHistory = (data)=>request.delete('/api/browse/clear',data)
export const browseList = (data)=>request.get('/api/browse/list',data)
export const getMySubreddits = (data)=>request.get('/api/subreddit/getCreateSu',data)

// 获取好友列表
export const getFriendList = () => request.get('/api/friends/list')
// 获取待处理请求
export const getPendingList = () => request.get('/api/friends/pendlist')
// 添加好友
export const addFriend = (data) => request.post('/api/friends/request', data)
// 处理请求
export const handleFriendRequest = (data) => request.post('/api/friends/handle', data)

// 获取聊天记录
export const getChatHistory = (params) => request.get('/api/chat/history', { params })

// 获取房间列表
export const getRoomList = () => request.get('/api/chatRoom/list')

export const sendChatMsg = (data) => request.post('/api/chat/send', data)

// 创建房间（私聊/群聊）
export const createRoom = (data) => request.post('/api/chatRoom/create', data)

// 帖子图片上传
export const uploadPostImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return request.post('/api/post/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 删除评论
export const deleteComment = (comment_id) => request.delete('/api/comment/delete', { data: { comment_id } })
// 删除帖子
export const deletePost = (post_id) => request.delete('/api/post/delete', { data: { post_id } })

// 更新用户信息
export const updateUserInfo = (data) => request.post('/my/userinfo', data)
// 单独更新用户头像
export const updateUserAvatar = (data) => request.post('/my/update-avatar', data)
