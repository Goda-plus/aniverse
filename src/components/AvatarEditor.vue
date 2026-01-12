<template>
  <el-dialog
    v-model="visible"
    title="编辑头像"
    width="600px"
    :before-close="handleClose"
  >
    <div class="avatar-editor">
      <!-- 图片选择区域 -->
      <div v-if="!imageSrc" class="upload-area">
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :before-upload="beforeUpload"
          accept="image/*"
        >
          <el-icon class="avatar-uploader-icon">
            <Plus />
          </el-icon>
          <div class="upload-text">
            点击选择图片
          </div>
        </el-upload>
      </div>

      <!-- 图片裁剪区域 -->
      <div v-else class="cropper-container">
        <div class="cropper-wrapper">
          <img
            ref="imageRef"
            :src="imageSrc"
            alt="avatar"
            class="cropper-image"
          >
        </div>
        <div class="cropper-actions">
          <el-button @click="resetImage">
            重新选择
          </el-button>
          <el-button type="primary" :loading="uploading" @click="handleCrop">
            确认上传
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
  import { ref, watch, nextTick, onMounted, onUnmounted, defineProps, defineEmits } from 'vue'
  import { Plus } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import Cropper from 'cropperjs'
  import 'cropperjs/dist/cropper.css'
  import { updateUserAvatar } from '@/axios/user'
  import { useUserStore } from '@/stores/user'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    }
  })

  const emit = defineEmits(['update:modelValue', 'success'])

  const visible = ref(false)
  const imageSrc = ref('')
  const imageRef = ref(null)
  const cropper = ref(null)
  const uploading = ref(false)
  const cropperReady = ref(false)

  watch(() => props.modelValue, (val) => {
    visible.value = val
    if (!val) {
      resetImage()
    }
  })

  watch(visible, (val) => {
    emit('update:modelValue', val)
  })

  // 图片上传前的处理
  const beforeUpload = (file) => {
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

    const reader = new FileReader()
    reader.onload = (e) => {
      imageSrc.value = e.target.result
      nextTick(() => {
        // 等待图片元素加载完成后再初始化裁剪器
        if (imageRef.value) {
          if (imageRef.value.complete) {
            initCropper()
          } else {
            imageRef.value.onload = () => {
              initCropper()
            }
          }
        }
      })
    }
    reader.readAsDataURL(file)
    return false // 阻止自动上传
  }

  // 初始化裁剪器
  const initCropper = () => {
    if (!imageRef.value) {
      return
    }
    
    // 如果已经存在，先销毁
    if (cropper.value) {
      cropper.value.destroy()
      cropper.value = null
      cropperReady.value = false
    }

    cropper.value = new Cropper(imageRef.value, {
      aspectRatio: 1, // 1:1 比例
      viewMode: 1, // 限制裁剪框不能超出图片
      dragMode: 'move', // 移动模式
      autoCropArea: 0.8, // 自动裁剪区域
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      minCropBoxWidth: 100,
      minCropBoxHeight: 100,
      responsive: true,
      ready () {
        // 裁剪器准备就绪
        cropperReady.value = true
      }
    })
  }

  // 重置图片
  const resetImage = () => {
    if (cropper.value) {
      cropper.value.destroy()
      cropper.value = null
    }
    cropperReady.value = false
    imageSrc.value = ''
  }

  // 处理裁剪并上传
  const handleCrop = async () => {
    if (!cropper.value || !cropperReady.value) {
      ElMessage.error('请先选择图片并等待图片加载完成')
      return
    }

    // 确保 cropper 实例有 getCroppedCanvas 方法
    if (typeof cropper.value.getCroppedCanvas !== 'function') {
      ElMessage.error('裁剪器未正确初始化，请重新选择图片')
      return
    }

    uploading.value = true
    try {
      // 获取裁剪后的图片（base64）
      const canvas = cropper.value.getCroppedCanvas({
        width: 300,
        height: 300,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      })
      
      if (!canvas) {
        throw new Error('无法获取裁剪后的图片')
      }

      // 将canvas转换为blob
      canvas.toBlob(async (blob) => {
        try {
          // 创建FormData
          const formData = new FormData()
          formData.append('avatar', blob, 'avatar.png')
          // 上传头像
          const res = await updateUserAvatar(formData)
        
          if (res.success) {
            ElMessage.success('头像更新成功')
          
            // 处理头像URL（如果是相对路径，转换为完整URL）
            let avatarUrl = res.data.avatar_url
          
            // 更新用户store中的头像和token
            const userStore = useUserStore()
            if (res.token) {
              userStore.setToken(res.token)
            }
            if (userStore.user) {
              userStore.user.avatar_url = avatarUrl
              userStore.setUser(userStore.user)
            }
          
            emit('success', avatarUrl)
            handleClose()
          } else {
            ElMessage.error(res.message || '头像更新失败')
          }
        } catch (error) {
          console.error('上传失败:', error)
          ElMessage.error(error.response?.data?.message || '上传失败，请稍后重试')
        } finally {
          uploading.value = false
        }
      }, 'image/png', 0.9)

    } catch (error) {
      console.error('裁剪失败:', error)
      ElMessage.error('裁剪失败，请稍后重试')
      uploading.value = false
    }
  }

  // 关闭对话框
  const handleClose = () => {
    resetImage()
    visible.value = false
  }

  onUnmounted(() => {
    if (cropper.value) {
      cropper.value.destroy()
    }
  })
</script>

<style scoped>
.avatar-editor {
  min-height: 400px;
}

.upload-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.avatar-uploader {
  text-align: center;
}

:deep(.avatar-uploader .el-upload) {
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  padding: 40px;
  width: 300px;
}

:deep(.avatar-uploader .el-upload:hover) {
  border-color: var(--primary-color, #409eff);
  background-color: var(--bg-hover);
}

.avatar-uploader-icon {
  font-size: 48px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.upload-text {
  color: var(--text-secondary);
  font-size: 14px;
}

.cropper-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cropper-wrapper {
  width: 100%;
  height: 400px;
  overflow: hidden;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.cropper-image {
  display: block;
  max-width: 100%;
  max-height: 400px;
}

.cropper-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Cropper.js 样式覆盖 */
:deep(.cropper-container) {
  direction: ltr;
}

:deep(.cropper-view-box) {
  outline: 2px solid var(--primary-color, #409eff);
  outline-color: rgba(64, 158, 255, 0.75);
}

:deep(.cropper-face) {
  background-color: rgba(64, 158, 255, 0.1);
}

:deep(.cropper-line) {
  background-color: var(--primary-color, #409eff);
}

:deep(.cropper-point) {
  background-color: var(--primary-color, #409eff);
  width: 8px;
  height: 8px;
}
</style>

