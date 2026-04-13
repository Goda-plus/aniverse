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
              :key="category.id"
              :label="category.name"
              :value="category.id"
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
              :show-file-list="false"
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
                  最多 9 张；可上传文件或下方添加 http(s) 外链
                </div>
              </div>
            </el-upload>
            <div class="image-url-row">
              <el-input
                v-model="imageUrlInput"
                type="textarea"
                :rows="2"
                placeholder="粘贴图片 URL，多条可用换行、逗号或分号分隔（每张需 http 或 https）"
                clearable
              />
              <el-button class="image-url-add-btn" @click="addImageUrlsFromInput">
                添加链接
              </el-button>
            </div>
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

      <!-- 商品详情 -->
      <div class="form-section">
        <h3 class="section-title">
          商品详情
        </h3>

        <el-form-item label="详情介绍" prop="detail_html">
          <div class="detail-editor-wrapper">
            <Toolbar
              v-if="detailEditorRef"
              :editor="detailEditorRef"
              :default-config="detailToolbarConfig"
              class="detail-editor-toolbar"
            />
            <Editor
              :key="detailEditorKey"
              v-model="formData.detail_html"
              :default-config="detailEditorConfig"
              class="detail-editor"
              @on-created="handleDetailEditorCreated"
            />
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
  import { ref, reactive, computed, watch, onMounted, defineProps, defineEmits, shallowRef } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import '@wangeditor/editor/dist/css/style.css'
  import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
  import { listCategories } from '@/axios/mall'
  import { createProduct as createShopProduct, updateProduct as updateShopProduct } from '@/axios/shop'
  import { uploadPostImage } from '@/axios/post'
  import { parseProductImageUrls } from '@/utils/productImages'

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
  const detailEditorRef = shallowRef(null)
  const detailEditorKey = ref(0)
  const imageUrlInput = ref('')

  // 表单数据
  const formData = reactive({
    name: '',
    category_id: null,
    description: '',
    detail_html: '',
    detail_text: '',
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
    ],
    detail_html: [
      { required: false, trigger: 'blur' }
    ]
  }

  const normalizeUploadedUrl = (res) => {
    if (!res) return ''
    if (res.success && res.code === 200 && res.data?.url) return res.data.url
    if (res.code === 200 && res.data?.url) return res.data.url
    if (res.url) return res.url
    if (res.data?.url) return res.data.url
    return ''
  }

  /** 接口 cover_image 为 JSON 数组字符串；表单 images 为 URL 字符串数组 */
  const parseProductImagesFromRecord = (product) => {
    if (!product || typeof product !== 'object') return []
    const rawList = product.images
    if (Array.isArray(rawList) && rawList.length) {
      return rawList.map((u) => (typeof u === 'string' ? u : u?.url || u?.image_url || '')).filter(Boolean)
    }
    if (typeof rawList === 'string' && rawList.trim()) {
      const fromJson = parseProductImageUrls(rawList)
      if (fromJson.length) return fromJson
      return [rawList.trim()]
    }
    return parseProductImageUrls(product.cover_image)
  }

  const addImageUrlsFromInput = () => {
    const raw = (imageUrlInput.value || '').trim()
    if (!raw) {
      ElMessage.warning('请输入图片地址')
      return
    }
    const parts = raw.split(/[\n,，;；]+/).map(s => s.trim()).filter(Boolean)
    let added = 0
    for (const part of parts) {
      if (formData.images.length >= 9) break
      try {
        const u = new URL(part)
        if (!/^https?:$/i.test(u.protocol)) continue
      } catch {
        continue
      }
      if (formData.images.includes(part)) continue
      formData.images.push(part)
      added++
    }
    if (added === 0) {
      ElMessage.warning('没有添加有效链接（需以 http:// 或 https:// 开头）')
      return
    }
    imageUrlInput.value = ''
    ElMessage.success(added === 1 ? '已添加 1 张' : `已添加 ${added} 张`)
  }

  // 详情编辑器配置（复用帖子图片上传接口）
  const detailToolbarConfig = reactive({
    excludeKeys: []
  })

  const detailEditorConfig = reactive({
    placeholder: '请输入商品详情介绍（支持图文）...',
    readOnly: false,
    autoFocus: false,
    MENU_CONF: {
      uploadImage: {
        async customUpload (file, insertFn) {
          try {
            const maxSize = 5 * 1024 * 1024
            if (file.size > maxSize) {
              ElMessage.error('图片大小不能超过 5MB')
              return
            }
            if (!file.type.startsWith('image/')) {
              ElMessage.error('只能上传图片文件')
              return
            }
            const res = await uploadPostImage(file)
            const url = normalizeUploadedUrl(res)
            if (!url) {
              ElMessage.error('上传失败')
              return
            }
            insertFn(url, '', url)
          } catch (error) {
            ElMessage.error(error?.response?.data?.message || '上传失败，请重试')
          }
        },
        maxFileSize: 5 * 1024 * 1024,
        allowedFileTypes: ['image/*']
      }
    }
  })

  const handleDetailEditorCreated = (editor) => {
    detailEditorRef.value = editor
  }

  const getDetailHtml = () => {
    const editor = detailEditorRef.value
    if (!editor || editor.isDestroyed) return formData.detail_html || ''
    try {
      return editor.getHtml() || formData.detail_html || ''
    } catch (e) {
      return formData.detail_html || ''
    }
  }

  const getDetailText = () => {
    const editor = detailEditorRef.value
    if (!editor || editor.isDestroyed) return ''
    try {
      return editor.getText() || ''
    } catch (e) {
      return ''
    }
  }

  // 商品图片上传使用 before-upload 手动上传
  // 初始化表单数据
  const initFormData = () => {
    imageUrlInput.value = ''
    if (props.mode === 'edit' && props.product) {
      formData.name = props.product.name || ''
      formData.category_id = props.product.category_id || null
      formData.description = props.product.description || ''
      formData.detail_html = props.product.detail_html || ''
      formData.detail_text = props.product.detail_text || ''
      formData.price = props.product.price ?? null
      formData.original_price = props.product.original_price ?? null
      formData.stock = props.product.stock ?? 0
      formData.images = parseProductImagesFromRecord(props.product)
      formData.material = props.product.material || ''
      formData.dimensions = props.product.dimensions || ''
      formData.tags = props.product.tags || ''
      formData.weight = props.product.weight ?? null
      formData.is_featured = Boolean(props.product.is_featured)

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
        } else if (key === 'detail_html' || key === 'detail_text') {
          formData[key] = ''
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
      console.log('categories', categories.value)
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
  const beforeImageUpload = async (file) => {
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

    try {
      const res = await uploadPostImage(file)
      if (res.success) {
        formData.images.push(res.data.url)
        ElMessage.success('图片上传成功')
      } else {
        ElMessage.error(res.message || '上传失败')
      }
    } catch (error) {
      console.error('图片上传失败:', error)
      ElMessage.error('图片上传失败')
    }

    // 阻止 el-upload 继续默认上传
    return false
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
      console.error('表单验证失败:', error)
      ElMessage.warning('请先完善表单必填项')
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

      const finalDetailHtml = getDetailHtml()
      const finalDetailText = getDetailText()

      const submitData = {
        ...formData,
        shop_id: props.shopId,
        specifications,
        detail_html: finalDetailHtml,
        detail_text: finalDetailText
      }

      let res
      if (props.mode === 'add') {
        res = await createShopProduct(submitData)
      } else {
        res = await updateShopProduct(props.product.product_id, submitData)
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

    .image-url-row {
      margin-top: 12px;
      max-width: 480px;

      .image-url-add-btn {
        margin-top: 8px;
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

  .detail-editor-wrapper {
    width: 100%;
    border: 1px solid var(--card-border);
    border-radius: 6px;
    overflow: visible;
    background: var(--card-bg);
    display: flex;
    flex-direction: column;
  }

  .detail-editor-toolbar {
    border-bottom: 1px solid var(--card-border);
    flex-shrink: 0;
  }

  .detail-editor {
    height: 320px;
    overflow: hidden;
  }

  /* 保持圆角效果，但不要裁切编辑器弹窗 */
  :deep(.w-e-text-container),
  :deep(.w-e-toolbar),
  :deep(.w-e-bar) {
    border-radius: 6px;
  }

  :deep(.w-e-text-container) {
    /* 让编辑区自己滚动；避免裁切 wangEditor 的弹窗（插入图片等） */
    overflow-y: auto;
    overflow-x: hidden;
    height: 450px;
  }
}
</style>
