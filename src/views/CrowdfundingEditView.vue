<template>
  <MainContentLayout>
    <template #content>
      <div class="edit-view">
        <div class="page-header">
          <h1 class="page-title">
            编辑项目
          </h1>
          <p class="page-description">
            修改你的项目信息（注意：项目开始众筹后将无法修改）
          </p>
        </div>

        <div v-if="loading" class="loading-state">
          <el-skeleton
            v-for="i in 3"
            :key="i"
            animated
            class="form-skeleton"
          >
            <template #template>
              <el-skeleton-item variant="text" style="width: 100%; height: 40px;" />
              <el-skeleton-item variant="textarea" style="width: 100%; height: 100px;" />
            </template>
          </el-skeleton>
        </div>

        <div v-else-if="project">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-width="120px"
            size="large"
          >
            <!-- 基本信息 -->
            <el-card class="form-section" shadow="never">
              <template #header>
                <div class="section-title">
                  <el-icon><DocumentAdd /></el-icon>
                  项目基本信息
                </div>
              </template>

              <el-row :gutter="20">
                <el-col :span="24">
                  <el-form-item label="项目标题" prop="title">
                    <el-input
                      v-model="form.title"
                      placeholder="给你的创意项目起一个吸引人的名字"
                      maxlength="100"
                      show-word-limit
                    />
                  </el-form-item>
                </el-col>

                <el-col :span="12">
                  <el-form-item label="目标金额" prop="goal_amount">
                    <el-input-number
                      v-model="form.goal_amount"
                      :min="1"
                      :max="1000000"
                      :precision="0"
                      controls-position="right"
                      placeholder="最低1元"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>

                <el-col :span="12">
                  <el-form-item label="项目分类" prop="category">
                    <el-select v-model="form.category" placeholder="选择项目分类" style="width: 100%">
                      <el-option label="手办模型" value="手办模型" />
                      <el-option label="动漫周边" value="动漫周边" />
                      <el-option label="服饰配件" value="服饰配件" />
                      <el-option label="海报挂画" value="海报挂画" />
                      <el-option label="其他创意" value="其他创意" />
                    </el-select>
                  </el-form-item>
                </el-col>

                <el-col :span="12">
                  <el-form-item label="开始时间" prop="start_date">
                    <el-date-picker
                      v-model="form.start_date"
                      type="datetime"
                      placeholder="选择开始时间"
                      :disabled-date="disabledStartDate"
                      format="YYYY-MM-DD HH:mm"
                      value-format="YYYY-MM-DD HH:mm"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>

                <el-col :span="12">
                  <el-form-item label="结束时间" prop="end_date">
                    <el-date-picker
                      v-model="form.end_date"
                      type="datetime"
                      placeholder="选择结束时间"
                      :disabled-date="disabledEndDate"
                      format="YYYY-MM-DD HH:mm"
                      value-format="YYYY-MM-DD HH:mm"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>

                <el-col :span="24">
                  <el-form-item label="项目描述" prop="description">
                    <el-input
                      v-model="form.description"
                      type="textarea"
                      :rows="6"
                      placeholder="详细描述你的创意项目理念、设计思路和目标用户等"
                      maxlength="2000"
                      show-word-limit
                    />
                  </el-form-item>
                </el-col>

                <el-col :span="24">
                  <el-form-item label="风险描述" prop="risk_description">
                    <el-input
                      v-model="form.risk_description"
                      type="textarea"
                      :rows="4"
                      placeholder="描述项目可能存在的风险和挑战"
                      maxlength="1000"
                      show-word-limit
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-card>

            <!-- 操作按钮 -->
            <div class="form-actions">
              <el-button @click="$router.back()">
                取消
              </el-button>
              <el-button type="primary" :loading="submitting" @click="handleSubmit">
                {{ submitting ? '保存中...' : '保存修改' }}
              </el-button>
            </div>
          </el-form>
        </div>

        <div v-else class="error-state">
          <el-empty description="项目不存在或无权限编辑" />
        </div>
      </div>
    </template>

    <template #sidebar>
      <div class="sidebar-content">
        <!-- 编辑提示 -->
        <div class="sidebar-card">
          <div class="sidebar-title">
            编辑提示
          </div>
          <div class="tips-content">
            <div class="tip-item">
              <el-icon><InfoFilled /></el-icon>
              <span>只有草稿状态和审核中的项目可以编辑</span>
            </div>
            <div class="tip-item">
              <el-icon><Warning /></el-icon>
              <span>项目一旦开始众筹，将无法修改任何信息</span>
            </div>
            <div class="tip-item">
              <el-icon><Clock /></el-icon>
              <span>修改后需要重新提交审核</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MainContentLayout>
</template>

<script setup>
  import { ref, onMounted, reactive } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import MainContentLayout from '@/components/MainContentLayout.vue'
  import { DocumentAdd, InfoFilled, Warning, Clock } from '@element-plus/icons-vue'
  import { getCrowdfundingProjectDetail, updateCrowdfundingProject } from '@/axios/crowdfunding'

  const route = useRoute()
  const router = useRouter()

  const loading = ref(false)
  const submitting = ref(false)
  const project = ref(null)
  const formRef = ref()

  // 表单数据
  const form = reactive({
    title: '',
    description: '',
    goal_amount: null,
    start_date: '',
    end_date: '',
    category: '',
    risk_description: ''
  })

  // 表单验证规则
  const rules = {
    title: [
      { required: true, message: '请输入项目标题', trigger: 'blur' },
      { min: 5, max: 100, message: '标题长度在5-100个字符', trigger: 'blur' }
    ],
    description: [
      { required: true, message: '请输入项目描述', trigger: 'blur' },
      { min: 50, max: 2000, message: '描述长度在50-2000个字符', trigger: 'blur' }
    ],
    goal_amount: [
      { required: true, message: '请输入目标金额', trigger: 'change' },
      { type: 'number', min: 1, message: '目标金额至少为1元', trigger: 'change' }
    ],
    start_date: [
      { required: true, message: '请选择开始时间', trigger: 'change' }
    ],
    end_date: [
      { required: true, message: '请选择结束时间', trigger: 'change' }
    ],
    category: [
      { required: true, message: '请选择项目分类', trigger: 'change' }
    ]
  }

  // 禁用开始日期
  const disabledStartDate = (time) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return time.getTime() < now.getTime()
  }

  // 禁用结束日期
  const disabledEndDate = (time) => {
    if (!form.start_date) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      return time.getTime() < now.getTime()
    }
    const startTime = new Date(form.start_date)
    return time.getTime() < startTime.getTime()
  }

  // 加载项目数据
  const loadProject = async () => {
    loading.value = true
    try {
      const projectId = route.params.id
      const response = await getCrowdfundingProjectDetail(projectId)

      if (response.success) {
        project.value = response.data.project

        // 检查权限
        if (!['draft', 'pending_review'].includes(project.value.status)) {
          ElMessage.error('项目状态不允许编辑')
          router.back()
          return
        }

        // 填充表单
        Object.assign(form, {
          title: project.value.title,
          description: project.value.description,
          goal_amount: project.value.goal_amount,
          start_date: project.value.start_date,
          end_date: project.value.end_date,
          category: project.value.category,
          risk_description: project.value.risk_description
        })
      } else {
        ElMessage.error('项目不存在')
        router.back()
      }
    } catch (error) {
      console.error('加载项目失败:', error)
      ElMessage.error('加载项目失败')
      router.back()
    } finally {
      loading.value = false
    }
  }

  // 提交修改
  const handleSubmit = async () => {
    if (!formRef.value) return

    try {
      await formRef.value.validate()
    } catch {
      return
    }

    submitting.value = true

    try {
      console.log('project',project.value)
      const response = await updateCrowdfundingProject(project.value.id, form)

      if (response.success) {
        ElMessage.success('项目修改成功！')
        router.push(`/crowdfunding/project/${project.value.id}`)
      } else {
        ElMessage.error(response.message || '修改失败')
      }
    } catch (error) {
      console.error('修改项目失败:', error)
      ElMessage.error('修改失败，请重试')
    } finally {
      submitting.value = false
    }
  }

  onMounted(() => {
    loadProject()
  })
</script>

<style scoped>
.edit-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 0;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 12px 0;
}

.page-description {
  font-size: 16px;
  color: #606266;
  margin: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-skeleton {
  padding: 20px;
}

.form-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.error-state {
  text-align: center;
  padding: 60px 0;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 16px;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.sidebar-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  transition: color 0.3s ease;
}

.tips-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.tip-item .el-icon {
  color: #E6A23C;
  margin-top: 1px;
  flex-shrink: 0;
}
</style>
