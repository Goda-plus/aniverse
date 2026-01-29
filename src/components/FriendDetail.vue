<template>
  <div class="friend-detail-view">
    <div v-if="friend" class="friend-detail-card">
      <div class="friend-detail-header">
        <el-avatar
          :size="72"
          :src="friend.avatar_url"
          class="friend-detail-avatar"
        >
          {{ friend.username?.charAt(0)?.toUpperCase() || 'U' }}
        </el-avatar>
        <div class="friend-detail-main">
          <div class="friend-detail-name">
            {{ friend.username }}
          </div>
          <div class="friend-detail-sub">
            ID：{{ friend.username }}
          </div>
        </div>
        <el-dropdown trigger="click" placement="bottom-end" style="position: absolute; right: 10px;">
          <el-button color="var(--bg-secondary)" :loading="loading">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :disabled="loading" @click="handleSetRemark">
                <el-icon><Edit /></el-icon>
                <span>设置备注</span>
              </el-dropdown-item>
              <el-dropdown-item class="danger-item" :disabled="loading" @click="handleDeleteFriend">
                <el-icon><Delete /></el-icon>
                <span>删除联系人</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="friend-detail-section">
        <div class="friend-detail-label">
          备注
        </div>
        <div class="friend-detail-value">
          {{ friend.tip || friend.username }}
        </div>
      </div>

      <div class="friend-detail-section">
        <div class="friend-detail-label">
          个性签名
        </div>
        <div class="friend-detail-value is-muted">
          {{ friend.bio || '这个好友很神秘，还没有填写简介。' }}
        </div>
      </div>

      <div class="friend-detail-actions">
        <el-button
          type="primary"
          @click="handleOpenChat"
        >
          发消息
        </el-button>
        <el-button @click="emit('back')">
          返回聊天
        </el-button>
      </div>
    </div>
    <div v-else class="chat-main-empty">
      请选择左侧的好友查看详细资料
    </div>
  </div>
</template>

<script setup>
  import { defineProps, defineEmits, ref } from 'vue'
  import { MoreFilled, Edit, Delete } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { updateFriendRemark, deleteFriend } from '@/axios/friend'

  const props = defineProps({
    friend: {
      type: Object,
      default: null
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits(['open-chat', 'back', 'set-remark', 'friend-deleted'])

  // 加载状态
  const loading = ref(false)

  function handleOpenChat () {
    if (props.friend) {
      emit('open-chat', props.friend)
    }
  }

  async function handleSetRemark () {
    if (!props.friend) return

    try {
      const { value } = await ElMessageBox.prompt('请输入好友备注', '设置备注', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: props.friend.tip || '',
        inputPlaceholder: '不填写则显示用户名',
        inputValidator: (value) => {
          if (value && value.length > 20) {
            return '备注不能超过20个字符'
          }
          return true
        }
      })

      loading.value = true

      await updateFriendRemark({
        friendId: props.friend.id,
        remark: value?.trim() || ''
      })

      ElMessage.success('备注设置成功')
      emit('set-remark', { ...props.friend, tip: value?.trim() || '' })
    } catch (error) {
      if (error !== 'cancel') {
        console.error('设置备注失败:', error)
        ElMessage.error('设置备注失败，请重试')
      }
    } finally {
      loading.value = false
    }
  }

  async function handleDeleteFriend () {
    if (!props.friend) return

    try {
      await ElMessageBox.confirm(
        `确定要删除好友 "${props.friend.username}" 吗？删除后将无法恢复。`,
        '删除好友',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          confirmButtonClass: 'el-button--danger',
          type: 'warning'
        }
      )

      loading.value = true

      await deleteFriend({
        friendId: props.friend.id
      })

      ElMessage.success('好友删除成功')
      emit('friend-deleted', props.friend.id)
    } catch (error) {
      if (error !== 'cancel') {
        console.error('删除好友失败:', error)
        ElMessage.error('删除好友失败，请重试')
      }
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped>
.friend-detail-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.friend-detail-card {
  width: 100%;
  max-width: 420px;
  position: relative;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  padding: 24px 24px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.friend-detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.friend-detail-avatar {
  border-radius: 12px;
}

.friend-detail-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.friend-detail-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.friend-detail-sub {
  font-size: 13px;
  color: var(--text-secondary);
}

.friend-detail-section {
  padding: 10px 0;
  border-top: 1px solid var(--border-color);
}

.friend-detail-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.friend-detail-value {
  font-size: 14px;
  color: var(--text-primary);
}

.friend-detail-value.is-muted {
  color: var(--text-secondary);
}

.friend-detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
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

/* 下拉菜单样式 */
:deep(.el-dropdown-menu__item.danger-item) {
  color: #f56c6c;
}

:deep(.el-dropdown-menu__item.danger-item:hover) {
  background-color: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}
</style>


