<template>
  <div>
    <!-- 店主批量操作栏 -->
    <div v-if="isOwner" class="owner-batch-bar">
      <div class="owner-batch-left">
        已选择 {{ selectedIds.length }} 个商品
      </div>
      <div class="owner-batch-actions">
        <el-button
          size="small"
          type="default"
          :disabled="products.length === 0 || batchLoading"
          @click="selectAll"
        >
          全选本页
        </el-button>
        <el-button
          size="small"
          type="success"
          :disabled="selectedIds.length === 0 || batchLoading"
          :loading="batchLoading"
          @click="batchSetStatus('active')"
        >
          批量上架
        </el-button>
        <el-button
          size="small"
          type="warning"
          :disabled="selectedIds.length === 0 || batchLoading"
          :loading="batchLoading"
          @click="batchSetStatus('inactive')"
        >
          批量下架
        </el-button>
        <el-button
          size="small"
          :disabled="selectedIds.length === 0 || batchLoading"
          @click="clearSelection"
        >
          清空
        </el-button>
      </div>
    </div>

    <div v-if="products.length === 0 && !loading" class="empty-state">
      <el-empty description="暂无商品" />
    </div>

    <div v-else class="products-grid">
      <div
        v-for="product in products"
        :key="product.product_id ?? product.id"
        class="product-wrap"
        :class="{ 'is-owner': isOwner }"
      >
        <el-checkbox
          v-if="isOwner"
          v-model="selectedIds"
          class="shelf-checkbox"
          :label="getProductId(product)"
          :disabled="!getProductId(product)"
          @click.stop
        />

        <ProductCard
          :product="product"
          :action="isOwner ? 'none' : 'cart'"
        />

        <el-button
          v-if="isOwner"
          class="edit-product"
          size="small"
          type="primary"
          @click.stop="emitEdit(product)"
        >
          编辑商品
        </el-button>

        <el-button
          v-if="isOwner"
          class="shelf-toggle"
          size="small"
          :type="getProductStatus(product) === 'active' ? 'warning' : 'success'"
          :loading="isToggling(product)"
          :disabled="isToggling(product)"
          @click.stop="toggleProductStatus(product)"
        >
          {{ getProductStatus(product) === 'active' ? '下架' : '上架' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import ProductCard from '@/components/ProductCard.vue'
  import { updateProduct } from '@/axios/shop'

  const props = defineProps({
    products: {
      type: Array,
      default: () => []
    },
    isOwner: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['refresh', 'edit'])

  // 用于避免重复点击导致多次请求
  const togglingIds = ref([])
  const batchLoading = ref(false)
  const selectedIds = ref([])

  const getProductId = (product) => product?.product_id ?? product?.id

  const getProductStatus = (product) => {
    if (product?.status) return product.status
    if (product?.is_listed !== undefined && product?.is_listed !== null) {
      return Number(product.is_listed) === 1 ? 'active' : 'inactive'
    }
    return 'active'
  }

  const isToggling = (product) => {
    const id = getProductId(product)
    return id !== undefined && togglingIds.value.includes(id)
  }

  // 翻页/刷新时清空选择，避免跨页勾选导致误操作
  watch(
    () => props.products,
    () => {
      selectedIds.value = []
    }
  )

  const clearSelection = () => {
    selectedIds.value = []
  }

  const selectAll = () => {
    const ids = props.products
      .map(p => getProductId(p))
      .filter(id => id !== undefined && id !== null)
    selectedIds.value = ids
  }

  const emitEdit = (product) => {
    emit('edit', product)
  }

  const toggleProductStatus = async (product) => {
    const id = getProductId(product)
    if (!id) {
      ElMessage.error('缺少商品ID，无法操作')
      return
    }

    if (isToggling(product)) return

    try {
      togglingIds.value = [...togglingIds.value, id]

      const currentStatus = getProductStatus(product)
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const actionText = newStatus === 'active' ? '上架' : '下架'

      const res = await updateProduct(id, { status: newStatus })
      if (res.success) {
        ElMessage.success(`${actionText}成功`)
        emit('refresh')
      } else {
        ElMessage.error(res.message || `${actionText}失败`)
      }
    } catch (error) {
      ElMessage.error('操作失败，请重试')
      console.error(error)
    } finally {
      togglingIds.value = togglingIds.value.filter(x => x !== id)
    }
  }

  const batchSetStatus = async (targetStatus) => {
    if (selectedIds.value.length === 0 || batchLoading.value) return

    const selectedCount = selectedIds.value.length
    const actionText = targetStatus === 'active' ? '上架' : '下架'

    try {
      await ElMessageBox.confirm(
        `确定要对选中的 ${selectedCount} 个商品进行${actionText}吗？`,
        `${actionText}确认`,
        {
          confirmButtonText: `确认${actionText}`,
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch (error) {
      // 用户取消
      if (error === 'cancel') return
      return
    }

    const productMap = new Map(props.products.map(p => [getProductId(p), p]))
    const ids = selectedIds.value.slice()

    let successCount = 0
    let failCount = 0

    try {
      batchLoading.value = true

      for (const id of ids) {
        const p = productMap.get(id)
        if (!p) continue

        try {
          const res = await updateProduct(id, { status: targetStatus })
          if (res.success) successCount++
          else failCount++
        } catch (e) {
          failCount++
          console.error(e)
        }
      }

      if (successCount > 0) {
        ElMessage.success(`成功${actionText} ${successCount} 个商品`)
      }
      if (failCount > 0) {
        ElMessage.warning(`失败 ${failCount} 个商品`)
      }

      if (successCount > 0) {
        emit('refresh')
        clearSelection()
      }
    } catch (error) {
      ElMessage.error('批量操作失败，请重试')
      console.error(error)
    } finally {
      batchLoading.value = false
    }
  }
</script>

<style scoped lang="scss">
.owner-batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: var(--card-bg);
}

.owner-batch-left {
  color: var(--text-secondary);
  font-size: 14px;
}

.owner-batch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.product-wrap {
  position: relative;
}

// 店主侧不需要“加入购物车”按钮
:deep(.product-wrap.is-owner .product-card .el-button) {
  display: none;
}

.shelf-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 3;
}

.shelf-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
}

.edit-product {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 2;
}

.empty-state {
  padding: 40px 0;
}

@media (max-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
}
</style>

