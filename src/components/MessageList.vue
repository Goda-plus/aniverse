<template>
  <div class="chat-messages-view">
    <!-- 消息头部 -->
    <div class="messages-header">
      <div class="messages-header-info">
        <el-avatar
          v-if="currentRoomAvatar"
          :size="32"
          :src="currentRoomAvatar"
        >
          {{ currentRoomName?.charAt(0)?.toUpperCase() || 'C' }}
        </el-avatar>
        <span class="messages-room-name">{{ currentRoomName }}</span>
      </div>
    </div>

    <!-- 消息容器 -->
    <div
      ref="messagesContainerRef"
      class="messages-container"
    >
      <!-- 加载状态 -->
      <div v-if="loadingMessages" class="loading-container">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载消息中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="messages.length === 0" class="empty-messages">
        <p>还没有消息，开始聊天吧~</p>
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="['message-item', { 'own-message': isOwnMessage(message.user_id) }]"
        >
          <el-avatar
            :size="36"
            :src="getUserAvatar(message.user_id)"
            class="message-avatar"
          >
            {{ message.username?.charAt(0)?.toUpperCase() || 'U' }}
          </el-avatar>
          <div class="message-content-wrapper">
            <div class="message-content">
              {{ message.content }}
            </div>
            <div class="message-time">
              {{ formatMessageTime(message.created_at) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息输入框 -->
    <div class="message-input-container">
      <el-input
        v-model="messageInput"
        type="textarea"
        :rows="2"
        placeholder="输入消息..."
        :disabled="sendingMessage"
        class="message-input"
        @keyup.ctrl.enter="handleSend"
        @keyup.enter.exact.prevent="handleSend"
      />
      <el-button
        type="primary"
        :loading="sendingMessage"
        :disabled="!messageInput.trim()"
        class="send-button"
        @click="handleSend"
      >
        发送
      </el-button>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, nextTick, onMounted } from 'vue'
  import { Loading } from '@element-plus/icons-vue'

  // eslint-disable-next-line no-undef
  const props = defineProps({
    messages: {
      type: Array,
      default: () => []
    },
    loadingMessages: {
      type: Boolean,
      default: false
    },
    sendingMessage: {
      type: Boolean,
      default: false
    },
    currentUserId: {
      type: [Number, String],
      default: null
    },
    activeRoomId: {
      type: [Number, String],
      default: null
    },
    chatRooms: {
      type: Array,
      default: () => []
    },
    friends: {
      type: Array,
      default: () => []
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits(['send-message'])

  const messageInput = ref('')
  const messagesContainerRef = ref(null)

  // 获取当前房间信息
  const currentRoom = computed(() => {
    if (!props.activeRoomId) return null
    return props.chatRooms.find(r => Number(r.id) === Number(props.activeRoomId))
  })

  const currentRoomName = computed(() => {
    if (!currentRoom.value) return ''
    if (currentRoom.value.name) return currentRoom.value.name
    // 私聊：显示对方用户名
    if (!currentRoom.value.is_group && currentRoom.value.members && currentRoom.value.members.length > 0) {
      return currentRoom.value.members[0].username || `用户 ${currentRoom.value.id}`
    }
    // 群聊：显示成员数量
    if (currentRoom.value.is_group && currentRoom.value.members) {
      return `群聊 (${currentRoom.value.members.length + 1}人)`
    }
    return `聊天 ${currentRoom.value.id}`
  })

  const currentRoomAvatar = computed(() => {
    if (!currentRoom.value) return null
    // 私聊：显示对方头像
    if (!currentRoom.value.is_group && currentRoom.value.members && currentRoom.value.members.length > 0) {
      return currentRoom.value.members[0].avatar_url || null
    }
    return null
  })

  // 判断是否为自己的消息
  function isOwnMessage (userId) {
    return Number(userId) === Number(props.currentUserId)
  }

  // 获取用户头像
  function getUserAvatar (userId) {
    // 从当前房间的成员中查找头像
    if (currentRoom.value && currentRoom.value.members) {
      const member = currentRoom.value.members.find(m => Number(m.id) === Number(userId))
      if (member) return member.avatar_url || null
    }
    // 从好友列表中查找
    const friend = props.friends.find(f => Number(f.id) === Number(userId))
    if (friend && friend.avatar_url) return friend.avatar_url
    return null
  }

  // 格式化消息时间
  function formatMessageTime (timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (msgDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }

    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 滚动到底部
  function scrollToBottom () {
    if (messagesContainerRef.value) {
      nextTick(() => {
        messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
      })
    }
  }

  // 发送消息
  function handleSend () {
    if (!messageInput.value.trim() || props.sendingMessage) return
    emit('send-message', messageInput.value.trim())
    messageInput.value = ''
  }

  // 监听消息变化，自动滚动到底部
  watch(() => props.messages.length, () => {
    scrollToBottom()
  })

  // 监听房间变化，滚动到底部
  watch(() => props.activeRoomId, () => {
    nextTick(() => {
      scrollToBottom()
    })
  })

  onMounted(() => {
    scrollToBottom()
  })
</script>

<style scoped>
.chat-messages-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-color, #1a1a1b);
}

.messages-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #343536);
  background: var(--header-bg, #272729);
}

.messages-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.messages-room-name {
  color: var(--text-color, #d7dadc);
  font-size: 14px;
  font-weight: 500;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-color-secondary, #818384);
}

.empty-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-messages p {
  color: var(--text-color-secondary, #818384);
  font-size: 14px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-item.own-message {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 70%;
}

.message-item.own-message .message-content-wrapper {
  align-items: flex-end;
}

.message-content {
  padding: 8px 12px;
  background: var(--hover-bg, #343536);
  border-radius: 8px;
  color: var(--text-color, #d7dadc);
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-item.own-message .message-content {
  background: var(--primary-color, #ff4500);
  color: #fff;
}

.message-time {
  font-size: 11px;
  color: var(--text-color-secondary, #818384);
  padding: 0 4px;
}

.message-input-container {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #343536);
  background: var(--header-bg, #272729);
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
}

.send-button {
  flex-shrink: 0;
}

/* 滚动条样式 */
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: var(--border-color, #343536);
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-secondary, #818384);
}
</style>
