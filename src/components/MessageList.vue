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
      <div class="messages-header-actions">
        <el-button
          v-if="!showSearch"
          text
          size="small"
          @click="showSearch = true"
        >
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button
          v-else
          text
          size="small"
          @click="hideSearch"
        >
          <el-icon><Close /></el-icon>
          取消
        </el-button>
      </div>
    </div>

    <!-- 搜索框 -->
    <div v-if="showSearch" class="search-container">
      <el-input
        v-model="searchQuery"
        placeholder="搜索消息内容..."
        clearable
        :prefix-icon="Search"
        @input="performSearch"
      />
      <div v-if="searchResults.length > 0" class="search-results">
        <div class="search-result-count">
          找到 {{ searchResults.length }} 条匹配消息
        </div>
        <div class="search-navigation">
          <el-button
            text
            size="small"
            :disabled="currentSearchIndex <= 0"
            @click="navigateSearch(-1)"
          >
            <el-icon><ArrowUp /></el-icon>
          </el-button>
          <span class="search-position">
            {{ currentSearchIndex + 1 }} / {{ searchResults.length }}
          </span>
          <el-button
            text
            size="small"
            :disabled="currentSearchIndex >= searchResults.length - 1"
            @click="navigateSearch(1)"
          >
            <el-icon><ArrowDown /></el-icon>
          </el-button>
        </div>
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
          v-for="(message, messageIndex) in messages"
          :key="message.id"
          :class="['message-item', {
            'own-message': isOwnMessage(message.user_id),
            'search-highlight': isSearchResult(messageIndex)
          }]"
        >
          <el-avatar
            :size="36"
            :src="getUserAvatar(message.user_id)"
            class="message-avatar"
          >
            {{ message.username?.charAt(0)?.toUpperCase() || 'U' }}
          </el-avatar>
          <div class="message-content-wrapper">
            <div
              v-if="message.recalled"
              class="message-recalled"
            >
              <el-icon class="recall-icon">
                <InfoFilled />
              </el-icon>
              <span>消息已撤回</span>
            </div>
            <div v-else class="message-content" @contextmenu="showMessageMenu($event, message)">
              <!-- 图片消息 -->
              <div v-if="message.messageType === 'image'" class="image-message">
                <el-image
                  :src="message.imageUrl"
                  :preview-src-list="[message.imageUrl]"
                  class="message-image"
                  fit="cover"
                />
                <div v-if="message.content && message.content !== '[图片]'" class="image-caption">
                  {{ message.content }}
                </div>
              </div>
              <!-- 文本消息 -->
              <div v-else>
                {{ message.content }}
              </div>
              <!-- 消息菜单 -->
              <div
                v-if="menuVisible && selectedMessage?.id === message.id"
                class="message-menu"
                :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
                @click.stop
              >
                <div
                  v-if="canRecallMessage(message)"
                  class="menu-item"
                  @click="recallMessage(message)"
                >
                  <el-icon><Back /></el-icon>
                  <span>撤回消息</span>
                </div>
              </div>
            </div>
            <div v-if="!message.recalled" class="message-meta">
              <div class="message-time">
                {{ formatMessageTime(message.created_at) }}
              </div>
              <div v-if="isOwnMessage(message.user_id)" class="message-status">
                <el-icon
                  v-if="message.status === 'sending'"
                  class="status-icon sending"
                  title="发送中"
                >
                  <Loading />
                </el-icon>
                <el-icon
                  v-else-if="message.status === 'sent'"
                  class="status-icon sent"
                  title="已发送"
                >
                  <Check />
                </el-icon>
                <el-icon
                  v-else-if="message.status === 'read'"
                  class="status-icon read"
                  title="已读"
                >
                  <CircleCheck />
                </el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息输入框 -->
    <div class="message-input-container">
      <el-input
        ref="messageInputRef"
        v-model="messageInput"
        type="textarea"
        :rows="2"
        placeholder="输入消息..."
        :disabled="sendingMessage"
        class="message-input"
        @keyup.ctrl.enter="handleSend"
        @keyup.enter.exact.prevent="handleSend"
      />
      <div class="input-actions">
        <el-button
          text
          class="action-button"
          @click="toggleEmojiPicker"
        >
          <el-icon><Smile /></el-icon>
        </el-button>
        <el-button
          text
          class="action-button"
          @click="$refs.imageInput.click()"
        >
          <el-icon><Picture /></el-icon>
        </el-button>
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleImageSelect"
        >
        <!-- 表情符选择器 -->
        <div
          v-if="showEmojiPicker"
          class="emoji-picker"
          tabindex="0"
          @click.stop
          @keydown="handleEmojiKeydown"
        >
          <div class="emoji-grid">
            <span
              v-for="(emoji, index) in emojiList"
              :key="emoji"
              :class="['emoji-item', { selected: index === selectedEmojiIndex }]"
              @click="insertEmoji(emoji)"
              @mouseenter="selectedEmojiIndex = index"
            >
              {{ emoji }}
            </span>
          </div>
        </div>
      </div>
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
  import { Loading, Check, CircleCheck, InfoFilled, Back, Smile, Picture, Search, Close, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'

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
  const messageInputRef = ref(null)
  const messagesContainerRef = ref(null)
  const menuVisible = ref(false)
  const selectedMessage = ref(null)
  const menuPosition = ref({ x: 0, y: 0 })
  const showEmojiPicker = ref(false)
  const selectedEmojiIndex = ref(-1)
  const showSearch = ref(false)
  const searchQuery = ref('')
  const searchResults = ref([])
  const currentSearchIndex = ref(-1)

  // 表情符列表
  const emojiList = [
    '😀', '😂', '🥰', '😍', '🤔', '😉', '😎', '😢', '😭', '😤',
    '👍', '👎', '👌', '✌️', '🤞', '👏', '🙏', '🤝', '❤️', '💔',
    '🔥', '⭐', '✨', '💯', '🎉', '🎊', '🎈', '🎁', '🏆', '⚽'
  ]

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

  // 显示消息菜单
  function showMessageMenu (event, message) {
    event.preventDefault()
    if (!isOwnMessage(message.user_id)) return // 只允许操作自己的消息

    selectedMessage.value = message
    menuPosition.value = {
      x: event.clientX,
      y: event.clientY
    }
    menuVisible.value = true

    // 点击其他地方关闭菜单
    const closeMenu = () => {
      menuVisible.value = false
      document.removeEventListener('click', closeMenu)
    }
    document.addEventListener('click', closeMenu)
  }

  // 判断是否可以撤回消息
  function canRecallMessage (message) {
    if (!isOwnMessage(message.user_id)) return false
    const messageTime = new Date(message.created_at)
    const now = new Date()
    const diffMinutes = (now - messageTime) / (1000 * 60)
    return diffMinutes <= 5 // 5分钟内可以撤回
  }

  // 撤回消息
  function recallMessage (message) {
    emit('recall-message', message.id)
    menuVisible.value = false
  }

  // 切换表情符选择器
  function toggleEmojiPicker () {
    showEmojiPicker.value = !showEmojiPicker.value
    if (showEmojiPicker.value) {
      selectedEmojiIndex.value = -1
    }
  }

  // 处理表情符键盘导航
  function handleEmojiKeydown (event) {
    const cols = 10 // 每行10个表情符
    const total = emojiList.length

    switch (event.key) {
      case 'ArrowRight':
        selectedEmojiIndex.value = Math.min(selectedEmojiIndex.value + 1, total - 1)
        event.preventDefault()
        break
      case 'ArrowLeft':
        selectedEmojiIndex.value = Math.max(selectedEmojiIndex.value - 1, 0)
        event.preventDefault()
        break
      case 'ArrowDown':
        selectedEmojiIndex.value = Math.min(selectedEmojiIndex.value + cols, total - 1)
        event.preventDefault()
        break
      case 'ArrowUp':
        selectedEmojiIndex.value = Math.max(selectedEmojiIndex.value - cols, 0)
        event.preventDefault()
        break
      case 'Enter':
        if (selectedEmojiIndex.value >= 0) {
          insertEmoji(emojiList[selectedEmojiIndex.value])
        }
        event.preventDefault()
        break
      case 'Escape':
        showEmojiPicker.value = false
        event.preventDefault()
        break
    }
  }

  // 插入表情符
  function insertEmoji (emoji) {
    const input = messageInputRef.value?.$el?.querySelector('textarea')
    if (input) {
      const start = input.selectionStart
      const end = input.selectionEnd
      const text = messageInput.value
      const newText = text.substring(0, start) + emoji + text.substring(end)
      messageInput.value = newText

      // 设置光标位置
      nextTick(() => {
        input.focus()
        input.setSelectionRange(start + emoji.length, start + emoji.length)
      })
    } else {
      // 如果没有获取到输入框，直接追加到末尾
      messageInput.value += emoji
    }
    showEmojiPicker.value = false
  }

  // 执行搜索
  function performSearch () {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      currentSearchIndex.value = -1
      return
    }

    const query = searchQuery.value.toLowerCase()
    const results = props.messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) =>
        !message.recalled &&
        message.content &&
        message.content.toLowerCase().includes(query)
      )

    searchResults.value = results
    currentSearchIndex.value = results.length > 0 ? 0 : -1

    // 滚动到第一个搜索结果
    if (results.length > 0) {
      scrollToMessage(results[0].index)
    }
  }

  // 导航搜索结果
  function navigateSearch (direction) {
    if (searchResults.value.length === 0) return

    currentSearchIndex.value += direction
    if (currentSearchIndex.value < 0) {
      currentSearchIndex.value = searchResults.value.length - 1
    } else if (currentSearchIndex.value >= searchResults.value.length) {
      currentSearchIndex.value = 0
    }

    scrollToMessage(searchResults.value[currentSearchIndex.value].index)
  }

  // 滚动到指定消息
  function scrollToMessage (messageIndex) {
    const messageElements = messagesContainerRef.value?.querySelectorAll('.message-item')
    if (messageElements && messageElements[messageIndex]) {
      messageElements[messageIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }

  // 隐藏搜索
  function hideSearch () {
    showSearch.value = false
    searchQuery.value = ''
    searchResults.value = []
    currentSearchIndex.value = -1
  }

  // 检查消息是否为搜索结果
  function isSearchResult (messageIndex) {
    return searchResults.value.some(result => result.index === messageIndex)
  }

  // 处理图片选择
  function handleImageSelect (event) {
    const file = event.target.files[0]
    if (file) {
      // 检查文件大小（限制为5MB）
      if (file.size > 5 * 1024 * 1024) {
        ElMessage.warning('图片大小不能超过5MB')
        return
      }

      // 检查文件类型
      if (!file.type.startsWith('image/')) {
        ElMessage.warning('请选择图片文件')
        return
      }

      // 发送图片消息
      emit('send-image', file)
      // 清空文件输入
      event.target.value = ''
    }
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

    // 点击其他地方关闭表情符选择器
    const handleClickOutside = (event) => {
      if (!event.target.closest('.input-actions')) {
        showEmojiPicker.value = false
      }
    }
    document.addEventListener('click', handleClickOutside)

    // 全局键盘快捷键
    const handleKeydown = (event) => {
      // Escape 关闭表情符选择器
      if (event.key === 'Escape' && showEmojiPicker.value) {
        showEmojiPicker.value = false
        event.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeydown)
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
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.messages-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 搜索容器样式 */
.search-container {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #343536);
  background: var(--bg-secondary, #1a1a1b);
}

.search-results {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-result-count {
  font-size: 12px;
  color: var(--text-color-secondary, #818384);
}

.search-navigation {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-position {
  font-size: 12px;
  color: var(--text-color-secondary, #818384);
  min-width: 60px;
  text-align: center;
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
  margin-bottom: 16px;
  animation: messageSlideIn 0.3s ease-out;
}

.message-item.own-message {
  flex-direction: row-reverse;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-item.search-highlight {
  background: rgba(255, 69, 0, 0.1);
  border-left: 3px solid var(--primary-color, #ff4500);
}

.message-avatar {
  flex-shrink: 0;
  border: 2px solid var(--border-color, #343536);
  transition: border-color 0.2s ease;
}

.message-item:hover .message-avatar {
  border-color: var(--primary-color, #ff4500);
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
  padding: 10px 14px;
  background: var(--hover-bg, #343536);
  border-radius: 18px;
  color: var(--text-color, #d7dadc);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  position: relative;
  max-width: 100%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.message-content:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.message-item.own-message .message-content {
  background: linear-gradient(135deg, var(--primary-color, #ff4500), #ff6b35);
  color: #fff;
  margin-left: 12px;
}

.message-item:not(.own-message) .message-content {
  margin-right: 12px;
}

/* 消息气泡尾巴 */
.message-content::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border: 6px solid transparent;
  top: 12px;
}

.message-item:not(.own-message) .message-content::before {
  left: -6px;
  border-right-color: var(--hover-bg, #343536);
  border-left: 0;
}

.message-item.own-message .message-content::before {
  right: -6px;
  border-left-color: var(--primary-color, #ff4500);
  border-right: 0;
}

.message-time {
  font-size: 11px;
  color: var(--text-color-secondary, #818384);
  padding: 0 4px;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.message-status {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.status-icon {
  font-size: 12px;
  width: 12px;
  height: 12px;
}

.status-icon.sending {
  color: var(--text-color-secondary, #818384);
  animation: spin 1s linear infinite;
}

.status-icon.sent {
  color: var(--text-color-secondary, #818384);
}

.status-icon.read {
  color: var(--primary-color, #ff4500);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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

.input-actions {
  position: relative;
  display: flex;
  align-items: center;
}

.action-button {
  padding: 8px;
  color: var(--text-color-secondary, #818384);
  transition: color 0.2s;
}

.action-button:hover {
  color: var(--primary-color, #ff4500);
}

.emoji-picker {
  position: absolute;
  bottom: 100%;
  right: 0;
  background: var(--bg-secondary, #1a1a1b);
  border: 1px solid var(--border-color, #343536);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  width: 280px;
  max-height: 200px;
  overflow-y: auto;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
  padding: 12px;
}

.emoji-item {
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.emoji-item:hover,
.emoji-item.selected {
  background: var(--bg-hover, #272729);
  outline: 2px solid var(--primary-color, #ff4500);
}

.send-button {
  flex-shrink: 0;
}

/* 消息菜单 */
.message-menu {
  position: fixed;
  background: var(--bg-secondary, #1a1a1b);
  border: 1px solid var(--border-color, #343536);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  min-width: 120px;
  overflow: hidden;
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

/* 撤回消息样式 */
.message-recalled {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-color-secondary, #818384);
  font-size: 12px;
  font-style: italic;
  padding: 4px 8px;
}

.recall-icon {
  font-size: 12px;
  color: var(--text-color-secondary, #818384);
}

/* 图片消息样式 */
.image-message {
  max-width: 240px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.image-message:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.message-image {
  border-radius: 12px;
  max-width: 100%;
  max-height: 200px;
  cursor: pointer;
  transition: transform 0.2s ease;
  display: block;
}

.message-image:hover {
  transform: scale(1.05);
}

.image-caption {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-primary, #d7dadc);
  word-break: break-word;
  padding: 0 4px;
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

/* 移动端响应式 */
@media (max-width: 768px) {
  .messages-header {
    padding: 8px 12px;
  }

  .messages-header-info {
    gap: 8px;
  }

  .messages-room-name {
    font-size: 13px;
  }

  .messages-container {
    padding: 8px;
    gap: 12px;
  }

  .message-item {
    gap: 8px;
  }

  .message-avatar {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
  }

  .message-content-wrapper {
    max-width: 75%;
  }

  .message-content {
    font-size: 13px;
    padding: 6px 10px;
  }

  .message-time {
    font-size: 10px;
  }

  .message-input-container {
    padding: 8px 12px;
  }

  .search-container {
    padding: 8px 12px;
  }

  /* 图片消息在移动端优化 */
  .image-message {
    max-width: 180px;
  }

  .message-image {
    max-width: 100%;
    max-height: 150px;
  }

  /* 表情符选择器移动端优化 */
  .emoji-picker {
    width: 280px;
    right: -10px;
  }

  .emoji-grid {
    grid-template-columns: repeat(9, 1fr);
    gap: 2px;
    padding: 8px;
  }

  .emoji-item {
    font-size: 18px;
    padding: 2px;
  }

  /* 消息菜单移动端优化 */
  .message-menu {
    min-width: 80px;
    font-size: 12px;
  }

  .menu-item {
    padding: 6px 8px;
  }
}
</style>
