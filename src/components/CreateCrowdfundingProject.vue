<template>
  <el-dialog
    v-model="visible"
    title="发起创意众筹项目"
    width="800px"
    append-to-body
    :close-on-click-modal="false"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      size="large"
    >
      <!-- 基本信息 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-title">
            <el-icon><DocumentAdd /></el-icon>
            项目基本信息
          </div>
        </template>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="项目标题" prop="title">
              <el-input
                v-model="form.title"
                placeholder="给你的创意项目起一个吸引人的名字"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="目标金额" prop="goal_amount">
              <el-input-number
                v-model="form.goal_amount"
                :min="1"
                :max="1000000"
                :precision="0"
                controls-position="right"
                placeholder="最低1元"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="项目分类" prop="category">
              <el-select v-model="form.category" placeholder="选择项目分类" style="width: 100%">
                <el-option label="手办模型" value="手办模型" />
                <el-option label="动漫周边" value="动漫周边" />
                <el-option label="服饰配件" value="服饰配件" />
                <el-option label="海报挂画" value="海报挂画" />
                <el-option label="其他创意" value="其他创意" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="开始时间" prop="start_date">
              <el-date-picker
                v-model="form.start_date"
                type="datetime"
                placeholder="选择开始时间"
                :disabled-date="disabledStartDate"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="结束时间" prop="end_date">
              <el-date-picker
                v-model="form.end_date"
                type="datetime"
                placeholder="选择结束时间"
                :disabled-date="disabledEndDate"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="项目封面" prop="cover_image">
              <el-upload
                ref="uploadRef"
                class="cover-upload"
                :http-request="handleCoverUpload"
                :show-file-list="false"
                :before-upload="beforeCoverUpload"
                :auto-upload="true"
              >
                <div v-if="form.cover_image" class="cover-preview">
                  <el-image :src="form.cover_image" class="preview-image" fit="cover" />
                  <div class="cover-overlay">
                    <el-icon><Edit /></el-icon>
                    <span>更换封面</span>
                  </div>
                </div>
                <div v-else class="cover-placeholder">
                  <el-icon><Plus /></el-icon>
                  <div class="placeholder-text">
                    <p>点击上传封面图片</p>
                    <p class="hint">
                      建议尺寸: 800x600px
                    </p>
                  </div>
                </div>
              </el-upload>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="项目描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="6"
                placeholder="详细描述你的创意项目理念、设计思路和目标用户等"
                maxlength="2000"
                show-word-limit
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="风险描述" prop="risk_description">
              <el-input
                v-model="form.risk_description"
                type="textarea"
                :rows="4"
                placeholder="描述项目可能存在的风险和挑战，让支持者更清楚了解"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 支持档位 -->
      <el-card class="form-section" shadow="never">
        <template #header>
          <div class="section-title">
            <el-icon><PriceTag /></el-icon>
            支持档位设置
            <el-button type="primary" size="small" @click="addTier">
              <el-icon><Plus /></el-icon>
              添加档位
            </el-button>
          </div>
        </template>

        <div v-if="form.tiers.length === 0" class="no-tiers">
          <el-empty description="还没有添加支持档位">
            <el-button type="primary" @click="addTier">
              添加第一个档位
            </el-button>
          </el-empty>
        </div>

        <div v-else class="tiers-list">
          <el-card
            v-for="(tier, index) in form.tiers"
            :key="index"
            class="tier-card"
            shadow="hover"
          >
            <template #header>
              <div class="tier-header">
                <span class="tier-title">档位 {{ index + 1 }}</span>
                <el-button type="danger" size="small" @click="removeTier(index)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </template>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item
                  :label="`档位名称`"
                  :prop="`tiers.${index}.title`"
                  :rules="{ required: true, message: '请输入档位名称', trigger: 'blur' }"
                >
                  <el-input
                    v-model="tier.title"
                    placeholder="例如：基础支持、豪华版等"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item
                  :label="`支持金额`"
                  :prop="`tiers.${index}.amount`"
                  :rules="{ required: true, message: '请输入支持金额', trigger: 'blur' }"
                >
                  <el-input-number
                    v-model="tier.amount"
                    :min="1"
                    :max="100000"
                    :precision="0"
                    controls-position="right"
                    placeholder="金额（元）"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item
                  :label="`最大支持者数`"
                  :prop="`tiers.${index}.max_backers`"
                >
                  <el-input-number
                    v-model="tier.max_backers"
                    :min="1"
                    :max="10000"
                    :precision="0"
                    controls-position="right"
                    placeholder="留空表示无限制"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="12">
                <el-form-item
                  :label="`预计发货时间`"
                  :prop="`tiers.${index}.estimated_delivery`"
                >
                  <el-date-picker
                    v-model="tier.estimated_delivery"
                    type="month"
                    placeholder="选择月份"
                    format="YYYY-MM"
                    value-format="YYYY-MM"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-form-item
                  :label="`回报内容`"
                  :prop="`tiers.${index}.reward_description`"
                  :rules="{ required: true, message: '请输入回报内容', trigger: 'blur' }"
                >
                  <el-input
                    v-model="tier.reward_description"
                    type="textarea"
                    :rows="3"
                    placeholder="详细描述这个档位的回报内容"
                  />
                </el-form-item>
              </el-col>

              <el-col :span="24">
                <el-form-item :label="`包含运费`">
                  <el-checkbox v-model="tier.shipping_included">
                    支持者无需额外支付运费
                  </el-checkbox>
                </el-form-item>
              </el-col>
            </el-row>
          </el-card>
        </div>
      </el-card>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          取消
        </el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ submitting ? '创建中...' : '创建项目' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, reactive, nextTick, defineProps, defineEmits, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    DocumentAdd,
    PriceTag,
    Plus,
    Delete,
    Edit
  } from '@element-plus/icons-vue'
  import { createCrowdfundingProject, uploadPostImage } from '@/axios/api.js'

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:visible', 'success'])

  const visible = ref(false)
  const submitting = ref(false)
  const formRef = ref()
  const uploadRef = ref()

  // 表单数据
  const form = reactive({
    title: '',
    description: '',
    cover_image: '',
    goal_amount: null,
    start_date: '',
    end_date: '',
    category: '',
    risk_description: '',
    tiers: []
  })

  // 表单验证规则
  const rules = {
    title: [
      { required: true, message: '请输入项目标题', trigger: 'blur' },
      { min: 5, max: 100, message: '标题长度在5-100个字符', trigger: 'blur' }
    ],
    description: [
      { required: true, message: '请输入项目描述', trigger: 'blur' },
      { min: 50, max: 2000, message: '描述长度在50-2000个字符', trigger: 'blur' }
    ],
    goal_amount: [
      { required: true, message: '请输入目标金额', trigger: 'change' },
      { type: 'number', min: 1, message: '目标金额至少为1元', trigger: 'change' }
    ],
    start_date: [
      { required: true, message: '请选择开始时间', trigger: 'change' }
    ],
    end_date: [
      { required: true, message: '请选择结束时间', trigger: 'change' }
    ],
    category: [
      { required: true, message: '请选择项目分类', trigger: 'change' }
    ],
    cover_image: [
      { required: true, message: '请上传项目封面', trigger: 'change' }
    ]
  }

  // 监听props变化
  watch(() => props.visible, (newVal) => {
    visible.value = newVal
  })

  // 监听visible变化
  watch(visible, (newVal) => {
    emit('update:visible', newVal)
  })

  // 禁用开始日期
  const disabledStartDate = (time) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return time.getTime() < now.getTime()
  }

  // 禁用结束日期
  const disabledEndDate = (time) => {
    if (!form.start_date) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      return time.getTime() < now.getTime()
    }
    const startTime = new Date(form.start_date)
    return time.getTime() < startTime.getTime()
  }

  // 添加档位
  const addTier = () => {
    form.tiers.push({
      title: '',
      amount: null,
      max_backers: null,
      reward_description: '',
      estimated_delivery: '',
      shipping_included: false
    })
  }

  // 删除档位
  const removeTier = async (index) => {
    try {
      await ElMessageBox.confirm('确定删除这个档位吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      form.tiers.splice(index, 1)
    } catch {
    // 用户取消删除
    }
  }

  // 自定义封面上传方法
  const handleCoverUpload = async (options) => {
    const formData = new FormData()
    formData.append('image', options.file)

    try {
      const response = await uploadPostImage(options.file)

      if (response.success) {
        form.cover_image = response.data.url
        ElMessage.success('封面上传成功')
      } else {
        ElMessage.error(response.message || '封面上传失败')
      }
    } catch (error) {
      console.error('上传失败:', error)
      ElMessage.error('封面上传失败，请重试')
    }
  }

  // 封面上传前验证
  const beforeCoverUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('图片大小不能超过5MB!')
      return false
    }
    return true
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
    } catch {
      return
    }

    if (form.tiers.length === 0) {
      ElMessage.error('请至少添加一个支持档位')
      return
    }

    // 验证档位数据
    for (let i = 0; i < form.tiers.length; i++) {
      const tier = form.tiers[i]
      if (!tier.title || !tier.amount || !tier.reward_description) {
        ElMessage.error(`请完善第${i + 1}个档位的信息`)
        return
      }
    }

    submitting.value = true

    try {
      const response = await createCrowdfundingProject(form)
      if (response.success) {
        ElMessage.success('项目创建成功！')
        emit('success', response.data.project_id)
        handleClose()
      } else {
        ElMessage.error(response.message || '创建失败')
      }
    } catch (error) {
      console.error('创建项目失败:', error)
      ElMessage.error('创建失败，请重试')
    } finally {
      submitting.value = false
    }
  }

  // 关闭对话框
  const handleClose = async () => {
    if (Object.values(form).some(value =>
      (typeof value === 'string' && value.trim()) ||
      (typeof value === 'number' && value) ||
      (Array.isArray(value) && value.length > 0)
    )) {
      try {
        await ElMessageBox.confirm('确定关闭吗？未保存的内容将丢失', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
      } catch {
        return
      }
    }

    // 重置表单
    Object.assign(form, {
      title: '',
      description: '',
      cover_image: '',
      goal_amount: null,
      start_date: '',
      end_date: '',
      category: '',
      risk_description: '',
      tiers: []
    })

    formRef.value?.clearValidate()
    visible.value = false
  }
</script>

<style scoped>
.form-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.cover-upload {
  width: 100%;
}

.cover-preview {
  position: relative;
  width: 200px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.cover-preview:hover .cover-overlay {
  opacity: 1;
}

.cover-placeholder {
  width: 200px;
  height: 150px;
  border: 2px dashed var(--border-color);
  background: var(--card-bg);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.cover-placeholder:hover {
  border-color: var(--primary);
}

.placeholder-text {
  text-align: center;
  color: var(--text-secondary);
}

.placeholder-text p {
  margin: 4px 0;
}

.hint {
  font-size: 12px;
}

.no-tiers {
  text-align: center;
  padding: 40px 0;
}

.tiers-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tier-card {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.tier-title {
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-footer {
  text-align: right;
}
</style>
