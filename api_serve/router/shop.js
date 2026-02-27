const express = require('express')
const router = express.Router()

const shopHandler = require('../router_handler/shop')

// 店铺相关接口（卖家我的店铺须在 /:id 之前，否则会被当作 id）
router.get('/', shopHandler.listShops)
router.get('/seller/my-shop', shopHandler.getMyShop)
router.get('/:id', shopHandler.getShopDetail)
router.post('/', shopHandler.createShop)
router.put('/:id', shopHandler.updateShop)

// 店铺商品相关接口
router.get('/:id/products', shopHandler.getShopProducts)
router.post('/products', shopHandler.createProduct)
router.put('/products/:id', shopHandler.updateProduct)
router.delete('/products/:id', shopHandler.deleteProduct)

// 店铺橱窗推荐
router.get('/:id/featured', shopHandler.getShopFeaturedProducts)
router.post('/:id/featured', shopHandler.addFeaturedProduct)
router.delete('/:id/featured/:productId', shopHandler.removeFeaturedProduct)

module.exports = router
