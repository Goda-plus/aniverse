<template>
  <el-dialog
    v-model="visibleProxy"
    title="编辑社区"
    width="800px"
    append-to-body
    @close="handleClose"
  >
    <el-form
      ref="editFormRef"
      :model="formData"
      :rules="editFormRules"
      label-width="100px"
    >
      <el-form-item label="社区头像">
        <div class="avatar-upload-section">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :before-upload="beforeAvatarUpload"
            :http-request="handleAvatarUpload"
            accept="image/*"
          >
            <div v-if="avatarPreview || formData.image_url" class="avatar-preview">
              <img :src="avatarPreview || formData.image_url" alt="社区头像">
              <div class="avatar-overlay">
                <el-icon class="avatar-icon">
                  <Plus />
                </el-icon>
                <span>更换头像</span>
              </div>
            </div>
            <el-icon
              v-else
              class="avatar-uploader-icon"
              :class="{ 'is-uploading': avatarUploading }"
            >
              <Plus v-if="!avatarUploading" />
              <Loading v-else />
            </el-icon>
            <div v-if="!avatarPreview && !formData.image_url" class="avatar-upload-text">
              <div class="upload-text-main">
                上传头像
              </div>
              <div class="upload-text-hint">
                支持 JPG、PNG 格式，建议尺寸 256x256
              </div>
            </div>
          </el-upload>
          <div v-if="avatarPreview || formData.image_url" class="avatar-actions">
            <el-button size="small" @click="removeAvatar">
              移除头像
            </el-button>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="社区名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入社区名称"
          maxlength="100"
          show-word-limit
        />
        <div class="form-hint">
          社区名称将显示为 r/社区名称
        </div>
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="6"
          placeholder="请描述你的社区（可选）"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="社区类型" prop="visibility">
        <el-radio-group v-model="formData.visibility">
          <el-radio value="public">
            公共 - 任何人均可在此社区中浏览内容、发帖和评论
          </el-radio>
          <el-radio value="restricted">
            受限 - 任何人均可浏览内容,但仅获批用户才能贡献内容
          </el-radio>
          <el-radio value="private">
            私人 - 仅获批用户可浏览和贡献内容
          </el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="成人内容">
        <el-switch v-model="formData.is_adult" />
        <div class="form-hint">
          用户必须年满18岁才能浏览和贡献内容
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visibleProxy = false">
        取消
      </el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { computed, ref, watch, defineProps, defineEmits } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Plus, Loading } from '@element-plus/icons-vue'
  import { updateSubreddit } from '@/axios/subreddit'
  import { uploadPostImage } from '@/axios/post'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    community: { type: Object, default: null },
  })

  const emit = defineEmits(['update:modelValue', 'success'])

  const visibleProxy = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
  })

  const editFormRef = ref(null)
  const submitting = ref(false)
  const avatarUploading = ref(false)
  const avatarPreview = ref(null)

  const formData = ref({
    name: '',
    description: '',
    visibility: 'public',
    is_adult: false,
    image_url: null,
  })

  const editFormRules = {
    name: [
      { required: true, message: '请输入社区名称', trigger: 'blur' },
      { min: 2, max: 100, message: '社区名称长度在 2 到 100 个字符', trigger: 'blur' },
    ],
    description: [{ max: 1000, message: '描述不能超过1000个字符', trigger: 'blur' }],
    visibility: [{ required: true, message: '请选择社区类型', trigger: 'change' }],
  }

  const hydrateFromCommunity = (community) => {
    if (!community) return
    formData.value = {
      name: community.name,
      description: community.description || '',
      visibility: community.visibility || 'public',
      is_adult: community.is_adult === 1 || community.is_adult === true,
      image_url: community.image_url || null,
    }
    avatarPreview.value = null
  }

  watch(
    () => props.community,
    (val) => hydrateFromCommunity(val),
    { immediate: true }
  )

  watch(
    () => props.modelValue,
    (val) => {
      if (val) hydrateFromCommunity(props.community)
    }
  )

  const beforeAvatarUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('图片大小不能超过 5MB!')
      return false
    }
    return true
  }

  const handleAvatarUpload = async (options) => {
    const file = options.file
    avatarUploading.value = true
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        avatarPreview.value = e.target.result
      }
      reader.readAsDataURL(file)

      const res = await uploadPostImage(file)
      if (res.success) {
        formData.value.image_url = res.data.url
        ElMessage.success('头像上传成功')
      } else {
        ElMessage.error(res.message || '头像上传失败')
        avatarPreview.value = null
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      ElMessage.error(error.message || '头像上传失败')
      avatarPreview.value = null
    } finally {
      avatarUploading.value = false
    }
  }

  const removeAvatar = () => {
    formData.value.image_url = null
    avatarPreview.value = null
  }

  const handleClose = () => {
    editFormRef.value?.resetFields()
    avatarPreview.value = null
  }

  const handleSubmit = async () => {
    if (!editFormRef.value || !props.community?.id) return
    await editFormRef.value.validate(async (valid) => {
      if (!valid) return
      submitting.value = true
      try {
        const response = await updateSubreddit(props.community.id, formData.value)
        if (response.success) {
          ElMessage.success('更新社区成功')
          visibleProxy.value = false
          emit('success')
        } else {
          ElMessage.error(response.message || '更新社区失败')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '更新社区失败')
      } finally {
        submitting.value = false
      }
    })
  }
</script>

<style scoped>
.avatar-upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-uploader {
  width: 120px;
  height: 120px;
  border: 2px dashed var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: var(--primary, #0079d3);
  background: var(--bg-hover, rgba(0, 121, 211, 0.05));
}

.avatar-uploader-icon {
  font-size: 32px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.avatar-uploader-icon.is-uploading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.avatar-upload-text {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  padding: 0 8px;
}

.upload-text-main {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.upload-text-hint {
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 6px;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
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
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 12px;
  gap: 4px;
}

.avatar-uploader:hover .avatar-overlay {
  opacity: 1;
}

.avatar-icon {
  font-size: 24px;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
</style>

