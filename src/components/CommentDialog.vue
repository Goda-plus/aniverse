<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="600px"
    :before-close="handleClose"
    class="comment-dialog"
  >
    <div class="comment-dialog-content">
      <!-- 回复目标评论显示 -->
      <div v-if="parentComment" class="reply-target">
        <div class="reply-target-header">
          <span>回复给</span>
          <span class="target-author">u/{{ parentComment.username }}</span>
        </div>
        <div class="reply-target-content">
          {{ parentComment.content }}
        </div>
      </div>

      <!-- 评论输入框 -->
      <div class="comment-editor">
        <el-input
          v-model="commentContent"
          type="textarea"
          :rows="6"
          placeholder="写下你的评论..."
          :maxlength="1000"
          show-word-limit
          class="comment-textarea"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">
          取消
        </el-button>
        <el-button 
          type="primary" 
          :loading="submitting"
          :disabled="!commentContent.trim()"
          @click="handleSubmit"
        >
          发布
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, computed, watch,defineProps, defineEmits } from 'vue'
  import { useUserStore } from '@/stores/user'
  import { createComment } from '@/axios/comment'
  import { ElMessage } from 'element-plus'

  const props = defineProps({
    modelValue: {
      type: Boolean,
      default: false
    },
    postId: {
      type: [Number, String],
      required: true
    },
    parentComment: {
      type: Object,
      default: null
    }
  })

  const emit = defineEmits(['update:modelValue', 'success'])

  const userStore = useUserStore()
  const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const commentContent = ref('')
  const submitting = ref(false)

  const dialogTitle = computed(() => {
    return props.parentComment ? '回复评论' : '发表评论'
  })

  // 监听对话框打开/关闭
  watch(visible, (newVal) => {
    if (!newVal) {
      // 关闭时清空内容
      commentContent.value = ''
    }
  })

  // 处理关闭
  const handleClose = () => {
    visible.value = false
  }

  // 处理提交
  const handleSubmit = async () => {
    if (!commentContent.value.trim()) {
      ElMessage.warning('评论内容不能为空')
      return
    }

    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }

    try {
      submitting.value = true

      const response = await createComment({
        post_id: props.postId,
        user_id: userStore.userId,
        content: commentContent.value.trim(),
        parent_comment_id: props.parentComment?.id || null
      })

      if (response.success) {
        ElMessage.success(props.parentComment ? '回复成功' : '评论发布成功')
        commentContent.value = ''
        visible.value = false
        emit('success', response.data)
      } else {
        ElMessage.error(response.message || '发布失败')
      }
    } catch (error) {
      console.error('发布评论失败:', error)
      ElMessage.error(error.response?.data?.message || error.message || '发布评论失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
.comment-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.comment-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reply-target {
  padding: 12px;
  background: var(--bg-secondary, #272729);
  border: 1px solid var(--card-border, #343536);
  border-radius: 4px;
}

.reply-target-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary, #818384);
}

.target-author {
  font-weight: 600;
  color: var(--text-primary, #d7dadc);
}

.reply-target-content {
  font-size: 14px;
  color: var(--text-primary, #d7dadc);
  line-height: 1.5;
  word-wrap: break-word;
}

.comment-editor {
  width: 100%;
}

.comment-textarea :deep(.el-textarea__inner) {
  background: var(--bg-secondary, #272729);
  border: 1px solid var(--card-border, #343536);
  color: var(--text-primary, #d7dadc);
  font-size: 14px;
  line-height: 1.6;
}

.comment-textarea :deep(.el-textarea__inner):focus {
  border-color: var(--text-primary, #d7dadc);
}

.comment-textarea :deep(.el-input__count) {
  background: transparent;
  color: var(--text-secondary, #818384);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>


