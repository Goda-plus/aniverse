<template>
  <div class="address-manage">
    <div class="address-header">
      <h3 class="section-title">
        收货地址
      </h3>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增地址
      </el-button>
    </div>

    <!-- 地址列表 -->
    <div v-if="addresses.length > 0" class="addresses-list">
      <div
        v-for="address in addresses"
        :key="address.id"
        class="address-item"
        :class="{ 'is-default': address.is_default }"
      >
        <el-descriptions
          class="address-descriptions descriptions-theme"
          :column="2"
          border
          :label-style="{
            width: '80px',
            textAlign: 'center',
            fontWeight: 'bold',
            backgroundColor: 'var(--table-label-bg)'
          }"
          :content-style="{
            padding: '12px',
            color: 'var(--text-primary)'
          }"
        >
          <template #extra>
            <div class="address-actions">
              <el-button
                link
                type="primary"
                style="color: var(--text-primary);"
                @click="handleEdit(address)"
              >
                编辑
              </el-button>
              <el-button
                v-if="!address.is_default"
                link
                type="primary"
                @click="handleSetDefault(address.id)"
              >
                设为默认
              </el-button>
              <el-button
                link
                type="danger"
                @click="handleDelete(address.id)"
              >
                删除
              </el-button>
            </div>
          </template>

          <el-descriptions-item label="收货人">
            <div class="address-item-line">
              <span class="recipient-name">{{ address.recipient_name }}</span>
              <el-tag
                v-if="address.is_default"
                type="success"
                size="small"
                effect="dark"
              >
                默认
              </el-tag>
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="手机号">
            <span class="recipient-phone">{{ address.phone }}</span>
          </el-descriptions-item>

          <el-descriptions-item label="地址">
            <div class="address-detail">
              {{ address.province }} {{ address.city }} {{ address.district }}
            </div>
          </el-descriptions-item>

          <el-descriptions-item label="详细地址">
            <div class="address-detail">
              {{ address.detail_address }}
            </div>
          </el-descriptions-item>

          <el-descriptions-item
            v-if="address.postal_code"
            label="邮编"
          >
            <div class="postal-code">
              {{ address.postal_code }}
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <el-empty description="暂无收货地址">
        <el-button type="primary" @click="handleAdd">
          新增地址
        </el-button>
      </el-empty>
    </div>

    <!-- 地址编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingAddress ? '编辑地址' : '新增地址'"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item label="收货人" prop="recipient_name">
          <el-input v-model="formData.recipient_name" placeholder="请输入收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="formData.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="所在地区" prop="province">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-input v-model="formData.province" placeholder="省" />
            </el-col>
            <el-col :span="8">
              <el-input v-model="formData.city" placeholder="市" />
            </el-col>
            <el-col :span="8">
              <el-input v-model="formData.district" placeholder="区/县" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="详细地址" prop="detail_address">
          <el-input
            v-model="formData.detail_address"
            type="textarea"
            :rows="3"
            placeholder="请输入详细地址"
          />
        </el-form-item>
        <el-form-item label="邮编">
          <el-input v-model="formData.postal_code" placeholder="请输入邮编（可选）" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="formData.is_default">
            设为默认地址
          </el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted ,defineExpose} from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { listAddresses, addAddress, updateAddress, deleteAddress } from '@/axios/mall'

  const addresses = ref([])
  const dialogVisible = ref(false)
  const editingAddress = ref(null)
  const formRef = ref(null)

  const formData = ref({
    recipient_name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail_address: '',
    postal_code: '',
    is_default: false
  })

  const formRules = {
    recipient_name: [
      { required: true, message: '请输入收货人姓名', trigger: 'blur' }
    ],
    phone: [
      { required: true, message: '请输入手机号', trigger: 'blur' },
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
    ],
    province: [
      { required: true, message: '请输入省份', trigger: 'blur' }
    ],
    city: [
      { required: true, message: '请输入城市', trigger: 'blur' }
    ],
    district: [
      { required: true, message: '请输入区/县', trigger: 'blur' }
    ],
    detail_address: [
      { required: true, message: '请输入详细地址', trigger: 'blur' }
    ]
  }

  // 获取地址列表
  const fetchAddresses = async () => {
    try {
      const response = await listAddresses()
      if (response.code === 200) {
        addresses.value = response.data || []
      } else {
        ElMessage.error(response.message || '获取地址列表失败')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '获取地址列表失败')
    }
  }

  // 新增地址
  const handleAdd = () => {
    editingAddress.value = null
    formData.value = {
      recipient_name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail_address: '',
      postal_code: '',
      is_default: false
    }
    dialogVisible.value = true
  }

  // 编辑地址
  const handleEdit = (address) => {
    editingAddress.value = address
    formData.value = {
      recipient_name: address.recipient_name,
      phone: address.phone,
      province: address.province,
      city: address.city,
      district: address.district,
      detail_address: address.detail_address,
      postal_code: address.postal_code || '',
      is_default: address.is_default === 1 || address.is_default === true
    }
    dialogVisible.value = true
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (valid) => {
      if (valid) {
        try {
          if (editingAddress.value) {
            await updateAddress(editingAddress.value.id, formData.value)
            ElMessage.success('更新地址成功')
          } else {
            await addAddress(formData.value)
            ElMessage.success('添加地址成功')
          }
          dialogVisible.value = false
          fetchAddresses()
        } catch (error) {
          ElMessage.error(error.response?.data?.message || '操作失败')
        }
      }
    })
  }

  // 设为默认
  const handleSetDefault = async (addressId) => {
    try {
      await updateAddress(addressId, { is_default: true })
      ElMessage.success('设置成功')
      fetchAddresses()
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '设置失败')
    }
  }

  // 删除地址
  const handleDelete = async (addressId) => {
    try {
      await ElMessageBox.confirm('确定要删除这个地址吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteAddress(addressId)
      ElMessage.success('删除成功')
      fetchAddresses()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '删除失败')
      }
    }
  }

  // 对话框关闭
  const handleDialogClose = () => {
    formRef.value?.resetFields()
    editingAddress.value = null
  }

  onMounted(() => {
    fetchAddresses()
  })

  // 暴露方法供父组件调用刷新
  defineExpose({
    fetchAddresses
  })
</script>

<style scoped>
.address-manage {
  padding: 20px 0;
}

.address-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--el-text-color-primary);
}

.addresses-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.address-item {
  border: 2px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
}

.address-item.is-default {
  border-color: var(--el-color-primary);
}

.address-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.address-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.recipient-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.recipient-phone {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.address-detail {
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.postal-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.address-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.empty-container {
  padding: 40px 0;
  text-align: center;
}

@media (max-width: 768px) {
  .address-content {
    flex-direction: column;
  }

  .address-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>


