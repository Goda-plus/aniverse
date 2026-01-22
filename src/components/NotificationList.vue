<template>
  <div class="notification-list-section">
    <el-collapse-item name="notifications" class="collapse-item">
      <template #title>
        <div class="section-header">
          <div class="section-title-wrapper">
            <el-icon class="section-icon">
              <Bell />
            </el-icon>
            <span>消息通知</span>
            <el-badge
              v-if="unreadCount > 0"
              :value="unreadCount"
              class="notification-badge"
            />
          </div>
        </div>
      </template>
      <div v-if="notifications.length === 0 && !loadingNotifications" class="empty-chat-list compact">
        <h3>暂无通知</h3>
        <p>您的好友申请和消息通知将显示在这里。</p>
      </div>
      <div v-else class="notification-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="`notification-${notification.type}`"
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
                @click.stop="$emit('close-notification', notification.id)"
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
                @click.stop="handleFriendRequestAction(notification.id, notification.fromUserId, 'accept')"
              >
                <el-icon><CircleCheck /></el-icon>
                接受
              </el-button>
              <el-button
                size="small"
                type="danger"
                :loading="processingRequests.has(notification.id)"
                @click.stop="handleFriendRequestAction(notification.id, notification.fromUserId, 'reject')"
              >
                <el-icon><CircleClose /></el-icon>
                拒绝
              </el-button>
            </div>
            <div
              v-else-if="notification.type === 'newMessage'"
              class="notification-actions"
            >
              <el-button
                size="small"
                type="primary"
                @click.stop="handleNewMessageClick(notification)"
              >
                查看消息
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-collapse-item>
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
    CircleClose,
    Bell
  } from '@element-plus/icons-vue'
  import { handleFriendRequest, getPendingList } from '@/axios/friend'

  // eslint-disable-next-line no-undef
  const props = defineProps({
    notifications: {
      type: Array,
      default: () => []
    },
    socket: {
      type: Object,
      default: null
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits([
    'close-notification',
    'update-notifications',
    'friend-request-handled',
    'navigate-to-room'
  ])
  let friend = ref()
  const processingRequests = ref(new Set())
  const internalNotifications = ref([])
  const loadingNotifications = ref(false)
  // 计算未读通知数量
  const unreadCount = computed(() => {
    return internalNotifications.value.filter(n => n.type === 'friendRequest' || n.type === 'newMessage').length
  })

  // 合并 props 和内部通知
  const notifications = computed(() => {
    // 如果有内部通知，使用内部通知；否则使用 props
    return internalNotifications.value.length > 0 ? internalNotifications.value : props.notifications
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

  // 处理好友申请
  async function handleFriendRequestAction (notificationId, fromUserId, action) {
    if (processingRequests.value.has(notificationId)) return
    console.log(notificationId,fromUserId,action)
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

      // 重新获取通知列表
      await loadFriendRequests()

      console.log(`${action === 'accept' ? '接受' : '拒绝'}好友申请成功`)
    } catch (error) {
      console.error('处理好友申请失败:', error)
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

  // 获取好友请求数据
  async function loadFriendRequests () {
    loadingNotifications.value = true
    try {
      const res = await getPendingList()
      if (res.success && res.data) {
        // 将 API 返回的好友请求数据转换为通知格式
        const friendRequestNotifications = res.data.map(request => ({
          id: `friend-request-${request.id}`,
          type: 'friendRequest',
          title: '好友请求',
          message: `${request.username} 想添加你为好友`,
          fromUserId: request.id, // 使用 id 字段，这是发送请求的用户ID
          fromUsername: request.username,
          timestamp: new Date().toISOString() // 由于 API 没有返回时间戳，使用当前时间
        }))
        internalNotifications.value = friendRequestNotifications
      } else {
        internalNotifications.value = []
      }
    } catch (error) {
      console.error('获取好友请求失败:', error)
      internalNotifications.value = []
    } finally {
      loadingNotifications.value = false
    }
  }

  // 设置 Socket 监听器
  function setupSocketListeners () {
    if (!props.socket) return

    // 监听好友请求通知
    props.socket.on('friendRequest', (data) => {
      console.log('收到好友请求通知:', data)
      // 重新获取好友请求数据
      loadFriendRequests()
    })

    // 监听好友请求被接受通知（当其他用户接受了当前用户的请求时）
    props.socket.on('friendRequestAccepted', (data) => {
      console.log('收到好友请求接受通知:', data)
      // 重新获取好友请求数据
      loadFriendRequests()
    })
  }

  // 清理 Socket 监听器
  function cleanupSocketListeners () {
    if (!props.socket) return

    props.socket.off('friendRequest')
    props.socket.off('friendRequestAccepted')
  }

  // 组件挂载时获取好友请求数据
  onMounted(() => {
    loadFriendRequests()
    setupSocketListeners()
  })

  // 组件卸载时清理监听器
  onUnmounted(() => {
    cleanupSocketListeners()
  })
</script>

<style scoped>
.notification-list-section {
  margin-bottom: 12px;
}

.collapse-item {
  border: none;
  background: transparent;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  color: var(--text-color, #d7dadc);
  font-weight: 500;
  border-bottom: 1px solid var(--border-color, #343536);
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 16px;
  color: var(--primary-color, #ff4500);
}

.notification-badge {
  margin-left: 4px;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.notification-item {
  background: var(--bg-color, #1a1a1b);
  border-bottom: 1px solid var(--border-color, #343536);
  transition: background 0.2s;
}

.notification-item:last-child {
  border-bottom: none;
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

.notification-content {
  padding: 12px 16px;
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
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color, #d7dadc);
}

.notification-icon {
  font-size: 14px;
  color: var(--primary-color, #ff4500);
}

.close-icon {
  font-size: 12px;
  color: var(--text-color-secondary, #818384);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-icon:hover {
  color: var(--text-color, #d7dadc);
  background: var(--hover-bg, #343536);
}

.notification-message {
  font-size: 12px;
  color: var(--text-color, #d7dadc);
  line-height: 1.4;
  margin-bottom: 4px;
}

.notification-preview {
  font-size: 11px;
  color: var(--text-color-secondary, #818384);
  background: var(--hover-bg, #272729);
  padding: 6px 8px;
  border-radius: 4px;
  margin-top: 6px;
  margin-bottom: 6px;
  word-break: break-word;
}

.notification-time {
  font-size: 10px;
  color: var(--text-color-secondary, #818384);
  margin-top: 4px;
}

.notification-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  justify-content: flex-end;
}

.notification-actions .el-button {
  font-size: 11px;
  padding: 4px 10px;
}

.notification-actions .el-button .el-icon {
  margin-right: 2px;
}

.empty-chat-list.compact {
  padding: 24px 16px;
}

.empty-chat-list h3 {
  color: var(--text-color, #d7dadc);
  font-size: 16px;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-chat-list p {
  color: var(--text-color-secondary, #818384);
  font-size: 13px;
  line-height: 1.5;
}
</style>

