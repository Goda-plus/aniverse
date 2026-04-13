<template>
  <el-dialog
    v-model="innerVisible"
    title="举报"
    width="440px"
    destroy-on-close
    append-to-body
    @closed="onClosed"
  >
    <div class="report-hint">
      {{ typeLabel }} · ID {{ targetId }}
    </div>
    <el-form label-position="top" @submit.prevent>
      <el-form-item label="举报原因" required>
        <el-select v-model="reportType" placeholder="请选择" style="width: 100%;">
          <el-option
            v-for="opt in reasonOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="补充说明（选填）">
        <el-input
          v-model="reasonText"
          type="textarea"
          :rows="3"
          maxlength="500"
          show-word-limit
          placeholder="可补充具体情况，便于我们处理"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="innerVisible = false">
        取消
      </el-button>
      <el-button type="primary" :loading="submitting" @click="submit">
        提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { ElMessage } from 'element-plus'
  import { useUserStore } from '@/stores/user'
  import { submitReport as submitReportApi } from '@/axios/report'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    targetType: { type: String, required: true },
    targetId: { type: [Number, String], required: true }
  })

  const emit = defineEmits(['update:modelValue', 'success'])

  const userStore = useUserStore()
  const innerVisible = ref(false)
  const reportType = ref('')
  const reasonText = ref('')
  const submitting = ref(false)

  const reasonOptions = [
    { value: 'spam', label: '垃圾广告' },
    { value: 'harassment', label: '骚扰辱骂' },
    { value: 'porn', label: '色情低俗' },
    { value: 'illegal', label: '违法违规' },
    { value: 'fraud', label: '虚假欺诈' },
    { value: 'infringement', label: '侵权' },
    { value: 'other', label: '其他' }
  ]

  const typeLabel = computed(() => {
    const m = {
      post: '帖子',
      comment: '评论',
      scene_comment: '评论（名场面）',
      crowdfunding_comment: '评论（众筹）',
      scene_moment: '名场面',
      user: '用户',
      product: '商品',
      crowdfunding: '众筹项目'
    }
    return m[props.targetType] || props.targetType
  })

  watch(
    () => props.modelValue,
    (v) => {
      innerVisible.value = v
      if (v) {
        reportType.value = ''
        reasonText.value = ''
      }
    },
    { immediate: true }
  )

  watch(innerVisible, (v) => {
    emit('update:modelValue', v)
  })

  function onClosed () {
    reportType.value = ''
    reasonText.value = ''
  }

  async function submit () {
    if (!userStore.isLoggedIn) {
      ElMessage.warning('请先登录')
      return
    }
    if (!reportType.value) {
      ElMessage.warning('请选择举报原因')
      return
    }
    const id = Number(props.targetId)
    if (!Number.isFinite(id) || id < 1) {
      ElMessage.error('无效的对象')
      return
    }
    submitting.value = true
    try {
      const res = await submitReportApi({
        target_type: props.targetType,
        target_id: id,
        report_type: reportType.value,
        reason: reasonText.value.trim() || undefined
      })
      if (res.success && res.code === 200) {
        ElMessage.success(res.message || '已提交')
        emit('success')
        innerVisible.value = false
      } else {
        ElMessage.error(res.message || '提交失败')
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || '提交失败'
      ElMessage.error(msg)
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped>
.report-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 12px;
}
</style>
