import request from './api_index'

// ==================== 商品分类 ====================
// 获取分类列表
export const listCategories = (params) => request.get('/api/mall/categories', { params })

// ==================== 商品 ====================
// 获取商品列表
export const listProducts = (params) => request.get('/api/mall/products', { params })

// 获取商品详情
export const getProductDetail = (id) => request.get(`/api/mall/product/${id}`)

// ==================== 购物车 ====================
// 获取购物车
export const getCart = () => request.get('/api/mall/cart')

// 加入购物车
export const addToCart = (data) => request.post('/api/mall/cart/add', data)

// 更新购物车项
export const updateCartItem = (data) => request.put('/api/mall/cart/update', data)

// 移除购物车项
export const removeCartItem = (data) => request.delete('/api/mall/cart/remove', { data })

// ==================== 地址管理 ====================
// 获取地址列表
export const listAddresses = () => request.get('/api/mall/addresses')

// 添加地址
export const addAddress = (data) => request.post('/api/mall/addresses', data)

// 更新地址
export const updateAddress = (id, data) => request.put(`/api/mall/addresses/${id}`, data)

// 删除地址
export const deleteAddress = (id) => request.delete(`/api/mall/addresses/${id}`)

// ==================== 订单管理 ====================
// 获取订单列表
export const listOrders = (params) => request.get('/api/mall/orders', { params })

// 获取订单详情
export const getOrderDetail = (id) => request.get(`/api/mall/orders/${id}`)

// 创建订单
export const createOrder = (data) => request.post('/api/mall/orders', data)

// 支付订单
export const payOrder = (id) => request.post(`/api/mall/orders/${id}/pay`)

// 确认收货
export const confirmOrder = (id) => request.post(`/api/mall/orders/${id}/confirm`)

// 取消订单
export const cancelOrder = (id) => request.post(`/api/mall/orders/${id}/cancel`)

// ==================== 商品评价 ====================
// 获取商品评价列表
export const listProductReviews = (params) => request.get('/api/mall/reviews', { params })

// 添加商品评价
export const addProductReview = (data) => request.post('/api/mall/reviews', data)


