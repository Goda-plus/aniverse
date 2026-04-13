<template>
  <el-dialog
    :model-value="visible"
    width="920px"
    append-to-body
    class="crowdfunding-support-chat-dialog"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleUpdate"
    @close="handleClose"
  >
    <template #header>
      <div class="cf-support-header">
        <span class="cf-support-title">众筹项目沟通</span>
        <span class="cf-support-sub">与好友聊天窗口独立，仅用于项目相关联系</span>
      </div>
    </template>

    <div v-loading="loadingRoom" class="cf-support-body">
      <MessageList
        v-if="activeRoom && !loadingRoom"
        ref="messageListRef"
        :messages="messages"
        :loading-messages="loadingMessages"
        :sending-message="sendingMessage"
        :current-user-id="currentUserId"
        :active-room-id="activeRoom.id"
        :chat-rooms="chatRooms"
        :friends="[]"
        @send-message="handleSendMessage"
        @recall-message="handleRecallMessage"
        @send-image="handleSendImage"
        @send-file="handleSendFile"
        @delete-message="handleDeleteMessages"
        @local-delete-message="handleLocalDeleteMessages"
        @multi-operation="handleMultiOperation"
        @load-more-messages="handleLoadMoreMessages"
      />
      <el-empty v-else-if="!loadingRoom" description="暂无众筹沟通会话" />
    </div>
  </el-dialog>
</template>

<script setup>
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import MessageList from './MessageList.vue'
  import { initSocket } from '@/utils/socket'
  import { useUserStore } from '@/stores/user'
  import { getRoomList, getChatHistory, deleteMessage, hideMessage } from '@/axios/chat'

  const CROWD_PREFIX = '__CROWDFUNDING_SUPPORT__:'

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    },
    initialRoomId: {
      type: [Number, String],
      default: null
    }
  })

  const emit = defineEmits(['update:visible', 'close', 'room-initialized'])

  const userStore = useUserStore()
  const currentUserId = computed(() => userStore.user?.id)
  const socket = ref(null)
  const messageListRef = ref(null)

  const loadingRoom = ref(false)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)
  const activeRoom = ref(null)
  const chatRooms = ref([])
  const messages = ref([])

  function handleVisibleUpdate (val) {
    emit('update:visible', val)
  }

  function handleClose () {
    emit('close')
  }

  function extractPlainText (html) {
    if (!html) return ''
    const div = document.createElement('div')
    div.innerHTML = html
    return div.innerText || div.textContent || ''
  }

  function displayTitleFromRoomName (name) {
    if (!name || !name.startsWith(CROWD_PREFIX)) return '众筹沟通'
    const rest = name.slice(CROWD_PREFIX.length)
    const projectId = rest.split(':')[0]
    return projectId ? `项目 #${projectId}` : '众筹沟通'
  }

  function getCrowdfundingDisplayName (room) {
    const peerName = room?.members?.[0]?.username?.trim()
    if (peerName) return `${peerName} · ${displayTitleFromRoomName(room?.name)}`
    return displayTitleFromRoomName(room?.name)
  }

  async function loadCrowdfundingRoom () {
    const roomId = Number(props.initialRoomId)
    if (!roomId || !props.visible) return
    loadingRoom.value = true
    try {
      const res = await getRoomList({ scene: 'crowdfunding_support' })
      if (!res.success) {
        ElMessage.error(res.message || '加载众筹会话失败')
        return
      }
      const list = (res.data || []).map(item => ({
        ...item,
        name: getCrowdfundingDisplayName(item)
      }))
      chatRooms.value = list
      const room = list.find(r => Number(r.id) === roomId)
      if (!room) {
        ElMessage.warning('会话不存在或无权限访问')
        return
      }
      activeRoom.value = room
      if (socket.value) {
        socket.value.emit('joinRoom', String(room.id))
      }
      await loadMessages(room.id)
      emit('room-initialized', room.id)
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '加载众筹会话失败')
    } finally {
      loadingRoom.value = false
    }
  }

  async function loadMessages (roomId) {
    loadingMessages.value = true
    try {
      const res = await getChatHistory({ roomId, page: 1, pageSize: 20 })
      if (res.success && res.data) {
        messages.value = (res.data.list || []).map(msg => ({
          ...msg,
          messageType: msg.messageType || msg.message_type || 'text',
          content_text: msg.content_text || extractPlainText(msg.content || ''),
          status: msg.user_id === currentUserId.value ? 'sent' : 'read'
        }))
      }
    } catch (error) {
      ElMessage.error('加载消息失败')
    } finally {
      loadingMessages.value = false
    }
  }

  function updateRoomLastMessage (content, username) {
    if (!activeRoom.value) return
    activeRoom.value = {
      ...activeRoom.value,
      lastMessage: {
        content_text: content,
        username,
        created_at: new Date().toISOString()
      }
    }
    chatRooms.value = [activeRoom.value]
  }

  async function sendMessage (content) {
    if (!content?.trim() || !activeRoom.value?.id || sendingMessage.value) return
    const contentText = extractPlainText(content).trim()
    if (!contentText) return

    const tempId = Date.now()
    messages.value.push({
      id: tempId,
      user_id: currentUserId.value,
      username: userStore.username,
      content,
      content_text: contentText,
      messageType: 'text',
      created_at: new Date().toISOString(),
      status: 'sending'
    })

    sendingMessage.value = true
    try {
      if (!socket.value) {
        ElMessage.warning('连接已断开，请刷新页面')
        messages.value = messages.value.filter(msg => msg.id !== tempId)
        return
      }
      socket.value.emit('chatMessage', {
        roomId: String(activeRoom.value.id),
        content,
        content_text: contentText
      })
      updateRoomLastMessage(contentText, userStore.username)
    } catch (error) {
      ElMessage.error('发送消息失败')
      messages.value = messages.value.filter(msg => msg.id !== tempId)
    } finally {
      sendingMessage.value = false
    }
  }

  async function sendFileLikeMessage ({ payload, tempId, messageType, placeholderContent }) {
    if (!activeRoom.value?.id || sendingMessage.value) return
    const isFile = payload instanceof File
    const url = isFile ? URL.createObjectURL(payload) : payload?.url
    const fileName = isFile ? payload.name : payload?.name
    const fileSize = isFile ? payload.size : payload?.size

    const baseMessage = {
      id: tempId,
      user_id: currentUserId.value,
      username: userStore.username,
      content_text: placeholderContent,
      created_at: new Date().toISOString(),
      messageType,
      status: 'sending'
    }

    if (messageType === 'image') {
      baseMessage.content = `<img src="${url}" alt="图片" style="max-width: 240px; border-radius: 12px;">`
      baseMessage.imageUrl = url
    } else if (messageType === 'video') {
      baseMessage.content = `<video src="${url}" controls style="max-width: 240px; border-radius: 12px;" preload="metadata"></video>`
      baseMessage.fileUrl = url
      baseMessage.fileName = fileName
      baseMessage.fileSize = fileSize
    } else {
      baseMessage.content = placeholderContent
      baseMessage.fileUrl = url
      baseMessage.fileName = fileName
      baseMessage.fileSize = fileSize
    }

    messages.value.push(baseMessage)
    sendingMessage.value = true
    try {
      socket.value.emit('chatMessage', {
        roomId: String(activeRoom.value.id),
        content: baseMessage.content,
        content_text: placeholderContent,
        imageUrl: messageType === 'image' ? url : undefined,
        fileUrl: messageType !== 'image' ? url : undefined,
        fileName: messageType !== 'image' ? fileName : undefined,
        fileSize: messageType !== 'image' ? fileSize : undefined,
        messageType
      })
      updateRoomLastMessage(placeholderContent, userStore.username)
    } catch (error) {
      ElMessage.error('发送文件失败')
      messages.value = messages.value.filter(msg => msg.id !== tempId)
    } finally {
      sendingMessage.value = false
    }
  }

  function handleSendMessage (content) {
    sendMessage(content)
  }

  async function handleSendImage (payload) {
    await sendFileLikeMessage({
      payload,
      tempId: Date.now(),
      messageType: 'image',
      placeholderContent: '[图片]'
    })
  }

  async function handleSendFile (payload) {
    const mime = payload?.type || payload?.file?.type || ''
    let messageType = 'file'
    if (mime.startsWith('video/')) messageType = 'video'
    if (mime.startsWith('audio/')) messageType = 'audio'
    await sendFileLikeMessage({
      payload,
      tempId: Date.now(),
      messageType,
      placeholderContent: payload?.name || payload?.file?.name || '文件'
    })
  }

  async function handleRecallMessage (messageId) {
    const messageIndex = messages.value.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1 || !activeRoom.value?.id) return
    messages.value[messageIndex].recalled = true
    messages.value[messageIndex].content = ''
    messages.value[messageIndex].content_text = ''
    socket.value?.emit('recallMessage', {
      roomId: String(activeRoom.value.id),
      messageId
    })
  }

  async function handleDeleteMessages (ids) {
    if (!Array.isArray(ids) || ids.length === 0) return
    try {
      for (const messageId of ids) {
        await deleteMessage({ messageId })
      }
      messages.value = messages.value.filter(msg => !ids.includes(msg.id))
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '删除消息失败')
    }
  }

  async function handleLocalDeleteMessages (ids) {
    if (!Array.isArray(ids) || ids.length === 0) return
    try {
      for (const messageId of ids) {
        await hideMessage({ messageId })
      }
      messages.value = messages.value.filter(msg => !ids.includes(msg.id))
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '隐藏消息失败')
    }
  }

  function handleMultiOperation (payload) {
    const { action, messageIds } = payload || {}
    if (!Array.isArray(messageIds) || !messageIds.length) return
    if (action === 'delete') {
      handleDeleteMessages(messageIds)
    }
  }

  async function handleLoadMoreMessages (payload) {
    const { roomId, currentLoadedCount, loadCount, scrollHeight } = payload
    if (!roomId) return
    try {
      const page = Math.ceil((currentLoadedCount + loadCount) / 20)
      const res = await getChatHistory({ roomId, page, pageSize: 20 })
      if (res.success && res.data?.list?.length) {
        const olderMessages = res.data.list.map(msg => ({
          ...msg,
          messageType: msg.messageType || msg.message_type || 'text',
          content_text: msg.content_text || extractPlainText(msg.content || ''),
          status: msg.user_id === currentUserId.value ? 'sent' : 'read'
        }))
        messages.value.unshift(...olderMessages)
        await nextTick()
        messageListRef.value?.finishLoadMoreMessages(scrollHeight, olderMessages.length, res.data.pagination?.hasMore || false)
      } else {
        messageListRef.value?.finishLoadMoreMessages(scrollHeight, 0, false)
      }
    } catch (error) {
      messageListRef.value?.finishLoadMoreMessages(scrollHeight)
      ElMessage.error('加载更多消息失败')
    }
  }

  function setupSocketListeners () {
    if (!socket.value) return
    socket.value.on('chatMessage', (data) => {
      if (Number(data.roomId) !== Number(activeRoom.value?.id)) return
      const isOwnMessage = Number(data.userId) === Number(currentUserId.value)
      if (!isOwnMessage) {
        messages.value.push({
          id: data.id,
          user_id: data.userId,
          username: data.user,
          content: data.content,
          content_text: data.content_text || extractPlainText(data.content || ''),
          imageUrl: data.imageUrl,
          messageType: data.messageType || 'text',
          created_at: data.time || new Date().toISOString(),
          status: 'read'
        })
      } else {
        const lastMsg = messages.value[messages.value.length - 1]
        if (lastMsg && lastMsg.user_id === currentUserId.value && lastMsg.status === 'sending') {
          lastMsg.id = data.id
          lastMsg.status = 'sent'
          lastMsg.content_text = data.content_text || extractPlainText(data.content || '')
        }
      }
      updateRoomLastMessage(data.content_text || extractPlainText(data.content || ''), data.user)
    })

    socket.value.on('messageRecalled', (data) => {
      if (Number(data.roomId) !== Number(activeRoom.value?.id)) return
      const idx = messages.value.findIndex(msg => msg.id === data.messageId)
      if (idx > -1) {
        messages.value[idx].recalled = true
        messages.value[idx].content = ''
        messages.value[idx].content_text = ''
      }
    })
  }

  function clearSocketListeners () {
    if (!socket.value) return
    socket.value.off('chatMessage')
    socket.value.off('messageRecalled')
  }

  watch(() => props.visible, (visible) => {
    if (visible) {
      loadCrowdfundingRoom()
    } else {
      activeRoom.value = null
      chatRooms.value = []
      messages.value = []
    }
  })

  watch(() => props.initialRoomId, () => {
    if (props.visible) {
      loadCrowdfundingRoom()
    }
  })

  onMounted(() => {
    if (userStore.isLoggedIn) {
      socket.value = initSocket()
      setupSocketListeners()
    }
  })

  onUnmounted(() => {
    clearSocketListeners()
  })
</script>

<style scoped>
.cf-support-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.cf-support-title {
  font-size: 16px;
  font-weight: 600;
}

.cf-support-sub {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 400;
}

.cf-support-body {
  height: 68vh;
  min-height: 520px;
}

:deep(.crowdfunding-support-chat-dialog .el-dialog__body) {
  padding-top: 8px;
}
</style>
