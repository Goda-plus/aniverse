<template>
  <div class="page">
    <div class="section-title">
      周边商城
    </div>
    <p class="meta-text">
      商品列表、购物车与订单流程的前端演示。点击商品即可加入购物车。
    </p>

    <el-row :gutter="16">
      <el-col :lg="16" :md="24">
        <el-row :gutter="12">
          <el-col v-for="product in store.products" :key="product.id" :md="12" :xs="24">
            <el-card shadow="hover" class="product">
              <img :src="product.cover" alt="" class="cover">
              <div class="body">
                <div class="name">
                  {{ product.name }}
                </div>
                <div class="meta-text">
                  ￥{{ product.price }} · 库存 {{ product.stock }}
                </div>
                <div class="tags">
                  <el-tag v-for="tag in product.tags" :key="tag" size="small">
                    {{ tag }}
                  </el-tag>
                </div>
                <el-rate v-model="product.rating" allow-half disabled />
                <el-button type="primary" size="small" @click="store.addToCart(product)">
                  加入购物车
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-col>

      <el-col :lg="8" :md="24">
        <div class="card side">
          <div class="section-title">
            购物车
          </div>
          <div v-if="store.cart.length === 0" class="meta-text">
            暂无商品，点击“加入购物车”试试。
          </div>
          <div v-else>
            <div v-for="item in store.cart" :key="item.id" class="cart-item">
              <div class="info">
                <div class="name">
                  {{ item.name }}
                </div>
                <div class="meta-text">
                  ￥{{ item.price }}
                </div>
              </div>
              <el-input-number v-model="item.quantity" size="small" @change="val => store.updateQuantity(item.id, val)" />
              <el-button link type="danger" @click="store.removeCartItem(item.id)">
                移除
              </el-button>
            </div>
            <el-divider />
            <div class="total">
              合计：￥{{ store.cartTotal.toFixed(2) }}
            </div>
            <el-button type="success" round block>
              模拟结算
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
  import { useDataStore } from '@/stores/data'

  const store = useDataStore()
</script>

<style scoped>
.page {
  padding: 12px 18px 32px;
  background: var(--bg-primary);
  transition: background-color 0.3s ease;
}

.product {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 12px;
  padding: 10px;
  margin-bottom: 12px;
}

.cover {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 10px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name {
  font-weight: 700;
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.side {
  padding: 14px;
}

.cart-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.info .name {
  font-weight: 600;
}

.total {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}
</style>



