<template>
  <div v-if="userStore.isLoggedIn" class="floating-action-buttons">
    <!-- 浏览足迹按钮 -->
    <el-tooltip content="浏览足迹" placement="left">
      <el-button
        class="fab-button history-btn"
        circle
        type="primary"
        :icon="Clock"
        @click="goToBrowseHistory"
      />
    </el-tooltip>

    <!-- 购物车按钮 -->
    <el-tooltip content="购物车" placement="left">
      <el-button
        class="fab-button cart-btn"
        circle
        type="primary"
        :icon="ShoppingCartFull"
        @click="goToShoppingCart"
      />
    </el-tooltip>
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router'
  import { Clock, ShoppingCartFull } from '@element-plus/icons-vue'
  import { useUserStore } from '@/stores/user'

  const router = useRouter()
  const userStore = useUserStore()

  const goToShoppingCart = () => {
    router.push('/mall/cart')
  }

  const goToBrowseHistory = () => {
    router.push('/browse-history')
  }
</script>

<style scoped>
.floating-action-buttons {
  position: fixed;
  right: 10px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  justify-items: center;
  align-items: baseline;
  gap: 16px;
  z-index: 999;
}

.fab-button {
  width: 56px;
  height: 56px;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.fab-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.fab-button:active {
  transform: translateY(0);
}

.cart-btn {
  background: #ff4500;
  border-color: #ff4500;
}

.cart-btn:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.history-btn {
  background: #409eff;
  border-color: #409eff;
}

.history-btn:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .floating-action-buttons {
    right: 16px;
    bottom: 16px;
  }

  .fab-button {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }
}
</style>

