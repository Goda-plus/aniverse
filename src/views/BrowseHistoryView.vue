<template>
  <MainContentLayout :sidebar="false">
    <template #content>
      <div class="browse-history-page">
        <!-- 页面标题 -->
        <div class="page-header">
          <h1 class="page-title">
            <el-icon><Clock /></el-icon>
            商品浏览足迹
          </h1>
          <el-button
            v-if="historyList.length > 0"
            type="danger"
            link
            @click="handleClearAll"
          >
            清空全部
          </el-button>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="5" animated />
        </div>

        <!-- 浏览历史列表 -->
        <div v-else-if="historyList.length > 0" class="history-content">
          <div class="history-list">
            <div
              v-for="item in historyList"
              :key="item.id"
              class="history-item"
            >
              <div class="history-item-content" @click="handleItemClick(item)">
                <el-image
                  :src="getItemImage(item)"
                  :alt="getItemTitle(item)"
                  class="history-item-image"
                  fit="cover"
                >
                  <template #error>
                    <div class="image-slot">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div class="history-item-info">
                  <div class="history-item-title">
                    {{ getItemTitle(item) }}
                  </div>
                  <div class="history-item-meta">
                    <span class="history-item-time">
                      {{ formatTime(item.last_visited_at) }}
                    </span>
                    <span v-if="item.product?.price" class="history-item-price">
                      ¥{{ item.product.price }}
                    </span>
                  </div>
                </div>
              </div>
              <el-button
                text
                type="danger"
                class="delete-btn"
                @click.stop="handleDeleteItem(item)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="total > pageSize" class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :total="total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handlePageChange"
            />
          </div>
        </div>

        <!-- 空状态 -->
        <el-empty v-else description="暂无商品浏览记录" />
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Clock, Delete, Picture } from '@element-plus/icons-vue'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { getBrowseHistory, deleteHistoryItem, clearAllHistory } from '@/axios/browse'
  import { useUserStore } from '@/stores/user'

  const router = useRouter()
  const userStore = useUserStore()

  const loading = ref(false)
  const historyList = ref([])
  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)

  // 获取浏览历史
  const fetchHistory = async () => {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }

    loading.value = true
    try {
      const response = await getBrowseHistory({
        page: currentPage.value,
        pageSize: pageSize.value
      })

      if (response.success && response.data) {
        // 处理返回的数据，可能是 posts 数组或直接是数组
        const items = response.data.posts || response.data.list || (Array.isArray(response.data) ? response.data : [])
        // 只显示商品类型的浏览记录
        const productItems = items.filter(item => item.target_type === 'product')
        historyList.value = productItems
        total.value = response.data.total || response.data.count || productItems.length
      } else {
        historyList.value = []
        total.value = 0
      }
    } catch (error) {
      console.error('加载浏览历史失败:', error)
      ElMessage.error('加载浏览历史失败')
      historyList.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return '未知时间'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取项目图片
  const getItemImage = (item) => {
    if (item.product?.cover_image) {
      return item.product.cover_image
    }
    // 如果没有 product 对象，尝试从其他字段获取
    return item.cover_image || '/placeholder.png'
  }

  // 获取项目标题
  const getItemTitle = (item) => {
    if (item.product?.name) {
      return item.product.name
    }
    // 如果没有 product 对象，尝试从其他字段获取
    return item.name || item.product_name || '商品'
  }

  // 点击项目
  const handleItemClick = (item) => {
    const productId = item.product?.id || item.target_id
    if (productId) {
      router.push(`/mall/product/${productId}`)
    }
  }

  // 删除单个项目
  const handleDeleteItem = async (item) => {
    try {
      await ElMessageBox.confirm('确定要删除这条浏览记录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      const response = await deleteHistoryItem({
        target_type: 'product',
        target_id: item.product?.id || item.target_id
      })

      if (response.success) {
        ElMessage.success('删除成功')
        await fetchHistory()
      } else {
        ElMessage.error(response.message || '删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除失败:', error)
        ElMessage.error('删除失败')
      }
    }
  }

  // 清空全部
  const handleClearAll = async () => {
    try {
      await ElMessageBox.confirm('确定要清空所有浏览记录吗？此操作不可恢复！', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      // 清空时只清空商品类型的浏览记录
      const response = await clearAllHistory({ target_type: 'product' })

      if (response.success) {
        ElMessage.success('清空成功')
        await fetchHistory()
      } else {
        ElMessage.error(response.message || '清空失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('清空失败:', error)
        ElMessage.error('清空失败')
      }
    }
  }

  // 分页处理
  const handleSizeChange = (val) => {
    pageSize.value = val
    currentPage.value = 1
    fetchHistory()
  }

  const handlePageChange = (val) => {
    currentPage.value = val
    fetchHistory()
  }

  onMounted(() => {
    if (userStore.isLoggedIn) {
      fetchHistory()
    } else {
      ElMessage.warning('请先登录')
    }
  })
</script>

<style scoped>
.browse-history-page {
  padding: 24px;
  min-height: calc(100vh - 48px);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-container {
  padding: 24px 0;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.history-item:hover {
  background: var(--bg-hover);
  border-color: var(--text-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-item-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
}

.history-item-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  flex-shrink: 0;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 24px;
}

.history-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-item:hover .history-item-title {
  color: var(--primary);
}

.history-item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.history-item-time {
  font-size: 14px;
  color: var(--text-secondary);
}

.history-item-price {
  font-size: 16px;
  font-weight: 600;
  color: #ff4500;
}

.delete-btn {
  flex-shrink: 0;
  padding: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}
</style>

