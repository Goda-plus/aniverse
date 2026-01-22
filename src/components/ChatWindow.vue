<template>
  <div v-if="isVisible" class="chat-window-container">
    <!-- 聊天窗口 -->
    <div 
      ref="chatWindowRef"
      class="chat-window" 
    >
      <!-- 窗口标题栏 -->
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="reddit-logo">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm5.25 11.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm-10.5 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm10.5-3c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm-10.5 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z" />
            </svg>
          </div>
          <span class="chat-title">聊天</span>
        </div>
        <div class="chat-header-right">
          <el-dropdown trigger="click" placement="bottom-start">
            <span class="dropdown-trigger">
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="switchView('create')">
                  <el-icon><Plus /></el-icon>
                  <span class="dropdown-text">开始新聊天</span>
                </el-dropdown-item>
                <el-dropdown-item @click="openAddFriendView">
                  <el-icon><User /></el-icon>
                  <span class="dropdown-text">添加好友</span>
                </el-dropdown-item>
                <el-dropdown-item @click="openCreateGroupDialog">
                  <el-icon><CopyDocument /></el-icon>
                  <span class="dropdown-text">创建群聊</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-icon
            class="header-icon window-control close-icon"
            title="关闭"
            @click.stop="closeWindow"
          >
            <Close />
          </el-icon>
        </div>
      </div>

      <!-- 窗口内容 -->
      <div class="chat-content">
        <div class="chat-sidebar">
          <div class="sidebar-search">
            <el-input
              v-model="sidebarFilter"
              placeholder="搜索好友或群聊"
              clearable
              :prefix-icon="Search"
            />
          </div>

          <div class="chat-sidebar-body">
            <!-- 左侧：好友 + 最近会话列表（始终显示；所有"操作视图"都在右侧主内容区） -->
            <div class="list-view">
              <el-collapse v-model="activeCollapsePanels" class="sidebar-collapse">
                <NotificationList
                  :notifications="notifications"
                  :socket="socket"
                  @close-notification="closeNotification"
                  @update-notifications="handleNotificationUpdate"
                  @friend-request-handled="handleFriendRequestHandled"
                  @navigate-to-room="handleNavigateToRoom"
                />

                <FriendList
                  :friends="friends"
                  :sidebar-filter="sidebarFilter"
                  :loading-friends="loadingFriends"
                  :active-room-id="activeRoomId"
                  :chat-rooms="chatRooms"
                  :starting-chat-with-friend="startingChatWithFriend"
                  @open-add-friend-view="openAddFriendView"
                  @select-room="handleSelectRoom"
                  @load-chat-rooms="loadChatRooms"
                  @friend-chat-opened="startingChatWithFriend = $event"
                />

                <RecentChats
                  :chat-rooms="chatRooms"
                  :sidebar-filter="sidebarFilter"
                  :loading-rooms="loadingRooms"
                  :active-room-id="activeRoomId"
                  @switch-view="switchView"
                  @select-room="handleSelectRoom"
                />
              </el-collapse>
            </div>
          </div>
        </div>

        <div class="chat-main">
          <!-- 创建新聊天视图（右侧主内容） -->
          <div v-if="currentView === 'create'" class="create-chat-view">
            <div class="create-chat-content">
              <el-input
                v-model="searchUsername"
                placeholder="输入用户名*"
                class="username-input"
                @keyup.enter="handleCreateChat"
              />
              <p class="create-chat-hint">
                按用户名搜索并与其聊天。
              </p>
              <div class="create-chat-actions">
                <el-button @click="switchView('chat')">
                  取消
                </el-button>
                <el-button type="primary" :loading="creatingChat" @click="handleCreateChat">
                  创建
                </el-button>
              </div>
            </div>
          </div>

          <!-- 添加好友视图（右侧主内容） -->
          <div v-else-if="currentView === 'addFriend'" class="add-friend-view">
            <div class="add-friend-header">
              <div>
                <div class="add-friend-title">
                  添加好友
                </div>
                <div class="add-friend-subtitle">
                  搜索用户名并发送好友请求
                </div>
              </div>
              <el-button text @click="switchView('chat')">
                返回聊天
              </el-button>
            </div>

            <div class="add-friend-search">
              <el-input
                v-model="searchUserKeyword"
                placeholder="输入用户名"
                clearable
                :prefix-icon="Search"
                @keyup.enter="performUserSearch"
              />
              <el-button 
                type="primary" 
                :loading="searchingUsers" 
                class="search-btn"
                @click="performUserSearch"
              >
                搜索
              </el-button>
            </div>

            <div class="add-friend-results">
              <div v-if="searchingUsers" class="loading-container">
                <el-icon class="is-loading">
                  <Loading />
                </el-icon>
                <span>搜索中...</span>
              </div>
              <div v-else-if="searchResults.length === 0" class="empty-chat-list compact">
                <h3>搜索用户</h3>
                <p>输入用户名后点击搜索，支持直接发送好友请求。</p>
              </div>
              <div v-else class="search-results-list">
                <div
                  v-for="user in searchResults"
                  :key="user.id"
                  class="search-result-item"
                >
                  <el-avatar
                    :size="40"
                    :src="user.avatar_url"
                    class="room-avatar"
                  >
                    {{ user.username?.charAt(0)?.toUpperCase() || 'U' }}
                  </el-avatar>
                  <div class="result-info">
                    <div class="result-name">
                      {{ user.username }}
                    </div>
                    <div class="result-bio">
                      {{ user.bio || '这个用户很神秘~' }}
                    </div>
                  </div>
                  <div class="result-actions">
                    <el-tag v-if="isSelf(user.id)" type="info">
                      自己
                    </el-tag>
                    <el-tag v-else-if="isAlreadyFriend(user.id)" type="success">
                      已是好友
                    </el-tag>
                    <el-button
                      v-else
                      type="primary"
                      size="small"
                      :loading="isAddingFriend(user.id)"
                      @click.stop="handleAddFriendFromSearch(user)"
                    >
                      添加
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 聊天消息视图 -->
          <MessageList
            v-if="activeRoomId"
            :messages="messages"
            :loading-messages="loadingMessages"
            :sending-message="sendingMessage"
            :current-user-id="currentUserId"
            :active-room-id="activeRoomId"
            :chat-rooms="chatRooms"
            :friends="friends"
            @send-message="handleSendMessage"
          />

          <div v-else class="chat-main-empty">
            <p v-if="currentView === 'addFriend'">
              在这里搜索用户名并添加好友
            </p>
            <p v-else>
              选择左侧的聊天以开始对话
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 创建群聊弹窗 -->
    <el-dialog
      v-model="createGroupDialogVisible"
      title="创建群聊"
      width="520px"
    >
      <el-form label-position="top" class="group-form">
        <el-form-item label="群聊名称">
          <el-input
            v-model="groupName"
            placeholder="请输入群聊名称"
          />
        </el-form-item>
        <el-form-item label="选择成员">
          <el-select
            v-model="selectedGroupMembers"
            multiple
            filterable
            placeholder="选择好友"
            style="width: 100%"
          >
            <el-option
              v-for="friend in friends"
              :key="friend.id"
              :label="friend.username"
              :value="friend.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createGroupDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="creatingGroup" @click="submitCreateGroup">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
  import { 
    ChatDotRound, 
    Close, 
    CopyDocument,
    ArrowDown,
    Loading,
    Check,
    User,
    Setting,
    Search,
    Plus
  } from '@element-plus/icons-vue'
  import { ElMessage } from 'element-plus'
  import { initSocket } from '@/utils/socket'
  import { getRoomList, createRoom, getChatHistory } from '@/axios/chat'
  import { getFriendList, addFriend, searchUsers } from '@/axios/friend'
  import { useUserStore } from '@/stores/user'
  import { gsap } from 'gsap'
  import { Draggable } from 'gsap/Draggable'
  import NotificationList from './NotificationList.vue'
  import FriendList from './FriendList.vue'
  import RecentChats from './RecentChats.vue'
  import MessageList from './MessageList.vue'
  
  gsap.registerPlugin(Draggable)

  // eslint-disable-next-line no-undef
  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits(['update:visible', 'close'])

  // 状态管理
  const isVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
  })

  const currentView = ref('chat') // 'chat' | 'create' | 'addFriend'
  const activeRoomId = ref(null)
  const activeCollapsePanels = ref(['notifications', 'friends', 'rooms']) // 控制折叠面板的展开状态
  const chatRooms = ref([])
  const messages = ref([])
  const messageInput = ref('')
  const loadingRooms = ref(false)
  const loadingMessages = ref(false)
  const sendingMessage = ref(false)
  const creatingChat = ref(false)
  const searchUsername = ref('')
  const friends = ref([])
  const loadingFriends = ref(false)
  const sidebarFilter = ref('')
  const createGroupDialogVisible = ref(false)
  const groupName = ref('')
  const selectedGroupMembers = ref([])
  const creatingGroup = ref(false)
  const startingChatWithFriend = ref(null)
  const searchUserKeyword = ref('')
  const searchResults = ref([])
  const searchingUsers = ref(false)
  const addingFriendIds = ref(new Set())
  const messagesContainer = ref(null)
  const chatWindowRef = ref(null)
  const draggableInstance = ref(null)

  // 消息通知相关状态
  const notifications = ref([
    // Mock 数据 - 好友申请
    {
      id: 'mock-friend-request-1',
      type: 'friendRequest',
      title: '好友请求',
      message: '用户 Alice 想添加你为好友',
      fromUserId: 1001,
      fromUsername: 'Alice',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString() // 5分钟前
    },
    {
      id: 'mock-friend-request-2',
      type: 'friendRequest',
      title: '好友请求',
      message: '用户 Bob 想添加你为好友',
      fromUserId: 1002,
      fromUsername: 'Bob',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString() // 30分钟前
    },
    // Mock 数据 - 新消息
    {
      id: 'mock-new-message-1',
      type: 'newMessage',
      title: '新消息',
      message: 'Charlie 在 群聊 (5人) 中发送了消息',
      user: 'Charlie',
      fromUserId: 1003,
      roomId: 2001,
      roomName: '群聊 (5人)',
      content: '大家好，今天天气真不错！',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString() // 10分钟前
    },
    // Mock 数据 - 好友申请通过
    {
      id: 'mock-friend-accepted-1',
      type: 'friendAccepted',
      title: '好友请求通过',
      message: 'David 接受了您的好友请求',
      fromUserId: 1004,
      fromUsername: 'David',
      timestamp: new Date(Date.now() - 2 * 3600000).toISOString() // 2小时前
    }
  ])

  const userStore = useUserStore()
  const currentUserId = computed(() => userStore.user?.id)
  const socket = ref(null)

  const filteredFriends = computed(() => {
    const keyword = sidebarFilter.value.trim().toLowerCase()
    if (!keyword) return friends.value
    return friends.value.filter(friend => friend.username?.toLowerCase().includes(keyword))
  })

  const filteredChatRooms = computed(() => {
    const keyword = sidebarFilter.value.trim().toLowerCase()
    if (!keyword) return chatRooms.value
    return chatRooms.value.filter(room => getRoomName(room).toLowerCase().includes(keyword))
  })

  const friendIdSet = computed(() => new Set(friends.value.map(f => Number(f.id))))

  // 监听可见性变化，重新初始化拖拽
  watch(isVisible, (newVal) => {
    if (newVal) {
      nextTick(() => {
        initDraggable()
      })
    } else {
      // 窗口隐藏时销毁拖拽实例
      if (draggableInstance.value) {
        draggableInstance.value.kill()
        draggableInstance.value = null
      }
    }
  })

  // 初始化 Socket
  onMounted(async () => {
    if (userStore.isLoggedIn) {
      socket.value = initSocket()
      setupSocketListeners()
      await loadChatRooms()
      await loadFriends()
    }
    // 初始化GSAP拖拽
    if (isVisible.value) {
      nextTick(() => {
        initDraggable()
      })
    }
  })

  onUnmounted(() => {
    if (socket.value) {
      socket.value.off('chatMessage')
    }
    // 销毁拖拽实例
    if (draggableInstance.value) {
      draggableInstance.value.kill()
      draggableInstance.value = null
    }
  })

  // 设置 Socket 监听器
  function setupSocketListeners () {
    if (!socket.value) return

    socket.value.on('chatMessage', (data) => {
      // 确保 roomId 类型一致（都转为数字或字符串）
      const receivedRoomId = Number(data.roomId)
      const currentRoomId = Number(activeRoomId.value)

      if (receivedRoomId === currentRoomId) {
        // 检查是否是自己发送的消息（避免重复显示）
        const isOwnMessage = data.userId === currentUserId.value
        if (!isOwnMessage) {
          // 只添加其他人发送的消息（自己的消息已经在发送时添加了）
          messages.value.push({
            id: Date.now(),
            user_id: data.userId,
            username: data.user,
            content: data.content,
            created_at: data.time || new Date().toISOString()
          })
          scrollToBottom()
        } else {
          // 如果是自己的消息，更新最后一条临时消息的ID
          const lastMsg = messages.value[messages.value.length - 1]
          if (lastMsg && lastMsg.user_id === currentUserId.value && lastMsg.content === data.content) {
            lastMsg.id = Date.now() // 更新为服务器返回的ID
          }
        }
      }
      // 更新房间的最后一条消息
      updateRoomLastMessage(receivedRoomId, data.content, data.user)
    })

    // 监听好友请求通知
    socket.value.on('friendRequest', (data) => {
      addNotification({
        id: Date.now(),
        type: 'friendRequest',
        title: '好友请求',
        message: `${data.fromUser || data.fromUsername} 向您发送了好友请求`,
        user: data.fromUser || data.fromUsername,
        fromUserId: data.fromUserId,
        fromUsername: data.fromUser || data.fromUsername,
        timestamp: new Date().toISOString()
      })
    })

    // 监听好友请求接受通知
    socket.value.on('friendRequestAccepted', (data) => {
      addNotification({
        id: Date.now(),
        type: 'friendAccepted',
        title: '好友请求通过',
        message: `${data.fromUser || data.fromUsername} 接受了您的好友请求`,
        user: data.fromUser || data.fromUsername,
        fromUserId: data.fromUserId,
        fromUsername: data.fromUser || data.fromUsername,
        timestamp: new Date().toISOString()
      })
      // 重新加载好友列表和聊天房间列表
      Promise.all([
        loadFriends(),
        loadChatRooms()
      ])
    })

    // 监听新消息通知（当前不在聊天中的消息）
    socket.value.on('newMessageNotification', (data) => {
      // 如果不是当前活跃的聊天室，才显示通知
      if (Number(data.roomId) !== Number(activeRoomId.value)) {
        const roomName = getRoomNameById(data.roomId) || `聊天 ${data.roomId}`
        addNotification({
          id: Date.now(),
          type: 'newMessage',
          title: '新消息',
          message: `${data.fromUser} 在 ${roomName} 中发送了消息`,
          user: data.fromUser,
          fromUserId: data.userId,
          roomId: data.roomId,
          roomName: roomName,
          content: data.content,
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  // 加载聊天房间列表
  async function loadChatRooms () {
    loadingRooms.value = true
    try {
      const res = await getRoomList()
      if (res.success) {
        chatRooms.value = res.data || []
      }
    } catch (error) {
      ElMessage.error('加载聊天列表失败')
    } finally {
      loadingRooms.value = false
    }
  }

  // 加载好友列表
  async function loadFriends () {
    loadingFriends.value = true
    try {
      const res = await getFriendList()
      if (res.success) {
        friends.value = res.data || []
      }
    } catch (error) {
      console.error('加载好友列表失败', error)
    } finally {
      loadingFriends.value = false
    }
  }

  function findDirectRoom (friendId) {
    return chatRooms.value.find(
      room => !room.is_group && room.members && room.members.some(m => m.id === friendId)
    )
  }

  function isFriendActive (friendId) {
    const room = findDirectRoom(friendId)
    return room ? Number(activeRoomId.value) === Number(room.id) : false
  }

  async function openFriendChat (friend) {
    const existingRoom = findDirectRoom(friend.id)
    if (existingRoom) {
      await selectRoom(existingRoom)
      return
    }
    startingChatWithFriend.value = friend.id
    try {
      const res = await createRoom({
        memberIds: [friend.id],
        name: null
      })
      if (res.success) {
        const roomId = res.data.roomId
        await loadChatRooms()
        const newRoom = chatRooms.value.find(r => Number(r.id) === Number(roomId))
        if (newRoom) {
          await selectRoom(newRoom)
        }
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建聊天失败')
    } finally {
      startingChatWithFriend.value = null
    }
  }

  // 选择房间
  async function selectRoom (room) {
    activeRoomId.value = room.id
    currentView.value = 'chat'
    await loadMessages(room.id)

    // 加入 Socket 房间
    if (socket.value) {
      socket.value.emit('joinRoom', room.id.toString())
    }
  }

  async function handleSelectRoom (room) {
    await selectRoom(room)
  }

  // 加载消息
  async function loadMessages (roomId) {
    loadingMessages.value = true
    try {
      const res = await getChatHistory({ roomId, page: 1, pageSize: 50 })
      if (res.success) {
        messages.value = res.data || []
        await nextTick()
        scrollToBottom()
      }
    } catch (error) {
      ElMessage.error('加载消息失败')
    } finally {
      loadingMessages.value = false
    }
  }

  // 发送消息
  async function sendMessage (content) {
    if (!content || !content.trim() || !activeRoomId.value || sendingMessage.value) return

    const messageContent = content.trim()
    const tempId = Date.now()
    
    // 立即显示消息（乐观更新）
    messages.value.push({
      id: tempId,
      user_id: currentUserId.value,
      username: userStore.username,
      content: messageContent,
      created_at: new Date().toISOString()
    })
    scrollToBottom()

    sendingMessage.value = true
    try {
      if (socket.value) {
        socket.value.emit('chatMessage', {
          roomId: activeRoomId.value.toString(),
          content: messageContent
        })
        // 消息会通过 socket 监听器更新（替换临时消息）
      } else {
        ElMessage.warning('连接已断开，请刷新页面')
        // 移除临时消息
        const index = messages.value.findIndex(m => m.id === tempId)
        if (index > -1) messages.value.splice(index, 1)
      }
    } catch (error) {
      ElMessage.error('发送消息失败')
      // 移除临时消息
      const index = messages.value.findIndex(m => m.id === tempId)
      if (index > -1) messages.value.splice(index, 1)
    } finally {
      sendingMessage.value = false
    }
  }

  // 处理来自 MessageList 组件的发送消息事件
  function handleSendMessage (content) {
    sendMessage(content)
  }

  // 创建新聊天
  async function handleCreateChat () {
    if (!searchUsername.value.trim()) {
      ElMessage.warning('请输入用户名')
      return
    }

    creatingChat.value = true
    try {
      // 先查找用户ID
      const friend = friends.value.find(f => f.username === searchUsername.value.trim())
      if (!friend) {
        ElMessage.error('用户不存在或不是您的好友')
        return
      }

      const res = await createRoom({
        memberIds: [friend.id],
        name: null // 私聊不需要名称
      })

      if (res.success) {
        const roomId = res.data.roomId
        await loadChatRooms()
        // 选择新创建的房间
        const newRoom = chatRooms.value.find(r => r.id === roomId)
        if (newRoom) {
          await selectRoom(newRoom)
        }
        searchUsername.value = ''
        currentView.value = 'chat'
        ElMessage.success('聊天已创建')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建聊天失败')
    } finally {
      creatingChat.value = false
    }
  }

  function openAddFriendView () {
    searchUserKeyword.value = ''
    searchResults.value = []
    searchingUsers.value = false
    switchView('addFriend')
  }

  async function performUserSearch () {
    if (!searchUserKeyword.value.trim()) {
      ElMessage.warning('请输入用户名')
      return
    }
    searchingUsers.value = true
    try {
      const res = await searchUsers(searchUserKeyword.value.trim())
      if (res.success) {
        searchResults.value = res.data || []
      } else {
        searchResults.value = []
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '搜索用户失败')
      searchResults.value = []
    } finally {
      searchingUsers.value = false
    }
  }

  function isAlreadyFriend (userId) {
    return friendIdSet.value.has(Number(userId))
  }

  function isSelf (userId) {
    return Number(userId) === Number(currentUserId.value)
  }

  function isAddingFriend (userId) {
    return addingFriendIds.value.has(Number(userId))
  }

  async function handleAddFriendFromSearch (user) {
    if (isAlreadyFriend(user.id) || isSelf(user.id) || isAddingFriend(user.id)) return
    const loadingSet = new Set(addingFriendIds.value)
    loadingSet.add(Number(user.id))
    addingFriendIds.value = loadingSet
    try {
      const res = await addFriend({ friendId: user.id })
      if (res.success) {
        ElMessage.success('好友请求已发送')

        // 通过 Socket 向对方发送实时好友请求通知
        if (socket.value) {
          socket.value.emit('sendFriendRequest', {
            toUserId: user.id,
            fromUser: userStore.username,
            fromUserId: currentUserId.value
          })
        }

        await loadFriends()
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '添加好友失败')
    } finally {
      const updatedSet = new Set(addingFriendIds.value)
      updatedSet.delete(Number(user.id))
      addingFriendIds.value = updatedSet
    }
  }

  function openCreateGroupDialog () {
    createGroupDialogVisible.value = true
    groupName.value = ''
    selectedGroupMembers.value = []
  }

  async function submitCreateGroup () {
    if (!groupName.value.trim()) {
      ElMessage.warning('请输入群聊名称')
      return
    }
    if (!selectedGroupMembers.value.length) {
      ElMessage.warning('请选择至少一位好友')
      return
    }
    creatingGroup.value = true
    try {
      const res = await createRoom({
        memberIds: selectedGroupMembers.value,
        name: groupName.value.trim()
      })
      if (res.success) {
        const roomId = res.data.roomId
        await loadChatRooms()
        const newRoom = chatRooms.value.find(r => Number(r.id) === Number(roomId))
        if (newRoom) {
          await selectRoom(newRoom)
        }
        createGroupDialogVisible.value = false
        groupName.value = ''
        selectedGroupMembers.value = []
        ElMessage.success('群聊已创建')
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建群聊失败')
    } finally {
      creatingGroup.value = false
    }
  }

  // 切换视图
  function switchView (view) {
    currentView.value = view
    if (view === 'create' || view === 'addFriend') {
      activeRoomId.value = null
    }
    if (view !== 'addFriend') {
      searchUserKeyword.value = ''
      searchResults.value = []
      searchingUsers.value = false
    }
  }

  // 窗口控制
  function closeWindow () {
    isVisible.value = false
    emit('close')
  }

  // GSAP拖拽功能
  function initDraggable () {
    if (!chatWindowRef.value) return
    
    // 如果已经存在拖拽实例，先销毁
    if (draggableInstance.value) {
      draggableInstance.value.kill()
      draggableInstance.value = null
    }
    
    // 确保窗口有初始位置
    const windowEl = chatWindowRef.value
    
    // 确保窗口使用 fixed 定位
    gsap.set(windowEl, {
      position: 'fixed'
    })
    
    // 获取窗口尺寸
    const rect = windowEl.getBoundingClientRect()
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // 如果窗口还没有定位，设置初始位置（右下角）
    const hasLeft = windowEl.style.left && windowEl.style.left !== 'auto'
    const hasTop = windowEl.style.top && windowEl.style.top !== 'auto'
    const hasRight = windowEl.style.right && windowEl.style.right !== 'auto'
    const hasBottom = windowEl.style.bottom && windowEl.style.bottom !== 'auto'
    
    if (!hasLeft && !hasTop) {
      // 如果没有设置位置，使用右下角作为初始位置
      if (hasRight && hasBottom) {
        // 如果使用right/bottom定位，转换为left/top
        const currentRight = parseFloat(windowEl.style.right) || 20
        const currentBottom = parseFloat(windowEl.style.bottom) || 20
        const left = windowWidth - rect.width - currentRight
        const top = windowHeight - rect.height - currentBottom
        gsap.set(windowEl, {
          left: `${left}px`,
          top: `${top}px`,
          right: 'auto',
          bottom: 'auto'
        })
      } else {
        // 设置初始位置为右下角
        const right = 20
        const bottom = 20
        const left = windowWidth - rect.width - right
        const top = windowHeight - rect.height - bottom
        gsap.set(windowEl, {
          left: `${left}px`,
          top: `${top}px`,
          right: 'auto',
          bottom: 'auto'
        })
      }
    } else {
      // 如果已经有位置，确保使用 left/top
      if (hasRight || hasBottom) {
        const currentLeft = hasLeft ? parseFloat(windowEl.style.left) : (windowWidth - rect.width - 20)
        const currentTop = hasTop ? parseFloat(windowEl.style.top) : (windowHeight - rect.height - 20)
        gsap.set(windowEl, {
          left: `${currentLeft}px`,
          top: `${currentTop}px`,
          right: 'auto',
          bottom: 'auto'
        })
      }
    }
    
    // 创建拖拽实例
    draggableInstance.value = Draggable.create(windowEl, {
      type: 'x,y',
      handle: '.chat-header',
      inertia: false, // 禁用惯性，减少延迟
      throwProps: false, // 禁用抛出属性
      liveSnap: false, // 禁用实时捕捉
      dragClickables: false, // 禁用可点击元素的拖拽
      allowContextMenu: false, // 禁用右键菜单
      force3D: false, // 禁用 3D transform
      onDragStart: function () {
        // 添加拖拽时的样式，提升视觉反馈
        windowEl.style.transition = 'none'
        windowEl.style.cursor = 'move'
      },
      onDragEnd: function () {
        // 恢复过渡效果
        windowEl.style.transition = ''
        windowEl.style.cursor = ''
      },
      onDrag: function () {
      }
    })[0]
  }


  // 工具函数
  function getRoomName (room) {
    if (room.name) return room.name
    // 私聊：显示对方用户名
    if (!room.is_group && room.members && room.members.length > 0) {
      return room.members[0].username || `用户 ${room.id}`
    }
    // 群聊：显示成员数量
    if (room.is_group && room.members) {
      return `群聊 (${room.members.length + 1}人)`
    }
    return `聊天 ${room.id}`
  }

  function getRoomAvatar (room) {
    // 私聊：显示对方头像
    if (!room.is_group && room.members && room.members.length > 0) {
      return room.members[0].avatar_url || null
    }
    return null
  }

  function getCurrentRoomName () {
    const room = chatRooms.value.find(r => r.id === activeRoomId.value)
    return room ? getRoomName(room) : ''
  }

  function getCurrentRoomAvatar () {
    const room = chatRooms.value.find(r => r.id === activeRoomId.value)
    return room ? getRoomAvatar(room) : null
  }

  function getUserAvatar (userId) {
    // 从当前房间的成员中查找头像
    if (activeRoomId.value) {
      const room = chatRooms.value.find(r => r.id === activeRoomId.value)
      if (room && room.members) {
        const member = room.members.find(m => m.id === userId)
        if (member) return member.avatar_url || null
      }
    }
    // 从好友列表中查找
    const friend = friends.value.find(f => f.id === userId)
    if (friend && friend.avatar_url) return friend.avatar_url
    return null
  }

  function updateRoomLastMessage (roomId, content, username) {
    const room = chatRooms.value.find(r => Number(r.id) === Number(roomId))
    if (room) {
      room.lastMessage = {
        content,
        username,
        created_at: new Date().toISOString()
      }
    }
  }

  function scrollToBottom () {
    if (messagesContainer.value) {
      nextTick(() => {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      })
    }
  }

  function formatTime (timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
  
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
    return date.toLocaleDateString('zh-CN')
  }

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

  // 消息通知相关函数
  function addNotification (notification) {
    notifications.value.unshift(notification)
  }

  function removeNotification (id) {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  function closeNotification (id) {
    removeNotification(id)
  }

  function handleNotificationUpdate (data) {
    if (data.action === 'add') {
      // 检查是否已存在相同的通知，避免重复
      const existingIndex = notifications.value.findIndex(n =>
        n.type === data.notification.type &&
        n.fromUserId === data.notification.fromUserId &&
        n.type === 'friendRequest'
      )

      if (existingIndex === -1) {
        notifications.value.unshift(data.notification)
      }
    } else if (data.action === 'remove') {
      removeNotification(data.notificationId)
    }
  }

  async function handleFriendRequestHandled (data) {
    console.log('好友申请已处理:', data)
    if (data.action === 'accept') {
      // 接受好友申请后，刷新好友列表和聊天房间列表
      await Promise.all([
        loadFriends(),
        loadChatRooms()
      ])
      
      // 通过 Socket 通知对方好友申请已接受
      if (socket.value && data.fromUserId) {
        socket.value.emit('friendRequestAccepted', {
          toUserId: data.fromUserId,
          fromUser: userStore.username,
          fromUserId: currentUserId.value
        })
      }
      
      ElMessage.success('好友申请已接受')
    } else if (data.action === 'reject') {
      ElMessage.info('好友申请已拒绝')
    }
  }

  function getRoomNameById (roomId) {
    const room = chatRooms.value.find(r => Number(r.id) === Number(roomId))
    return room ? getRoomName(room) : null
  }

  // 处理点击新消息通知，跳转到对应聊天室
  async function handleNavigateToRoom (data) {
    const { roomId, notificationId } = data
    // 关闭该通知
    if (notificationId) {
      closeNotification(notificationId)
    }
    // 查找对应的聊天室
    const room = chatRooms.value.find(r => Number(r.id) === Number(roomId))
    if (room) {
      await selectRoom(room)
      // 切换到聊天视图
      currentView.value = 'chat'
    } else {
      // 如果找不到房间，重新加载房间列表后再尝试
      await loadChatRooms()
      const updatedRoom = chatRooms.value.find(r => Number(r.id) === Number(roomId))
      if (updatedRoom) {
        await selectRoom(updatedRoom)
        currentView.value = 'chat'
      } else {
        ElMessage.warning('聊天室不存在或已被删除')
      }
    }
  }
</script>

<style scoped>
.chat-window-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  pointer-events: none;
}

.chat-window {
  width: 880px;
  max-width: 95vw;
  height: 640px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  position: fixed;
  pointer-events: all;
  transition: all 0.3s ease;
}

.chat-window.maximized {
  width: 90vw;
  height: 90vh;
  border-radius: 8px;
}

.chat-header {
  height: 48px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: move;
  user-select: none;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reddit-logo {
  display: flex;
  align-items: center;
  color: #FF4500;
  width: 20px;
  height: 20px;
}

.chat-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.chat-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  padding: 4px;
  border-radius: 4px;
}

.header-icon:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.header-icon.window-control {
  margin-left: 4px;
}

.close-icon:hover {
  color: #fff;
  background: #dc3545;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background: var(--bg-secondary);
}

.chat-sidebar {
  width: 320px;
  min-width: 280px;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.chat-sidebar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.chat-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.chat-main-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
  text-align: center;
  padding: 24px;
}

.add-friend-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.add-friend-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-friend-title {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.add-friend-subtitle {
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 4px;
}

.add-friend-search {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-btn {
  flex-shrink: 0;
}

.add-friend-results {
  flex: 1;
  overflow-y: auto;
}

.search-results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.search-result-item:hover {
  background: var(--bg-hover);
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-name {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.result-bio {
  color: var(--text-secondary);
  font-size: 12px;
}

.result-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #343536);
  background: var(--bg-tertiary);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-weight: 600;
}

.sidebar-title-icon {
  font-size: 18px;
  color: var(--primary-color, #ff4500);
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.dropdown-trigger:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.dropdown-text {
  margin-left: 8px;
}

.sidebar-search {
  padding:  16px 12px;
  border-bottom: 1px solid var(--border-color);
}

.list-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-collapse {
  flex: 1;
  border: none;
  background: transparent;
}

.sidebar-collapse :deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  padding: 12px 16px;
  margin: 0;
  height: auto;
  line-height: normal;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
  color: var(--text-primary);
}

.sidebar-collapse :deep(.el-collapse-item__header):hover {
  background: var(--bg-hover);
}

.sidebar-collapse :deep(.el-collapse-item__header .el-collapse-item__arrow) {
  color: var(--text-secondary);
  transition: transform 0.3s, color 0.2s;
}

.sidebar-collapse :deep(.el-collapse-item__header:hover .el-collapse-item__arrow) {
  color: var(--text-primary);
}

.sidebar-collapse :deep(.el-collapse-item__wrap) {
  background: var(--bg-secondary);
  border: none;
}

.sidebar-collapse :deep(.el-collapse-item__content) {
  padding: 0;
  border: none;
}

.collapse-item {
  margin-bottom: 12px;
}

.collapse-item:last-child {
  margin-bottom: 0;
}

.list-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  color: var(--text-primary);
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
}

.friend-list {
  flex: 1;
  overflow-y: auto;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border-color);
}

.friend-item:hover,
.friend-item.active {
  background: var(--bg-hover);
}

.inline-loading {
  font-size: 16px;
  color: var(--text-secondary);
}

.empty-chat-list.compact {
  padding: 24px 16px;
}

.group-form :deep(.el-form-item__label) {
  color: var(--text-primary);
}

/* 创建聊天视图 */
.create-chat-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.create-chat-content {
  width: 100%;
  max-width: 320px;
}

.username-input {
  margin-bottom: 16px;
}

.create-chat-hint {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}

.create-chat-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
}

.empty-chat-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  text-align: center;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.reddit-snoos {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-chat-list h3 {
  color: var(--text-primary);
  font-size: 18px;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-chat-list p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}

.start-chat-btn {
  background: #0079d3;
  border-color: #0079d3;
}

.start-chat-btn:hover {
  background: #005ba1;
  border-color: #005ba1;
}

.chat-rooms-list {
  flex: 1;
  overflow-y: auto;
}

.chat-room-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid var(--border-color);
}

.chat-room-item:hover {
  background: var(--bg-hover);
}

.chat-room-item.active {
  background: var(--bg-hover);
}

.room-avatar {
  flex-shrink: 0;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-preview {
  color: var(--text-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.room-time {
  color: var(--text-secondary);
  font-size: 12px;
}

/* 聊天消息视图 */
.chat-messages-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.messages-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.messages-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.messages-room-name {
  color: var(--text-primary);
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

.empty-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-messages p {
  color: var(--text-secondary);
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
  background: var(--bg-hover);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-item.own-message .message-content {
  background: var(--btn-orange);
  color: #fff;
}

.message-time {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 0 4px;
}

.message-input-container {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
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
.chat-sidebar-body::-webkit-scrollbar,
.list-view::-webkit-scrollbar,
.chat-rooms-list::-webkit-scrollbar,
.messages-container::-webkit-scrollbar {
  width: 8px;
}

.chat-sidebar-body::-webkit-scrollbar-track,
.list-view::-webkit-scrollbar-track,
.chat-rooms-list::-webkit-scrollbar-track,
.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.chat-sidebar-body::-webkit-scrollbar-thumb,
.list-view::-webkit-scrollbar-thumb,
.chat-rooms-list::-webkit-scrollbar-thumb,
.messages-container::-webkit-scrollbar-thumb {
  background: var(--border-color, #343536);
  border-radius: 4px;
}

.chat-sidebar-body::-webkit-scrollbar-thumb:hover,
.list-view::-webkit-scrollbar-thumb:hover,
.chat-rooms-list::-webkit-scrollbar-thumb:hover,
.messages-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-window {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
    right: 0;
    bottom: 0;
  }

  .chat-window.maximized {
    width: 100vw;
    height: 100vh;
  }
}
</style>
