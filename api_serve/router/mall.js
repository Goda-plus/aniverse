const express = require('express')
const router = express.Router()

const mallHandler = require('../router_handler/mall')

// 商品分类列表（支持按父分类筛选，带分页）
router.get('/categories', mallHandler.listCategories)

// 商品列表（支持分页、分类筛选等）
router.get('/products', mallHandler.listProducts)

// 商品详情（包含图片和评价统计）
router.get('/product/:id', mallHandler.getProductDetail)

// 购物车相关（需要登录）
router.get('/cart', mallHandler.getCart)
router.post('/cart/add', mallHandler.addToCart)
router.put('/cart/update', mallHandler.updateCartItem)
router.delete('/cart/remove', mallHandler.removeCartItem)

// 订单列表与详情（需要登录）
router.get('/orders', mallHandler.listOrders)
router.get('/orders/:id', mallHandler.getOrderDetail)

module.exports = router


