<template>
  <el-dialog
    v-model="visibleProxy"
    title="管理成员"
    width="800px"
    append-to-body
    @close="handleClose"
  >
    <div v-if="membersLoading" class="loading-container">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      <span>加载中...</span>
    </div>
    <div v-else-if="members.length === 0" class="empty-members">
      <el-empty description="暂无成员" />
    </div>
    <div v-else class="members-list">
      <div
        v-for="member in members"
        :key="member.id"
        class="member-item"
      >
        <div class="member-info">
          <div class="member-avatar">
            <img
              v-if="member.avatar_url"
              :src="member.avatar_url"
              alt="用户头像"
            >
            <div v-else class="avatar-placeholder">
              {{ member.username?.charAt(0).toUpperCase() || 'U' }}
            </div>
          </div>
          <div class="member-details">
            <div class="member-name-row">
              <span class="member-name">{{ member.username }}</span>
              <el-tag
                :type="getRoleTagType(member.role)"
                size="small"
                effect="plain"
              >
                {{ getRoleName(member.role) }}
              </el-tag>
            </div>
            <div v-if="member.joined_at" class="member-joined">
              加入时间：{{ formatDate(member.joined_at) }}
            </div>
          </div>
        </div>
        <div class="member-actions">
          <el-select
            v-model="member.role"
            size="small"
            style="width: 120px"
            :disabled="member.is_creator"
            @change="handleRoleChange(member)"
          >
            <el-option label="管理员" value="admin" />
            <el-option label="版主" value="moderator" />
            <el-option label="成员" value="member" />
          </el-select>
          <el-button
            type="danger"
            size="small"
            :disabled="member.is_creator"
            @click="handleRemoveMember(member)"
          >
            <el-icon><Delete /></el-icon>
            踢除
          </el-button>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="visibleProxy = false">
        关闭
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { computed, defineEmits, defineProps, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Delete, Loading } from '@element-plus/icons-vue'
  import { getMembersBySubreddit, updateMemberRole, removeMember } from '@/axios/subredditMember'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    subredditId: { type: [Number, String], default: null },
  })

  const emit = defineEmits(['update:modelValue'])

  const visibleProxy = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val),
  })

  const members = ref([])
  const membersLoading = ref(false)

  const fetchMembers = async () => {
    if (!props.subredditId) return
    membersLoading.value = true
    try {
      const response = await getMembersBySubreddit({ subreddit_id: props.subredditId })
      if (response.success) {
        members.value = response.data || []
      } else {
        ElMessage.error(response.message || '获取成员列表失败')
      }
    } catch (error) {
      console.error('获取成员列表失败:', error)
      ElMessage.error(error.response?.data?.message || '获取成员列表失败')
    } finally {
      membersLoading.value = false
    }
  }

  watch(
    () => props.modelValue,
    async (val) => {
      if (val) await fetchMembers()
    }
  )

  watch(
    () => props.subredditId,
    async () => {
      if (props.modelValue) await fetchMembers()
    }
  )

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60))
        return `${minutes}分钟前`
      }
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const getRoleName = (role) => {
    const roleMap = { admin: '管理员', moderator: '版主', member: '成员' }
    return roleMap[role] || '成员'
  }

  const getRoleTagType = (role) => {
    const typeMap = { admin: 'danger', moderator: 'warning', member: 'info' }
    return typeMap[role] || 'info'
  }

  const handleRoleChange = async (member) => {
    try {
      const response = await updateMemberRole({
        subreddit_id: props.subredditId,
        user_id: member.user_id,
        role: member.role,
      })
      if (response.success) {
        ElMessage.success('角色更新成功')
        await fetchMembers()
      } else {
        ElMessage.error(response.message || '角色更新失败')
        await fetchMembers()
      }
    } catch (error) {
      console.error('更新角色失败:', error)
      ElMessage.error(error.response?.data?.message || '更新角色失败')
      await fetchMembers()
    }
  }

  const handleRemoveMember = async (member) => {
    try {
      await ElMessageBox.confirm(
        `确定要移除成员 "${member.username}" 吗？`,
        '移除确认',
        {
          confirmButtonText: '确定移除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )
      const response = await removeMember({
        subreddit_id: props.subredditId,
        user_id: member.user_id,
      })
      if (response.success) {
        ElMessage.success('移除成员成功')
        await fetchMembers()
      } else {
        ElMessage.error(response.message || '移除成员失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('移除成员失败:', error)
        ElMessage.error(error.response?.data?.message || '移除成员失败')
      }
    }
  }

  const handleClose = () => {
    members.value = []
  }
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 12px;
  color: var(--text-secondary);
}

.loading-container .el-icon {
  font-size: 32px;
}

.empty-members {
  padding: 40px 0;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  transition: all 0.3s;
}

.member-item:hover {
  border-color: var(--primary, #0079d3);
  box-shadow: 0 2px 8px rgba(0, 121, 211, 0.1);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-avatar .avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.member-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.member-joined {
  font-size: 12px;
  color: var(--text-tertiary);
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .member-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .member-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

