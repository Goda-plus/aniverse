<template>
  <div
    v-if="visible"
    class="message-context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @click.stop
  >
    <div
      v-if="canCopyMessage(message)"
      class="menu-item"
      @click="handleCopy"
    >
      <el-icon><DocumentCopy /></el-icon>
      <span>复制</span>
    </div>
    <div
      v-if="canDownloadMessage(message)"
      class="menu-item"
      @click="handleDownload"
    >
      <el-icon><Download /></el-icon>
      <span>下载</span>
    </div>
    <div
      v-if="canRecallMessage(message)"
      class="menu-item"
      @click="handleRecall"
    >
      <el-icon><Back /></el-icon>
      <span>撤回</span>
    </div>
    <div
      class="menu-item"
      @click="handleMultiSelect"
    >
      <el-icon><Select /></el-icon>
      <span>多选</span>
    </div>
    <div
      class="menu-item"
      @click="handleLocalDelete"
    >
      <el-icon><Delete /></el-icon>
      <span>删除</span>
    </div>
  </div>
</template>

<script setup>
  import {
    DocumentCopy,
    Download,
    Back,
    Select,
    Delete
  } from '@element-plus/icons-vue'

  // eslint-disable-next-line no-undef
  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    },
    message: {
      type: Object,
      default: null
    },
    position: {
      type: Object,
      default: () => ({ x: 0, y: 0 })
    },
    currentUserId: {
      type: [String, Number],
      default: null
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits([
    'copy',
    'download',
    'recall',
    'multi-select',
    'local-delete',
    'close'
  ])

  // 判断是否可以复制消息
  const canCopyMessage = (message) => {
    return message && !message.recalled && (!message.messageType || message.messageType === 'text')
  }

  // 判断是否可以下载消息
  const canDownloadMessage = (message) => {
    return message && ['image', 'video', 'audio', 'file'].includes(message.messageType) && (message.imageUrl || message.fileUrl)
  }

  // 判断是否可以撤回消息
  const canRecallMessage = (message) => {
    if (!message || !isOwnMessage(message.user_id)) return false
    const messageTime = new Date(message.created_at)
    const now = new Date()
    const diffMinutes = (now - messageTime) / (1000 * 60)
    return diffMinutes <= 5 // 5分钟内可以撤回
  }

  // 判断是否为自己的消息
  const isOwnMessage = (userId) => {
    return Number(userId) === Number(props.currentUserId)
  }

  // 事件处理
  const handleCopy = () => {
    emit('copy', props.message)
    emit('close')
  }

  const handleDownload = () => {
    emit('download', props.message)
    emit('close')
  }

  const handleRecall = () => {
    emit('recall', props.message)
    emit('close')
  }

  const handleMultiSelect = () => {
    emit('multi-select', props.message)
    emit('close')
  }

  const handleLocalDelete = () => {
    emit('local-delete', props.message)
    emit('close')
  }
</script>

<style scoped>
.message-context-menu {
  position: absolute;
  background: var(--bg-secondary, #1a1a1b);
  border: 1px solid var(--border-color, #343536);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 2000;
  min-width: 120px;
  overflow: hidden;
  pointer-events: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  color: var(--text-primary, #d7dadc);
  font-size: 13px;
  transition: background 0.2s;
}

.menu-item:hover {
  background: var(--bg-hover, #272729);
}

.menu-item .el-icon {
  font-size: 14px;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .message-context-menu {
    min-width: 100px;
  }

  .menu-item {
    padding: 6px 8px;
    font-size: 12px;
  }
}
</style>
