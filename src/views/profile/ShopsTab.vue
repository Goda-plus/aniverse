<template>
  <div class="shops-tab">
    <div class="shops-header">
      <h3 class="section-title">
        我的商铺
      </h3>
      <el-button type="primary" @click="goCreateShop">
        <el-icon><Plus /></el-icon>
        创建商铺
      </el-button>
    </div>

    <!-- 商铺列表 -->
    <div v-if="loading" class="shops-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    <div v-else-if="shops.length > 0" class="shops-list">
      <div
        v-for="shop in shops"
        :key="shop.shop_id"
        class="shop-item"
        @click="goShopDetail(shop)"
      >
        <div class="shop-content">
          <div class="shop-logo">
            <img
              v-if="shop.logo"
              :src="logoUrl(shop.logo)"
              alt="店铺头像"
            >
            <div v-else class="logo-placeholder">
              店
            </div>
          </div>
          <div class="shop-info">
            <div class="shop-name-row">
              <h4 class="shop-name">
                {{ shop.shop_name }}
              </h4>
              <div class="shop-badges">
                <el-tag
                  v-if="shop.status === 'active'"
                  type="success"
                  size="small"
                  effect="plain"
                >
                  营业中
                </el-tag>
                <el-tag
                  v-else
                  type="info"
                  size="small"
                  effect="plain"
                >
                  {{ shop.status || '未知' }}
                </el-tag>
              </div>
            </div>
            <p v-if="shop.description" class="shop-description">
              {{ shop.description }}
            </p>
            <div class="shop-meta">
              <span class="meta-item">
                <el-icon><Goods /></el-icon>
                商品 {{ shop.product_count || 0 }}
              </span>
              <span class="meta-item">
                <el-icon><Sell /></el-icon>
                销量 {{ shop.total_sales || 0 }}
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(shop.created_at) }}
              </span>
            </div>
          </div>
          <div class="shop-actions" @click.stop>
            <el-button
              link
              type="primary"
              @click="goShopDetail(shop)"
            >
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button
              link
              type="primary"
              @click="goShopDetail(shop); $event.stopPropagation()"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <el-empty description="您还没有创建任何商铺">
        <el-button type="primary" @click="goCreateShop">
          创建商铺
        </el-button>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { Plus, View, Edit, Goods, Sell, Clock, Loading } from '@element-plus/icons-vue'
  import { getMyShop } from '@/axios/shop'

  const router = useRouter()
  const shops = ref([])
  const loading = ref(true)

  const fetchShops = async () => {
    loading.value = true
    try {
      const res = await getMyShop()
      if (res.success && res.data) {
        shops.value = Array.isArray(res.data) ? res.data : [res.data]
      } else {
        shops.value = []
      }
    } catch (err) {
      if (err.response?.status === 404) {
        shops.value = []
      } else {
        shops.value = []
        console.error('获取我的商铺失败:', err)
      }
    } finally {
      loading.value = false
    }
  }

  const logoUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    if (path.startsWith('/uploads/')) return `http://localhost:3000${path}`
    return path
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  }

  const goShopDetail = (shop) => {
    router.push({ name: 'shop-detail', params: { id: shop.shop_id } })
  }

  const goCreateShop = () => {
    router.push({ name: 'mall' })
  }

  onMounted(() => {
    fetchShops()
  })
</script>

<style scoped>
.shops-tab {
  padding: 20px 0;
}

.shops-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.shops-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: var(--text-secondary);
}

.shops-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shop-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
  cursor: pointer;
}

.shop-item:hover {
  border-color: var(--primary, #0079d3);
  box-shadow: 0 2px 8px rgba(0, 121, 211, 0.1);
}

.shop-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.shop-logo {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.shop-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shop-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.shop-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s;
}

.shop-item:hover .shop-name {
  color: var(--primary, #0079d3);
}

.shop-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.shop-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.shop-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.meta-item .el-icon {
  font-size: 14px;
}

.shop-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.empty-container {
  padding: 40px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .shop-content {
    flex-direction: column;
  }

  .shop-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
