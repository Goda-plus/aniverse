import request from './api_index'

// 获取所有分类
export const getAllCategories = () => request.get('/api/category/list')

