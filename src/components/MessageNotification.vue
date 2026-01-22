<template>
  <div v-if="visible" class="message-notification-container">
    <transition-group name="notification" tag="div" class="notification-list">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-item"
        :class="`notification-${notification.type}`"
        :style="notification.type === 'newMessage' ? { cursor: 'pointer' } : {}"
        @click="notification.type === 'newMessage' ? handleNewMessageClick(notification) : null"
      >
        <div class="notification-content">
          <div class="notification-header">
            <div class="notification-title">
              <el-icon v-if="notification.type === 'friendRequest'" class="notification-icon">
                <User />
              </el-icon>
              <el-icon v-else-if="notification.type === 'friendAccepted'" class="notification-icon">
                <Check />
              </el-icon>
              <el-icon v-else-if="notification.type === 'newMessage'" class="notification-icon">
                <ChatDotRound />
              </el-icon>
              {{ notification.title }}
            </div>
            <el-icon
              class="close-icon"
              @click="$emit('close-notification', notification.id)"
            >
              <Close />
            </el-icon>
          </div>
          <div class="notification-message">
            {{ notification.message }}
          </div>
          <div v-if="notification.type === 'newMessage'" class="notification-preview">
            {{ notification.content }}
          </div>
          <div class="notification-time">
            {{ formatNotificationTime(notification.timestamp) }}
          </div>
          <div v-if="notification.type === 'friendRequest'" class="notification-actions">
            <el-button
              size="small"
              type="success"
              :loading="processingRequests.has(notification.id)"
              @click="handleFriendRequestAction(notification.id, notification.fromUserId, 'accept')"
            >
              <el-icon><CircleCheck /></el-icon>
              接受
            </el-button>
            <el-button
              size="small"
              type="danger"
              :loading="processingRequests.has(notification.id)"
              @click="handleFriendRequestAction(notification.id, notification.fromUserId, 'reject')"
            >
              <el-icon><CircleClose /></el-icon>
              拒绝
            </el-button>
          </div>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
  import { computed, ref, onMounted, onUnmounted } from 'vue'
  import {
    User,
    Check,
    ChatDotRound,
    Close,
    CircleCheck,
    CircleClose
  } from '@element-plus/icons-vue'
  import { initSocket, getSocket } from '@/utils/socket'
  import { handleFriendRequest } from '@/axios/friend'

  // eslint-disable-next-line no-undef
  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    },
    notifications: {
      type: Array,
      default: () => [
        {
          id: 'test-notification-1',
          type: 'friendRequest',
          title: '新的好友申请',
          message: '测试用户 想添加你为好友',
          content: '你好，我想和你成为好友！',
          timestamp: new Date().toISOString(),
          fromUserId: 999,
          fromUsername: '测试用户'
        }
      ]
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits(['update:visible', 'close-notification', 'friend-request-handled', 'update-notifications', 'navigate-to-room'])

  const visible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })

  // Socket 相关状态
  const socket = ref(null)
  const processingRequests = ref(new Set()) // 正在处理的好友申请 ID 集合

  function setupSocketListeners () {
    // 优先复用已存在的 socket，没有的话主动初始化一个
    socket.value = getSocket() || initSocket()
    console.log(
      '🔍 MessageNotification 获取Socket:',
      socket.value ? `成功 (ID: ${socket.value.id})` : '失败'
    )

    if (!socket.value) {
      console.warn('MessageNotification Socket 获取失败，无法监听好友通知')
      return
    }

    // 防止重复绑定监听器，先移除旧的再绑定
    socket.value.off('friendRequest')
    socket.value.off('friendRequestAccepted')

    // 监听好友申请事件
    socket.value.on('friendRequest', (data) => {
      console.log('🔥 MessageNotification 收到好友申请:', data)
      addFriendRequestNotification(data)
    })

    // 监听好友申请被接受的事件
    socket.value.on('friendRequestAccepted', (data) => {
      console.log('🔥 MessageNotification 好友申请被接受:', data)
      addFriendAcceptedNotification(data)
    })

    console.log('✅ MessageNotification 事件监听器已设置')
  }

  // 初始化 socket 连接
  onMounted(() => {
    setupSocketListeners()
  })

  // 组件卸载时清理事件监听
  onUnmounted(() => {
    if (socket.value) {
      socket.value.off('friendRequest')
      socket.value.off('friendRequestAccepted')
    }
  })

  function formatNotificationTime (timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`

    return date.toLocaleDateString('zh-CN')
  }

  // 添加好友申请通知
  function addFriendRequestNotification (data) {
    const notification = {
      id: `friend-request-${data.fromUserId}-${Date.now()}`,
      type: 'friendRequest',
      title: '新的好友申请',
      message: `${data.fromUsername} 想添加你为好友`,
      content: data.message || '',
      timestamp: new Date().toISOString(),
      fromUserId: data.fromUserId,
      fromUsername: data.fromUsername
    }

    // 通知父组件添加新通知
    emit('update-notifications', {
      action: 'add',
      notification: notification
    })
  }

  // 添加好友申请接受通知
  function addFriendAcceptedNotification (data) {
    const notification = {
      id: `friend-accepted-${Date.now()}`,
      type: 'friendAccepted',
      title: '好友申请通过',
      message: `${data.fromUsername} 接受了你的好友申请`,
      timestamp: new Date().toISOString()
    }

    emit('update-notifications', {
      action: 'add',
      notification: notification
    })
  }

  // 处理好友申请
  async function handleFriendRequestAction (notificationId, fromUserId, action) {
    if (processingRequests.value.has(notificationId)) return

    processingRequests.value.add(notificationId)

    try {
      await handleFriendRequest({
        friendId: fromUserId,
        action: action // 'accept' 或 'reject'
      })

      // 通知父组件移除该通知
      emit('update-notifications', {
        action: 'remove',
        notificationId: notificationId
      })

      // 通知父组件好友申请已处理
      emit('friend-request-handled', { fromUserId, action })

      console.log(`${action === 'accept' ? '接受' : '拒绝'}好友申请成功`)
    } catch (error) {
      console.error('处理好友申请失败:', error)
      // 这里可以添加错误提示
    } finally {
      processingRequests.value.delete(notificationId)
    }
  }

  // 处理新消息通知点击，跳转到对应聊天室
  function handleNewMessageClick (notification) {
    if (notification.roomId) {
      emit('navigate-to-room', {
        roomId: notification.roomId,
        notificationId: notification.id
      })
    }
  }
</script>

<style scoped>
.message-notification-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  margin-bottom: 16px;
  pointer-events: none;
  z-index: 10;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-item {
  background: var(--bg-color, #1a1a1b);
  border: 1px solid var(--border-color, #343536);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: all;
  width: 100%;
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
}

.notification-item.notification-friendRequest {
  border-left: 4px solid #0079d3;
}

.notification-item.notification-friendAccepted {
  border-left: 4px solid #52c41a;
}

.notification-item.notification-newMessage {
  border-left: 4px solid #ff4500;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.notification-move {
  transition: transform 0.3s ease;
}

.notification-content {
  padding: 16px;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #d7dadc);
}

.notification-icon {
  font-size: 16px;
  color: var(--primary-color, #ff4500);
}

.close-icon {
  font-size: 14px;
  color: var(--text-color-secondary, #818384);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-icon:hover {
  color: var(--text-color, #d7dadc);
  background: var(--hover-bg, #343536);
}

.notification-message {
  font-size: 13px;
  color: var(--text-color, #d7dadc);
  line-height: 1.4;
  margin-bottom: 4px;
}

.notification-preview {
  font-size: 12px;
  color: var(--text-color-secondary, #818384);
  background: var(--hover-bg, #272729);
  padding: 6px 8px;
  border-radius: 4px;
  margin-top: 8px;
  word-break: break-word;
}

.notification-time {
  font-size: 11px;
  color: var(--text-color-secondary, #818384);
  margin-top: 8px;
}

.notification-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

.notification-actions .el-button {
  font-size: 12px;
  padding: 4px 12px;
}

.notification-actions .el-button .el-icon {
  margin-right: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-notification-container {
    max-width: none;
    margin-bottom: 12px;
  }

  .notification-item {
    width: 100%;
  }
}
</style>
