<template>
  <el-dialog
    v-model="visible"
    title="创建名场面"
    width="720px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" placeholder="例如：螺旋丸首秀" />
      </el-form-item>

      <el-form-item label="集数/章节" prop="episode">
        <el-input v-model="form.episode" placeholder="例如：第3话 / S01E05（可选）" />
      </el-form-item>

      <el-form-item label="时间点" prop="time_position">
        <el-input-number v-model="form.time_position" :min="0" :step="1" controls-position="right" />
        <span class="hint">秒（可选）</span>
      </el-form-item>

      <el-form-item label="截图/GIF" prop="image_url">
        <div class="upload-row">
          <el-input v-model="form.image_url" placeholder="图片 URL（必填）" />
          <el-upload
            class="uploader"
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
          >
            <el-button>上传</el-button>
          </el-upload>
        </div>
        <div v-if="form.image_url" class="preview">
          <img :src="form.image_url" alt="">
        </div>
      </el-form-item>

      <el-form-item label="台词" prop="quote_text">
        <el-input v-model="form.quote_text" type="textarea" :rows="2" placeholder="经典台词（可选）" />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="点评/补充说明（可选）" />
      </el-form-item>

      <el-form-item label="标签">
        <el-select
          v-model="form.tag_ids"
          multiple
          filterable
          remote
          :remote-method="remoteSearchTags"
          :loading="tagsLoading"
          placeholder="搜索并选择标签（可选）"
          style="width: 100%;"
        >
          <el-option v-for="t in tagOptions" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
      </el-form-item>

      <el-form-item label="相关角色">
        <el-select v-model="form.character_ids" multiple filterable placeholder="选择相关角色（可选）" style="width: 100%;">
          <el-option
            v-for="c in characters"
            :key="c.id"
            :label="c.name_native || c.name_alternative || String(c.id)"
            :value="c.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="主要角色">
        <el-select v-model="form.main_character_id" clearable filterable placeholder="可选" style="width: 100%;">
          <el-option
            v-for="c in characters"
            :key="c.id"
            :label="c.name_native || c.name_alternative || String(c.id)"
            :value="c.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="公开可见">
        <el-switch v-model="form.is_public" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">
        取消
      </el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
  import { computed, reactive, ref, watch ,defineProps, defineEmits} from 'vue'
  import { ElMessage } from 'element-plus'
  import { uploadPostImage } from '@/axios/post'
  import { getTagsList } from '@/axios/tags'
  import { createSceneMoment } from '@/axios/sceneMoments'

  const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mediaId: { type: [String, Number], required: true },
    characters: { type: Array, default: () => [] }
  })
  const emit = defineEmits(['update:modelValue', 'created'])

  const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v)
  })

  const formRef = ref()
  const submitting = ref(false)

  const form = reactive({
    title: '',
    episode: '',
    time_position: null,
    image_url: '',
    quote_text: '',
    description: '',
    tag_ids: [],
    character_ids: [],
    main_character_id: null,
    is_public: true
  })

  const rules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    image_url: [{ required: true, message: '请填写图片URL或上传', trigger: 'blur' }]
  }

  const tagOptions = ref([])
  const tagsLoading = ref(false)
  const tagKeyword = ref('')

  const remoteSearchTags = async (kw) => {
    tagKeyword.value = kw
    tagsLoading.value = true
    try {
      const resp = await getTagsList({ search: kw, page: 1, pageSize: 20 })
      if (resp.code === 200) {
        tagOptions.value = resp.data?.list || resp.data || []
      }
    } finally {
      tagsLoading.value = false
    }
  }

  watch(
    () => visible.value,
    async (v) => {
      if (v && tagOptions.value.length === 0) {
        await remoteSearchTags('')
      }
      if (!v) {
        // reset
        form.title = ''
        form.episode = ''
        form.time_position = null
        form.image_url = ''
        form.quote_text = ''
        form.description = ''
        form.tag_ids = []
        form.character_ids = []
        form.main_character_id = null
        form.is_public = true
      }
    }
  )

  const handleBeforeUpload = async (file) => {
    try {
      const resp = await uploadPostImage(file)
      if (resp.code === 200) {
        form.image_url = resp.data.url
        ElMessage.success('上传成功')
      } else {
        ElMessage.error(resp.message || '上传失败')
      }
    } catch (e) {
      ElMessage.error(e?.response?.data?.message || '上传失败')
    }
    return false // 阻止 el-upload 自动上传
  }

  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate(async (ok) => {
      if (!ok) return
      submitting.value = true
      try {
        const resp = await createSceneMoment({
          media_id: Number(props.mediaId),
          title: form.title,
          episode: form.episode || null,
          time_position: form.time_position === null ? null : Number(form.time_position),
          image_url: form.image_url,
          quote_text: form.quote_text || null,
          description: form.description || null,
          tag_ids: form.tag_ids,
          character_ids: form.character_ids,
          main_character_id: form.main_character_id,
          is_public: form.is_public
        })
        if (resp.code === 200) {
          ElMessage.success(resp.message || '提交成功')
          emit('created', resp.data)
          visible.value = false
        } else {
          ElMessage.error(resp.message || '提交失败')
        }
      } catch (e) {
        ElMessage.error(e?.response?.data?.message || '提交失败')
      } finally {
        submitting.value = false
      }
    })
  }
</script>

<style scoped>
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: rgba(156, 163, 175, 0.95);
}
.upload-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.uploader {
  flex-shrink: 0;
}
.preview {
  margin-top: 10px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(31, 41, 55, 0.9);
}
.preview img {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  display: block;
}
</style>


