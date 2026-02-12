import request from './api_index'

// ==================== 店铺管理 ====================
// 获取店铺列表
export const listShops = (params) => request.get('/api/shop', { params })

// 获取店铺详情
export const getShopDetail = (id) => request.get(`/api/shop/${id}`)

// 创建店铺
export const createShop = (data) => request.post('/api/shop', data)

// 更新店铺信息
export const updateShop = (id, data) => request.put(`/api/shop/${id}`, data)

// 获取我的店铺信息
export const getMyShop = () => request.get('/api/shop/seller/my-shop')

// ==================== 商品管理 ====================
// 获取店铺商品列表
export const getShopProducts = (shopId, params) => request.get(`/api/shop/${shopId}/products`, { params })

// 创建商品
export const createProduct = (data) => request.post('/api/shop/products', data)

// 更新商品
export const updateProduct = (id, data) => request.put(`/api/shop/products/${id}`, data)

// 删除商品
export const deleteProduct = (id) => request.delete(`/api/shop/products/${id}`)

// ==================== 店铺橱窗推荐 ====================
// 获取店铺橱窗推荐商品
export const getShopFeaturedProducts = (shopId) => request.get(`/api/shop/${shopId}/featured`)

// 添加橱窗推荐商品
export const addFeaturedProduct = (shopId, data) => request.post(`/api/shop/${shopId}/featured`, data)

// 移除橱窗推荐商品
export const removeFeaturedProduct = (shopId, productId) => request.delete(`/api/shop/${shopId}/featured/${productId}`)
