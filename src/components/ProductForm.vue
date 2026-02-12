<template>
  <div class="product-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      size="large"
    >
      <!-- 基本信息 -->
      <div class="form-section">
        <h3 class="section-title">
          基本信息
        </h3>

        <el-form-item label="商品名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入商品名称"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="商品分类" prop="category_id">
          <el-select v-model="formData.category_id" placeholder="请选择商品分类" clearable>
            <el-option
              v-for="category in categories"
              :key="category.category_id"
              :label="category.category_name"
              :value="category.category_id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="4"
            placeholder="请输入商品详细描述"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="价格" prop="price">
              <el-input-number
                v-model="formData.price"
                :precision="2"
                :min="0"
                :max="999999"
                controls-position="right"
                placeholder="请输入价格"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原价">
              <el-input-number
                v-model="formData.original_price"
                :precision="2"
                :min="0"
                :max="999999"
                controls-position="right"
                placeholder="不填则不显示"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="库存" prop="stock">
              <el-input-number
                v-model="formData.stock"
                :min="0"
                :max="999999"
                controls-position="right"
                placeholder="请输入库存数量"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="重量(kg)">
              <el-input-number
                v-model="formData.weight"
                :precision="3"
                :min="0"
                :max="999"
                controls-position="right"
                placeholder="商品重量"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="商品标签">
          <el-input
            v-model="formData.tags"
            placeholder="多个标签用逗号分隔"
            maxlength="100"
          />
        </el-form-item>
      </div>

      <!-- 商品图片 -->
      <div class="form-section">
        <h3 class="section-title">
          商品图片
        </h3>

        <el-form-item label="商品图片" prop="images">
          <div class="image-upload">
            <div class="image-list">
              <div
                v-for="(image, index) in formData.images"
                :key="index"
                class="image-item"
              >
                <img :src="image" alt="商品图片">
                <div class="image-actions">
                  <el-button
                    size="small"
                    type="danger"
                    text
                    @click="removeImage(index)"
                  >
                    删除
                  </el-button>
                </div>
                <div class="image-sort">
                  <el-button
                    size="small"
                    :disabled="index === 0"
                    @click="moveImageUp(index)"
                  >
                    ↑
                  </el-button>
                  <el-button
                    size="small"
                    :disabled="index === formData.images.length - 1"
                    @click="moveImageDown(index)"
                  >
                    ↓
                  </el-button>
                </div>
              </div>
            </div>

            <el-upload
              ref="uploadRef"
              class="image-uploader"
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleImageSuccess"
              :on-error="handleImageError"
              :before-upload="beforeImageUpload"
              multiple
              accept="image/*"
            >
              <div class="upload-area">
                <el-icon class="upload-icon">
                  <Plus />
                </el-icon>
                <div class="upload-text">
                  点击上传图片
                </div>
                <div class="upload-hint">
                  最多上传9张图片
                </div>
              </div>
            </el-upload>
          </div>
        </el-form-item>
      </div>

      <!-- 商品规格 -->
      <div class="form-section">
        <h3 class="section-title">
          商品规格
        </h3>

        <el-form-item label="材质">
          <el-input
            v-model="formData.material"
            placeholder="请输入商品材质"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item label="尺寸">
          <el-input
            v-model="formData.dimensions"
            placeholder="例如：长20cm x 宽15cm x 高10cm"
            maxlength="100"
          />
        </el-form-item>

        <el-form-item label="规格参数">
          <div class="specs-editor">
            <div
              v-for="(spec, index) in specsList"
              :key="index"
              class="spec-item"
            >
              <el-input
                v-model="spec.key"
                placeholder="规格名称"
                style="width: 150px"
              />
              <el-input
                v-model="spec.value"
                placeholder="规格值"
                style="width: 200px; margin-left: 10px"
              />
              <el-button
                type="danger"
                size="small"
                style="margin-left: 10px"
                @click="removeSpec(index)"
              >
                删除
              </el-button>
            </div>
            <el-button type="primary" size="small" @click="addSpec">
              添加规格
            </el-button>
          </div>
        </el-form-item>
      </div>

      <!-- 其他设置 -->
      <div class="form-section">
        <h3 class="section-title">
          其他设置
        </h3>

        <el-form-item label="推荐商品">
          <el-switch v-model="formData.is_featured" />
          <span class="switch-hint">推荐商品会展示在店铺橱窗中</span>
        </el-form-item>
      </div>

      <!-- 表单操作 -->
      <div class="form-actions">
        <el-button @click="handleCancel">
          取消
        </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ mode === 'add' ? '添加商品' : '保存修改' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
  import { ref, reactive, computed, watch, onMounted, defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import { createProduct, updateProduct, listCategories } from '@/axios/mall'
  import { createProduct as createShopProduct } from '@/axios/shop'

  const props = defineProps({
    product: {
      type: Object,
      default: null
    },
    shopId: {
      type: [String, Number],
      required: true
    },
    mode: {
      type: String,
      default: 'add', // 'add' or 'edit'
      validator: (value) => ['add', 'edit'].includes(value)
    }
  })

  const emit = defineEmits(['success', 'cancel'])

  const formRef = ref(null)
  const uploadRef = ref(null)
  const submitting = ref(false)
  const categories = ref([])
  const specsList = ref([])

  // 表单数据
  const formData = reactive({
    name: '',
    category_id: null,
    description: '',
    price: null,
    original_price: null,
    stock: 0,
    images: [],
    material: '',
    dimensions: '',
    tags: '',
    weight: null,
    is_featured: false
  })

  // 表单验证规则
  const rules = {
    name: [
      { required: true, message: '请输入商品名称', trigger: 'blur' },
      { min: 1, max: 200, message: '商品名称长度在1-200个字符', trigger: 'blur' }
    ],
    category_id: [
      { required: true, message: '请选择商品分类', trigger: 'change' }
    ],
    description: [
      { required: true, message: '请输入商品描述', trigger: 'blur' },
      { min: 10, message: '商品描述至少10个字符', trigger: 'blur' }
    ],
    price: [
      { required: true, message: '请输入商品价格', trigger: 'blur' },
      { type: 'number', min: 0.01, message: '价格必须大于0', trigger: 'blur' }
    ],
    stock: [
      { required: true, message: '请输入库存数量', trigger: 'blur' },
      { type: 'number', min: 0, message: '库存不能为负数', trigger: 'blur' }
    ],
    images: [
      { type: 'array', min: 1, message: '请至少上传一张商品图片', trigger: 'change' }
    ]
  }

  // 上传相关
  const uploadUrl = '/api/upload/image'
  const uploadHeaders = {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }

  // 初始化表单数据
  const initFormData = () => {
    if (props.mode === 'edit' && props.product) {
      formData.name = props.product.name || ''
      formData.category_id = props.product.category_id || null
      formData.description = props.product.description || ''
      formData.price = props.product.price || null
      formData.original_price = props.product.original_price || null
      formData.stock = props.product.stock || 0
      formData.images = Array.isArray(props.product.images) ? [...props.product.images] : []
      formData.material = props.product.material || ''
      formData.dimensions = props.product.dimensions || ''
      formData.tags = props.product.tags || ''
      formData.weight = props.product.weight || null
      formData.is_featured = props.product.is_featured || false

      // 解析规格信息
      if (props.product.specifications) {
        try {
          const specs = typeof props.product.specifications === 'string'
            ? JSON.parse(props.product.specifications)
            : props.product.specifications

          specsList.value = Object.entries(specs).map(([key, value]) => ({
            key,
            value: String(value)
          }))
        } catch (error) {
          specsList.value = []
        }
      } else {
        specsList.value = []
      }
    } else {
      // 重置表单
      Object.keys(formData).forEach(key => {
        if (key === 'images') {
          formData[key] = []
        } else if (key === 'is_featured') {
          formData[key] = false
        } else if (key === 'stock') {
          formData[key] = 0
        } else {
          formData[key] = null
        }
      })
      specsList.value = []
    }
  }

  // 加载分类数据
  const loadCategories = async () => {
    try {
      const res = await listCategories()
      if (res.success) {
        categories.value = res.data.list || []
      }
    } catch (error) {
      console.error('加载分类失败:', error)
    }
  }

  // 规格管理
  const addSpec = () => {
    specsList.value.push({ key: '', value: '' })
  }

  const removeSpec = (index) => {
    specsList.value.splice(index, 1)
  }

  // 图片管理
  const handleImageSuccess = (response) => {
    if (response.success) {
      formData.images.push(response.data.url)
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(response.message || '上传失败')
    }
  }

  const handleImageError = () => {
    ElMessage.error('图片上传失败')
  }

  const beforeImageUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('上传图片大小不能超过 5MB!')
      return false
    }
    if (formData.images.length >= 9) {
      ElMessage.error('最多只能上传9张图片!')
      return false
    }
    return true
  }

  const removeImage = (index) => {
    formData.images.splice(index, 1)
  }

  const moveImageUp = (index) => {
    if (index > 0) {
      const temp = formData.images[index]
      formData.images[index] = formData.images[index - 1]
      formData.images[index - 1] = temp
    }
  }

  const moveImageDown = (index) => {
    if (index < formData.images.length - 1) {
      const temp = formData.images[index]
      formData.images[index] = formData.images[index + 1]
      formData.images[index + 1] = temp
    }
  }

  // 表单操作
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
    } catch (error) {
      return
    }

    try {
      submitting.value = true

      // 处理规格数据
      const specifications = {}
      specsList.value.forEach(spec => {
        if (spec.key && spec.value) {
          specifications[spec.key] = spec.value
        }
      })

      const submitData = {
        ...formData,
        shop_id: props.shopId,
        specifications
      }

      let res
      if (props.mode === 'add') {
        res = await createShopProduct(submitData)
      } else {
        res = await updateProduct(props.product.product_id, submitData)
      }

      if (res.success) {
        ElMessage.success(props.mode === 'add' ? '商品添加成功' : '商品修改成功')
        emit('success')
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } catch (error) {
      ElMessage.error('操作失败，请重试')
      console.error(error)
    } finally {
      submitting.value = false
    }
  }

  const handleCancel = () => {
    emit('cancel')
  }

  // 监听props变化
  watch(() => props.product, () => {
    initFormData()
  }, { immediate: true })

  watch(() => props.mode, () => {
    initFormData()
  })

  onMounted(() => {
    loadCategories()
    initFormData()
  })
</script>

<style lang="scss" scoped>
.product-form {
  max-height: 70vh;
  overflow-y: auto;

  .form-section {
    margin-bottom: 32px;

    .section-title {
      font-size: 16px;
      font-weight: bold;
      margin: 0 0 16px 0;
      color: var(--text-primary);
    }
  }

  .image-upload {
    .image-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;

      .image-item {
        position: relative;
        width: 100px;
        height: 100px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        overflow: hidden;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-actions {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          padding: 4px;
          opacity: 0;
          transition: opacity 0.3s ease;

          .el-button {
            color: white;
          }
        }

        .image-sort {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: space-between;
          padding: 2px;
          opacity: 0;
          transition: opacity 0.3s ease;

          .el-button {
            color: white;
            min-height: auto;
            padding: 2px 4px;
          }
        }

        &:hover {
          .image-actions,
          .image-sort {
            opacity: 1;
          }
        }
      }
    }

    .image-uploader {
      :deep(.el-upload) {
        width: 100px;
        height: 100px;
      }
    }

    .upload-area {
      width: 100px;
      height: 100px;
      border: 2px dashed var(--border-color);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: var(--el-color-primary);
        background-color: var(--bg-hover);
      }

      .upload-icon {
        font-size: 24px;
        color: var(--text-secondary);
        margin-bottom: 4px;
      }

      .upload-text {
        font-size: 12px;
        color: var(--text-primary);
      }

      .upload-hint {
        font-size: 10px;
        color: var(--text-secondary);
      }
    }
  }

  .specs-editor {
    .spec-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 12px;
      }
    }
  }

  .switch-hint {
    font-size: 12px;
    color: var(--text-secondary);
    margin-left: 12px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }
}
</style>
