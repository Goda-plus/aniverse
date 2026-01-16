<template>
  <div class="community-manage">
    <div class="community-header">
      <h3 class="section-title">
        我的社区
      </h3>
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        创建社区
      </el-button>
    </div>

    <!-- 社区列表 -->
    <div v-if="communities.length > 0" class="communities-list">
      <div
        v-for="community in communities"
        :key="community.id"
        class="community-item"
      >
        <div class="community-content">
          <div class="community-avatar">
            <img
              v-if="community.image_url"
              :src="community.image_url"
              alt="社区头像"
            >
            <div v-else class="avatar-placeholder">
              r/
            </div>
          </div>
          <div class="community-info">
            <div class="community-name-row">
              <h4 class="community-name" @click="handleViewCommunity(community)">
                r/{{ community.name }}
              </h4>
              <div class="community-badges">
                <el-tag
                  v-if="community.visibility === 'public'"
                  type="success"
                  size="small"
                  effect="plain"
                >
                  公开
                </el-tag>
                <el-tag
                  v-else-if="community.visibility === 'restricted'"
                  type="warning"
                  size="small"
                  effect="plain"
                >
                  受限
                </el-tag>
                <el-tag
                  v-else-if="community.visibility === 'private'"
                  type="info"
                  size="small"
                  effect="plain"
                >
                  私人
                </el-tag>
                <el-tag
                  v-if="community.is_adult"
                  type="danger"
                  size="small"
                  effect="plain"
                >
                  18+
                </el-tag>
              </div>
            </div>
            <p v-if="community.description" class="community-description">
              {{ community.description }}
            </p>
            <div class="community-meta">
              <span class="meta-item">
                <el-icon><FolderOpened /></el-icon>
                {{ community.category_name || '未分类' }}
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatDate(community.created_at) }}
              </span>
            </div>
          </div>
          <div class="community-actions">
            <el-button
              link
              type="primary"
              @click="handleViewCommunity(community)"
            >
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button
              link
              type="primary"
              @click="handleEdit(community)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              link
              type="primary"
              @click="handleManageMembers(community)"
            >
              <el-icon><User /></el-icon>
              管理成员
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(community)"
            >
              <el-icon><Delete /></el-icon>
              解散
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <el-empty description="您还没有创建任何社区">
        <el-button type="primary" @click="handleCreate">
          创建社区
        </el-button>
      </el-empty>
    </div>

    <!-- 编辑社区对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑社区"
      width="800px"
      append-to-body
      @close="handleEditDialogClose"
    >
      <el-form
        ref="editFormRef"
        :model="editFormData"
        :rules="editFormRules"
        label-width="100px"
      >
        <el-form-item label="社区头像">
          <div class="avatar-upload-section">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
              :http-request="handleAvatarUpload"
              accept="image/*"
            >
              <div v-if="avatarPreview || editFormData.image_url" class="avatar-preview">
                <img :src="avatarPreview || editFormData.image_url" alt="社区头像">
                <div class="avatar-overlay">
                  <el-icon class="avatar-icon">
                    <Plus />
                  </el-icon>
                  <span>更换头像</span>
                </div>
              </div>
              <el-icon v-else class="avatar-uploader-icon" :class="{ 'is-uploading': avatarUploading }">
                <Plus v-if="!avatarUploading" />
                <Loading v-else />
              </el-icon>
              <div v-if="!avatarPreview && !editFormData.image_url" class="avatar-upload-text">
                <div class="upload-text-main">
                  上传头像
                </div>
                <div class="upload-text-hint">
                  支持 JPG、PNG 格式，建议尺寸 256x256
                </div>
              </div>
            </el-upload>
            <div v-if="avatarPreview || editFormData.image_url" class="avatar-actions">
              <el-button size="small" @click="removeAvatar">
                移除头像
              </el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="社区名称" prop="name">
          <el-input
            v-model="editFormData.name"
            placeholder="请输入社区名称"
            maxlength="100"
            show-word-limit
          />
          <div class="form-hint">
            社区名称将显示为 r/社区名称
          </div>
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="editFormData.description"
            type="textarea"
            :rows="6"
            placeholder="请描述你的社区（可选）"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="社区类型" prop="visibility">
          <el-radio-group v-model="editFormData.visibility">
            <el-radio value="public">
              公共 - 任何人均可在此社区中浏览内容、发帖和评论
            </el-radio>
            <el-radio value="restricted">
              受限 - 任何人均可浏览内容,但仅获批用户才能贡献内容
            </el-radio>
            <el-radio value="private">
              私人 - 仅获批用户可浏览和贡献内容
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="成人内容">
          <el-switch v-model="editFormData.is_adult" />
          <div class="form-hint">
            用户必须年满18岁才能浏览和贡献内容
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">
          取消
        </el-button>
        <el-button type="primary" :loading="submitting" @click="handleEditSubmit">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 创建社区对话框 -->
    <CreateCommunityDialog
      v-model="createDialogVisible"
      @success="handleCreateSuccess"
    />

    <!-- 成员管理对话框 -->
    <el-dialog
      v-model="memberDialogVisible"
      title="管理成员"
      width="800px"
      append-to-body
      @close="handleMemberDialogClose"
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
              移除
            </el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="memberDialogVisible = false">
          关闭
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import { ref, onMounted, defineExpose } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, View, Edit, Delete, FolderOpened, Clock, Loading, User } from '@element-plus/icons-vue'
  import { useRouter } from 'vue-router'
  import { getMySubreddits, updateSubreddit, deleteSubreddit } from '@/axios/subreddit'
  import { uploadPostImage } from '@/axios/post'
  import { getMembersBySubreddit, updateMemberRole, removeMember } from '@/axios/subredditMember'
  import CreateCommunityDialog from './CreateCommunityDialog.vue'

  const router = useRouter()
  const communities = ref([])
  const editDialogVisible = ref(false)
  const createDialogVisible = ref(false)
  const editingCommunity = ref(null)
  const editFormRef = ref(null)
  const submitting = ref(false)
  const avatarUploading = ref(false)
  const avatarPreview = ref(null)
  const memberDialogVisible = ref(false)
  const members = ref([])
  const membersLoading = ref(false)
  const currentManagingCommunity = ref(null)

  const editFormData = ref({
    name: '',
    description: '',
    visibility: 'public',
    is_adult: false,
    image_url: null
  })

  const editFormRules = {
    name: [
      { required: true, message: '请输入社区名称', trigger: 'blur' },
      { min: 2, max: 100, message: '社区名称长度在 2 到 100 个字符', trigger: 'blur' }
    ],
    description: [
      { max: 1000, message: '描述不能超过1000个字符', trigger: 'blur' }
    ],
    visibility: [
      { required: true, message: '请选择社区类型', trigger: 'change' }
    ]
  }

  // 获取社区列表
  const fetchCommunities = async () => {
    try {
      const response = await getMySubreddits()
      if (response.success) {
        communities.value = response.data || []
      } else {
        ElMessage.error(response.message || '获取社区列表失败')
      }
    } catch (error) {
      console.error('获取社区列表失败:', error)
      ElMessage.error(error.response?.data?.message || '获取社区列表失败')
    }
  }

  // 格式化日期
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

  // 创建社区
  const handleCreate = () => {
    createDialogVisible.value = true
  }

  // 创建成功回调
  const handleCreateSuccess = () => {
    fetchCommunities()
  }

  // 查看社区
  const handleViewCommunity = (community) => {
    router.push({
      path: `/r/${community.name}`,
      query: {
        subredditId: community.id
      }
    })
  }

  // 编辑社区
  const handleEdit = (community) => {
    editingCommunity.value = community
    editFormData.value = {
      name: community.name,
      description: community.description || '',
      visibility: community.visibility || 'public',
      is_adult: community.is_adult === 1 || community.is_adult === true,
      image_url: community.image_url || null
    }
    avatarPreview.value = null
    editDialogVisible.value = true
  }

  // 提交编辑
  const handleEditSubmit = async () => {
    if (!editFormRef.value) return
    await editFormRef.value.validate(async (valid) => {
      if (valid) {
        submitting.value = true
        try {
          const response = await updateSubreddit(editingCommunity.value.id, editFormData.value)
          if (response.success) {
            ElMessage.success('更新社区成功')
            editDialogVisible.value = false
            fetchCommunities()
          } else {
            ElMessage.error(response.message || '更新社区失败')
          }
        } catch (error) {
          ElMessage.error(error.response?.data?.message || '更新社区失败')
        } finally {
          submitting.value = false
        }
      }
    })
  }

  // 删除社区
  const handleDelete = async (community) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除社区 "r/${community.name}" 吗？此操作不可恢复。`,
        '删除确认',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      const response = await deleteSubreddit(community.id)
      if (response.success) {
        ElMessage.success('删除成功')
        fetchCommunities()
      } else {
        ElMessage.error(response.message || '删除失败')
      }
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.message || '删除失败')
      }
    }
  }

  // 头像上传前验证
  const beforeAvatarUpload = (file) => {
    const isImage = file.type.startsWith('image/')
    const isLt5M = file.size / 1024 / 1024 < 5

    if (!isImage) {
      ElMessage.error('只能上传图片文件!')
      return false
    }
    if (!isLt5M) {
      ElMessage.error('图片大小不能超过 5MB!')
      return false
    }
    return true
  }

  // 处理头像上传
  const handleAvatarUpload = async (options) => {
    const file = options.file
    avatarUploading.value = true
    
    try {
      // 创建预览
      const reader = new FileReader()
      reader.onload = (e) => {
        avatarPreview.value = e.target.result
      }
      reader.readAsDataURL(file)
      
      // 上传图片
      const res = await uploadPostImage(file)
      if (res.success) {
        editFormData.value.image_url = res.data.url
        ElMessage.success('头像上传成功')
      } else {
        ElMessage.error(res.message || '头像上传失败')
        avatarPreview.value = null
      }
    } catch (error) {
      console.error('上传头像失败:', error)
      ElMessage.error(error.message || '头像上传失败')
      avatarPreview.value = null
    } finally {
      avatarUploading.value = false
    }
  }

  // 移除头像
  const removeAvatar = () => {
    editFormData.value.image_url = null
    avatarPreview.value = null
  }

  // 编辑对话框关闭
  const handleEditDialogClose = () => {
    editFormRef.value?.resetFields()
    editingCommunity.value = null
    avatarPreview.value = null
  }

  // 管理成员
  const handleManageMembers = async (community) => {
    currentManagingCommunity.value = community
    memberDialogVisible.value = true
    await fetchMembers(community.id)
  }

  // 获取成员列表
  const fetchMembers = async (subredditId) => {
    membersLoading.value = true
    try {
      const response = await getMembersBySubreddit({ subreddit_id: subredditId })
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

  // 获取角色名称
  const getRoleName = (role) => {
    const roleMap = {
      admin: '管理员',
      moderator: '版主',
      member: '成员'
    }
    return roleMap[role] || '成员'
  }

  // 获取角色标签类型
  const getRoleTagType = (role) => {
    const typeMap = {
      admin: 'danger',
      moderator: 'warning',
      member: 'info'
    }
    return typeMap[role] || 'info'
  }


  // 角色变更
  const handleRoleChange = async (member) => {
    try {
      const response = await updateMemberRole({
        subreddit_id: currentManagingCommunity.value.id,
        user_id: member.user_id,
        role: member.role
      })
      if (response.success) {
        ElMessage.success('角色更新成功')
        await fetchMembers(currentManagingCommunity.value.id)
      } else {
        ElMessage.error(response.message || '角色更新失败')
        // 恢复原值
        await fetchMembers(currentManagingCommunity.value.id)
      }
    } catch (error) {
      console.error('更新角色失败:', error)
      ElMessage.error(error.response?.data?.message || '更新角色失败')
      // 恢复原值
      await fetchMembers(currentManagingCommunity.value.id)
    }
  }

  // 移除成员
  const handleRemoveMember = async (member) => {
    try {
      await ElMessageBox.confirm(
        `确定要移除成员 "${member.username}" 吗？`,
        '移除确认',
        {
          confirmButtonText: '确定移除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      const response = await removeMember({
        subreddit_id: currentManagingCommunity.value.id,
        user_id: member.user_id
      })
      if (response.success) {
        ElMessage.success('移除成员成功')
        await fetchMembers(currentManagingCommunity.value.id)
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

  // 成员管理对话框关闭
  const handleMemberDialogClose = () => {
    members.value = []
    currentManagingCommunity.value = null
  }

  onMounted(() => {
    fetchCommunities()
  })

  // 暴露方法供父组件调用刷新
  defineExpose({
    fetchCommunities
  })
</script>

<style scoped>
.community-manage {
  padding: 20px 0;
}

.community-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.communities-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.community-item {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s;
}

.community-item:hover {
  border-color: var(--primary, #0079d3);
  box-shadow: 0 2px 8px rgba(0, 121, 211, 0.1);
}

.community-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.community-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.community-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--primary-light, rgba(0, 121, 211, 0.1));
}

.community-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.community-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.community-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  cursor: pointer;
  transition: color 0.3s;
}

.community-name:hover {
  color: var(--primary, #0079d3);
}

.community-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.community-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.community-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.meta-item .el-icon {
  font-size: 14px;
}

.community-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.empty-container {
  padding: 40px 0;
  text-align: center;
}

/* 头像上传样式 */
.avatar-upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-uploader {
  width: 120px;
  height: 120px;
  border: 2px dashed var(--card-border);
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: var(--primary, #0079d3);
  background: var(--bg-hover, rgba(0, 121, 211, 0.05));
}

.avatar-uploader-icon {
  font-size: 32px;
  color: var(--text-secondary);
  transition: all 0.3s ease;
}

.avatar-uploader-icon.is-uploading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.avatar-upload-text {
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  padding: 0 8px;
}

.upload-text-main {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.upload-text-hint {
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1.2;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  border-radius: 6px;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 12px;
  gap: 4px;
}

.avatar-uploader:hover .avatar-overlay {
  opacity: 1;
}

.avatar-icon {
  font-size: 24px;
}

.avatar-actions {
  display: flex;
  gap: 8px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 成员管理对话框样式 */
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
  .community-content {
    flex-direction: column;
  }

  .community-actions {
    width: 100%;
    justify-content: flex-end;
  }

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

