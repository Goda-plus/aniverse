<template>
  <div class="recent-chats-section">
    <el-collapse-item name="rooms" class="collapse-item">
      <template #title>
        <div class="section-header">
          <span>最近会话</span>
          <el-button size="small" text @click.stop="switchView('create')">
            新聊天
          </el-button>
        </div>
      </template>
      <div v-if="loadingRooms" class="loading-container">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="filteredChatRooms.length === 0" class="empty-chat-list compact">
        <h3>欢迎聊天！</h3>
        <p>与其他用户开始直接聊天或群组聊天。</p>
        <el-button type="primary" class="start-chat-btn" @click.stop="switchView('create')">
          <el-icon><Plus /></el-icon>
          开始新聊天
        </el-button>
      </div>
      <div v-else class="chat-rooms-list">
        <div
          v-for="room in filteredChatRooms"
          :key="room.id"
          class="chat-room-item"
          :class="{ 'active': activeRoomId === room.id }"
          @click="selectRoom(room)"
        >
          <el-avatar
            :size="40"
            :src="getRoomAvatar(room)"
            class="room-avatar"
          >
            {{ getRoomName(room).charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="room-info">
            <div class="room-name">
              {{ getRoomName(room) }}
            </div>
            <div v-if="room.lastMessage" class="room-preview">
              {{ room.lastMessage.content }}
            </div>
          </div>
          <div class="room-meta">
            <span v-if="room.lastMessage" class="room-time">
              {{ formatTime(room.lastMessage.created_at) }}
            </span>
          </div>
        </div>
      </div>
    </el-collapse-item>
  </div>
</template>

<script setup>
  import { computed , defineProps, defineEmits} from 'vue'
  import { Loading, Plus } from '@element-plus/icons-vue'

  // Props
  const props = defineProps({
    chatRooms: {
      type: Array,
      default: () => []
    },
    sidebarFilter: {
      type: String,
      default: ''
    },
    loadingRooms: {
      type: Boolean,
      default: false
    },
    activeRoomId: {
      type: Number,
      default: null
    }
  })

  // Emits
  const emit = defineEmits(['switchView', 'selectRoom'])

  // Computed
  const filteredChatRooms = computed(() => {
    const keyword = props.sidebarFilter.trim().toLowerCase()
    if (!keyword) return props.chatRooms
    return props.chatRooms.filter(room => getRoomName(room).toLowerCase().includes(keyword))
  })

  // Methods
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

  function switchView (view) {
    emit('switchView', view)
  }

  function selectRoom (room) {
    emit('selectRoom', room)
  }
</script>

<style scoped>
.recent-chats-section {
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
  border-bottom: 1px solid var(--border-color, #343536);
}

.chat-room-item:hover {
  background: var(--hover-bg, #272729);
}

.chat-room-item.active {
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

.room-meta {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.room-time {
  color: var(--text-color-secondary, #818384);
  font-size: 12px;
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

.start-chat-btn {
  background: #0079d3;
  border-color: #0079d3;
}

.start-chat-btn:hover {
  background: #005ba1;
  border-color: #005ba1;
}
</style>


