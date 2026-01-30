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
        <el-button
          v-if="messages.length"
          text
          size="small"
          @click="toggleMultiSelect"
        >
          多选
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

      <!-- 加载更多消息指示器 -->
      <div v-if="loadingMoreMessages" class="loading-more-container">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载更多消息...</span>
      </div>

      <!-- 没有更多消息提示 -->
      <div v-else-if="!hasMoreMessages && messages.length > 0" class="no-more-messages">
        <el-icon>
          <InfoFilled />
        </el-icon>
        <span>没有更多消息了</span>
      </div>

      <!-- 消息列表 -->
      <div class="messages-list">
        <div
          v-for="(message, messageIndex) in displayedMessages"
          :key="message.id"
          :class="['message-item', {
            'own-message': isOwnMessage(message.user_id),
            'search-highlight': isSearchResult(messageIndex),
            'is-selected': isMessageSelected(message.id)
          }]"
          @click="handleMessageClick(message)"
        >
          <el-avatar
            :size="36"
            :src="getUserAvatar(message.user_id)"
            class="message-avatar"
          >
            {{ message.username?.charAt(0)?.toUpperCase() || 'U' }}
          </el-avatar>
          <div class="message-content-wrapper">
            <!-- 多选勾选框 -->
            <div v-if="multiSelectMode" class="message-select-checkbox">
              <el-checkbox
                :model-value="isMessageSelected(message.id)"
                @change.stop="toggleMessageSelection(message)"
              />
            </div>
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
              <!-- 根据消息类型渲染不同内容 -->
              <!-- 视频消息 -->
              <div v-if="message.messageType === 'video'" class="video-message">
                <video
                  :src="message.fileUrl || message.imageUrl"
                  controls
                  preload="metadata"
                  class="message-video"
                  @click.stop
                />
              </div>
              <!-- 文件消息（非图片、视频） -->
              <div v-else-if="message.messageType === 'file' || message.messageType === 'audio'">
                <div class="file-message">
                  <el-icon class="file-icon">
                    <Document />
                  </el-icon>
                  <div class="file-info">
                    <div class="file-name">
                      {{ message.fileName || '文件' }}
                    </div>
                    <div v-if="message.fileSize" class="file-size">
                      {{ formatFileSize(message.fileSize) }}
                    </div>
                  </div>
                  <el-button
                    size="small"
                    type="primary"
                    @click="openFile(message)"
                  >
                    打开
                  </el-button>
                </div>
              </div>
              <!-- 其他消息（包括图片和文本）都用HTML渲染 -->
              <div v-else v-html="message.content" />
              <!-- 消息菜单 -->
              <div
                v-if="menuVisible && selectedMessage?.id === message.id"
                class="message-menu"
                :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
                @click.stop
              >
                <div
                  v-if="canCopyMessage(message)"
                  class="menu-item"
                  @click="copyMessage(message)"
                >
                  <el-icon><DocumentCopy /></el-icon>
                  <span>复制</span>
                </div>
                <div
                  v-if="canDownloadMessage(message)"
                  class="menu-item"
                  @click="downloadMessageFile(message)"
                >
                  <el-icon><Download /></el-icon>
                  <span>下载</span>
                </div>
                <div
                  v-if="canRecallMessage(message)"
                  class="menu-item"
                  @click="recallMessage(message)"
                >
                  <el-icon><Back /></el-icon>
                  <span>撤回消息</span>
                </div>
                <div
                  class="menu-item"
                  @click="enterMultiSelectFromMessage(message)"
                >
                  <el-icon><Select /></el-icon>
                  <span>多选</span>
                </div>
                <div
                  class="menu-item"
                  @click="deleteSingleMessage(message)"
                >
                  <el-icon><Delete /></el-icon>
                  <span>删除</span>
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

    <!-- 多选操作条（固定在输入框上方） -->
    <div v-if="multiSelectMode" class="multi-select-bar">
      <span class="multi-select-text">
        已选择 {{ selectedCount }} 条消息
      </span>
      <el-button
        text
        size="small"
        :disabled="!selectedCount"
        @click="handleMultiOperation('copy')"
      >
        复制
      </el-button>
      <el-button
        text
        size="small"
        :disabled="!selectedCount"
        @click="handleMultiOperation('delete')"
      >
        删除
      </el-button>
      <el-button
        text
        size="small"
        @click="exitMultiSelect"
      >
        取消
      </el-button>
    </div>

    <!-- 消息输入框 -->
    <div class="message-input-container">
      <!-- 中间 wangEditor 输入区 -->
      <RichTextEditor
        ref="richTextEditorRef"
        :disabled="sendingMessage"
        class="message-input"
        @submit="handleSend"
        @send-file="handleSendFile"
      />

      <!-- 右下角发送按钮 -->
      <div class="send-button-wrapper">
        <el-button
          type="primary"
          :loading="sendingMessage"
          :disabled="sendingMessage"
          class="send-button"
          @click="handleSend"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, nextTick, onMounted, defineExpose } from 'vue'
  import { Loading, Check, CircleCheck, InfoFilled, Back, Search, Close, ArrowUp, ArrowDown, DocumentCopy, Download, Delete, Document, Select } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import RichTextEditor from './RichTextEditor.vue'
  import { throttle, debounce } from '@/utils/throttleDebounce'

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
  const emit = defineEmits([
    'send-message',
    'recall-message',
    'send-image',
    'send-file',
    'delete-message',
    'multi-operation',
    'load-more-messages'
  ])

  const richTextEditorRef = ref(null)
  const messagesContainerRef = ref(null)
  const menuVisible = ref(false)
  const selectedMessage = ref(null)
  const menuPosition = ref({ x: 0, y: 0 })
  const showSearch = ref(false)
  const searchQuery = ref('')
  const searchResults = ref([])
  const currentSearchIndex = ref(-1)
  const multiSelectMode = ref(false)
  const selectedMessageIds = ref(new Set())
  const loadedMessageCount = ref(20) // 默认加载最新的20条消息
  const loadingMoreMessages = ref(false) // 加载更多消息的状态
  const hasMoreMessages = ref(true) // 是否还有更多消息可以加载

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

  function isMessageSelected (id) {
    return selectedMessageIds.value.has(id)
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
      // 使用 setTimeout 确保DOM完全渲染
      setTimeout(() => {
        messagesContainerRef.value.scrollTop = messagesContainerRef.value.scrollHeight
      }, 50)
    }
  }

  // 发送消息（直接发送HTML内容，包含文本和媒体）
  function handleSend () {
    if (props.sendingMessage) return

    const editor = richTextEditorRef.value
    if (!editor || !editor.getHtml) return

    const html = editor.getHtml() || ''

    // 检查是否只是空的HTML标签
    if (html === '<p><br></p>' || html === '<p></p>' || html.trim() === '') {
      return
    }

    // 直接发送HTML内容（包含文本、表情和媒体）
    emit('send-message', html)

    // 清空编辑器内容
    if (editor.clear) {
      editor.clear()
    }
  }

  // 处理文件发送（用于视频直接发送）
  function handleSendFile (payload) {
    emit('send-file', payload)
  }

  // 点击消息（多选模式下切换选中）
  function handleMessageClick (message) {
    if (!multiSelectMode.value) return
    toggleMessageSelection(message)
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

  // 复制消息
  function canCopyMessage (message) {
    return !message.recalled && (!message.messageType || message.messageType === 'text')
  }

  async function copyMessage (message) {
    if (!canCopyMessage(message)) return
    // 优先使用 content_text，如果没有则从 content 中提取纯文本
    const textToCopy = message.content_text || extractPlainText(message.content || '')
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      ElMessage.success('已复制到剪贴板')
    } catch (e) {
      ElMessage.error('复制失败，请手动选择文本')
    } finally {
      menuVisible.value = false
    }
  }

  // 文件下载/打开
  function canDownloadMessage (message) {
    return ['image', 'video', 'audio', 'file'].includes(message.messageType) && (message.imageUrl || message.fileUrl)
  }

  function downloadMessageFile (message) {
    const url = message.imageUrl || message.fileUrl
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = message.fileName || ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    menuVisible.value = false
  }

  function openFile (message) {
    if (!message.fileUrl) return
    window.open(message.fileUrl, '_blank')
  }

  function openImage (message) {
    if (!message.imageUrl) return
    window.open(message.imageUrl, '_blank')
  }

  function formatFileSize (size) {
    if (!size && size !== 0) return ''
    if (size < 1024) return size + 'B'
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB'
    if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + 'MB'
    return (size / (1024 * 1024 * 1024)).toFixed(1) + 'GB'
  }


  // 多选相关
  function toggleMultiSelect () {
    multiSelectMode.value = !multiSelectMode.value
    if (!multiSelectMode.value) {
      selectedMessageIds.value = new Set()
    }
  }

  function enterMultiSelectFromMessage (message) {
    multiSelectMode.value = true
    selectedMessageIds.value = new Set([message.id])
    menuVisible.value = false
  }

  function toggleMessageSelection (message) {
    const set = new Set(selectedMessageIds.value)
    if (set.has(message.id)) {
      set.delete(message.id)
    } else {
      set.add(message.id)
    }
    selectedMessageIds.value = set
  }

  function exitMultiSelect () {
    multiSelectMode.value = false
    selectedMessageIds.value = new Set()
  }

  const selectedCount = computed(() => selectedMessageIds.value.size)

  // 显示的消息（直接显示所有传入的消息）
  const displayedMessages = computed(() => {
    return props.messages
  })

  function deleteSingleMessage (message) {
    emit('delete-message', [message.id])
    menuVisible.value = false
  }

  function handleMultiOperation (action) {
    if (!selectedMessageIds.value.size) return
    const ids = Array.from(selectedMessageIds.value)
    emit('multi-operation', { action, messageIds: ids })
    if (action === 'delete') {
      // 交给父组件处理删除；这里仅退出多选模式
      exitMultiSelect()
    }
  }

  // 执行搜索（防抖处理）
  const performSearch = debounce(() => {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      currentSearchIndex.value = -1
      return
    }

    const query = searchQuery.value.toLowerCase()
    const results = props.messages
      .map((message, index) => ({ message, index }))
      .filter(({ message }) => {
        if (message.recalled) return false
        // 优先使用 content_text，如果没有则从 content 中提取纯文本
        const searchText = message.content_text || extractPlainText(message.content || '')
        return searchText && searchText.toLowerCase().includes(query)
      })

    searchResults.value = results
    currentSearchIndex.value = results.length > 0 ? 0 : -1

    // 滚动到第一个搜索结果
    if (results.length > 0) {
      scrollToMessage(results[0].index)
    }
  }, 300)

  // 从HTML内容中提取纯文本
  function extractPlainText (html) {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return div.innerText || div.textContent || ''
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

  // 处理滚动事件，检查是否需要加载更多消息（节流处理）
  const handleScroll = throttle(() => {
    if (!messagesContainerRef.value || loadingMoreMessages.value || !hasMoreMessages.value) {
      return
    }

    const container = messagesContainerRef.value
    const scrollTop = container.scrollTop

    // 当滚动到距离顶部100px以内时，加载更多消息
    if (scrollTop <= 100) {
      loadMoreMessages()
    }
  }, 200)

  // 加载更多消息
  function loadMoreMessages () {
    if (loadingMoreMessages.value || !hasMoreMessages.value) return

    loadingMoreMessages.value = true

    // 记录当前滚动位置，用于加载完成后保持位置
    const container = messagesContainerRef.value
    const scrollHeight = container.scrollHeight

    // 通知父组件加载更多消息，一次加载20条
    emit('load-more-messages', {
      roomId: props.activeRoomId,
      currentLoadedCount: props.messages.length,
      loadCount: 20,
      scrollHeight: scrollHeight
    })
  }

  // 完成加载更多消息（由父组件调用）
  function finishLoadMoreMessages (scrollHeightBeforeLoad, newMessageCount = 0, hasMore = false) {
    loadingMoreMessages.value = false
    hasMoreMessages.value = hasMore

    // 保持滚动位置，避免页面跳动
    nextTick(() => {
      const container = messagesContainerRef.value
      if (container) {
        const newScrollHeight = container.scrollHeight
        const scrollDiff = newScrollHeight - scrollHeightBeforeLoad

        // 只有当确实有新的内容高度变化时才调整滚动位置
        if (scrollDiff > 0) {
          container.scrollTop += scrollDiff
        }
      }
    })
  }

  // 检查消息是否为搜索结果
  function isSearchResult (messageIndex) {
    return searchResults.value.some(result => result.index === messageIndex)
  }

  // 监听消息变化，只有在发送新消息时才滚动到底部
  watch(() => props.messages.length, (newLength, oldLength) => {
    // 只有在非加载状态、有消息且消息数量增加（发送新消息）时才滚动到底部
    // 不包括加载历史消息的情况
    if (!props.loadingMessages && newLength > oldLength && props.messages.length > 0 && !loadingMoreMessages.value) {
      scrollToBottom()
    }
  })

  // 监听房间变化，重置加载计数
  watch(() => props.activeRoomId, () => {
    loadedMessageCount.value = 20 // 重置为默认20条
    loadingMoreMessages.value = false
    hasMoreMessages.value = true // 重置为true，因为新房间可能有更多消息
  })

  // 监听消息数量变化，更新loadedMessageCount
  watch(() => props.messages.length, (newLength) => {
    // 如果消息数量发生变化，更新loadedMessageCount
    if (newLength > loadedMessageCount.value) {
      loadedMessageCount.value = newLength
    }
  })

  // 监听房间变化，滚动到底部
  watch(() => props.activeRoomId, () => {
    // 当切换房间时，等待DOM更新
    nextTick(() => {
      // 如果消息已经加载完成，直接滚动
      if (!props.loadingMessages && props.messages.length > 0) {
        scrollToBottom()
      }
    })
  })

  // 监听消息加载状态，当从加载中变为加载完成时滚动到底部
  watch(() => props.loadingMessages, (newVal, oldVal) => {
    // 从加载中变为加载完成时，滚动到底部
    if (oldVal && !newVal && props.messages.length > 0) {
      nextTick(() => {
        scrollToBottom()
      })
    }
  })

  onMounted(() => {
    scrollToBottom()

    // 添加滚动事件监听
    if (messagesContainerRef.value) {
      messagesContainerRef.value.addEventListener('scroll', handleScroll)
    }

    // 全局键盘快捷键
    const handleKeydown = (event) => {
      // 预留快捷键位
    }
    document.addEventListener('keydown', handleKeydown)
  })

  // 暴露方法给父组件
  defineExpose({
    finishLoadMoreMessages
  })
</script>

<style scoped>
.chat-messages-view {
  flex: 1;
  display: flex;
  height: 100%;
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

.loading-more-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--text-color-secondary, #818384);
  font-size: 12px;
}

.no-more-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--text-color-secondary, #818384);
  font-size: 12px;
  border-top: 1px solid var(--border-color, #343536);
  margin-top: 16px;
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

.message-item.is-selected .message-content {
  box-shadow: 0 0 0 2px var(--primary-color, #ff4500);
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

.message-select-checkbox {
  margin-bottom: 4px;
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
  padding: 4px 16px;
  border-top: 1px solid var(--border-color, #343536);
  display: flex;
  flex: 1;
  max-height: min-content;
  flex-direction: column;
  gap: 8px;
}

.message-input {
  flex: 1;
}

.input-top-actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.action-button {
  padding: 8px;
  color: var(--text-color-secondary, #818384);
  transition: color 0.2s;
}

.action-button:hover {
  color: var(--primary-color, #ff4500);
}

.send-button-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
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

/* 视频消息样式 */
.video-message {
  max-width: 240px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.video-message:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.message-video {
  border-radius: 12px;
  max-width: 100%;
  max-height: 200px;
  display: block;
  background: #000;
}

.video-caption {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-primary, #d7dadc);
  word-break: break-word;
  padding: 0 4px;
  text-align: center;
}

/* 文件消息样式 */
.file-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary, #2a2b2e);
  border-radius: 8px;
  border: 1px solid var(--border-color, #3a3b3e);
}

.file-icon {
  font-size: 24px;
  color: var(--primary-color, #ff4500);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  color: var(--text-color, #d7dadc);
  font-weight: 500;
  word-break: break-all;
}

.file-size {
  font-size: 12px;
  color: var(--text-color-secondary, #818384);
  margin-top: 2px;
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

  /* 视频消息在移动端优化 */
  .video-message {
    max-width: 180px;
  }

  .message-video {
    max-width: 100%;
    max-height: 150px;
  }

  /* 文件消息在移动端优化 */
  .file-message {
    padding: 6px 8px;
    gap: 6px;
  }

  .file-icon {
    font-size: 20px;
  }

  .file-name {
    font-size: 13px;
  }

  .file-size {
    font-size: 11px;
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
