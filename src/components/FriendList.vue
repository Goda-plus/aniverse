<template>
  <div class="friend-list-section">
    <el-collapse-item name="friends" class="collapse-item">
      <template #title>
        <div class="section-header">
          <span>好友</span>
          <el-button size="small" text @click.stop="openAddFriendView">
            添加
          </el-button>
        </div>
      </template>
      <div v-if="loadingFriends" class="loading-container">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载好友中...</span>
      </div>
      <div v-else-if="filteredFriends.length === 0" class="empty-chat-list compact">
        <h3>还没有好友</h3>
        <p>通过右上角下拉菜单添加好友。</p>
      </div>
      <div v-else class="friend-list">
        <div
          v-for="friend in filteredFriends"
          :key="friend.id"
          class="friend-item"
          :class="{ active: isFriendActive(friend.id) }"
          @click="openFriendChat(friend)"
        >
          <el-avatar
            :size="40"
            :src="friend.avatar_url"
            class="room-avatar"
          >
            {{ friend.username?.charAt(0)?.toUpperCase() || 'U' }}
          </el-avatar>
          <div class="room-info">
            <div class="room-name">
              {{ friend.username }}
            </div>
            <div class="room-preview">
              点击开始聊天
            </div>
          </div>
          <el-icon
            v-if="startingChatWithFriend === friend.id"
            class="inline-loading is-loading"
          >
            <Loading />
          </el-icon>
        </div>
      </div>
    </el-collapse-item>
  </div>
</template>

<script setup>
  import { ref, computed, defineProps, defineEmits } from 'vue'
  import { Loading } from '@element-plus/icons-vue'
  import { getRoomList, createRoom } from '@/axios/chat'
  import { ElMessage } from 'element-plus'

  // Props
  const props = defineProps({
    friends: {
      type: Array,
      default: () => []
    },
    sidebarFilter: {
      type: String,
      default: ''
    },
    loadingFriends: {
      type: Boolean,
      default: false
    },
    activeRoomId: {
      type: Number,
      default: null
    },
    chatRooms: {
      type: Array,
      default: () => []
    },
    startingChatWithFriend: {
      type: Number,
      default: null
    }
  })

  // Emits
  const emit = defineEmits(['openAddFriendView', 'selectRoom', 'loadChatRooms', 'friendChatOpened'])

  // Computed
  const filteredFriends = computed(() => {
    const keyword = props.sidebarFilter.trim().toLowerCase()
    if (!keyword) return props.friends
    return props.friends.filter(friend => friend.username?.toLowerCase().includes(keyword))
  })

  // Methods
  function findDirectRoom (friendId) {
    return props.chatRooms.find(
      room => !room.is_group && room.members && room.members.some(m => m.id === friendId)
    )
  }

  function isFriendActive (friendId) {
    const room = findDirectRoom(friendId)
    return room ? Number(props.activeRoomId) === Number(room.id) : false
  }

  async function openFriendChat (friend) {
    const existingRoom = findDirectRoom(friend.id)
    if (existingRoom) {
      await selectRoom(existingRoom)
      return
    }

    emit('friendChatOpened', friend.id)

    try {
      const res = await createRoom({
        memberIds: [friend.id],
        name: null
      })
      if (res.success) {
        const roomId = res.data.roomId
        emit('loadChatRooms')
        const newRoom = props.chatRooms.find(r => Number(r.id) === Number(roomId))
        if (newRoom) {
          await selectRoom(newRoom)
        }
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || '创建聊天失败')
    } finally {
      emit('friendChatOpened', null)
    }
  }

  async function selectRoom (room) {
    emit('selectRoom', room)
  }

  function openAddFriendView () {
    emit('openAddFriendView')
  }
</script>

<style scoped>
.friend-list-section {
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
  border-bottom: 1px solid var(--border-color, #343536);
}

.friend-item:hover,
.friend-item.active {
  background: var(--hover-bg, #272729);
}

.room-avatar {
  flex-shrink: 0;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-name {
  color: var(--text-color, #d7dadc);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-preview {
  color: var(--text-color-secondary, #818384);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-loading {
  font-size: 16px;
  color: var(--text-color-secondary, #818384);
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-color-secondary, #818384);
  padding: 24px 16px;
}

.empty-chat-list.compact {
  padding: 24px 16px;
}

.empty-chat-list h3 {
  color: var(--text-color, #d7dadc);
  font-size: 18px;
  margin-bottom: 8px;
  font-weight: 500;
}

.empty-chat-list p {
  color: var(--text-color-secondary, #818384);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.5;
}
</style>


