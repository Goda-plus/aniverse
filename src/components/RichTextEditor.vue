<template>
  <div class="rich-editor-wrapper">
    <Toolbar
      v-if="editorRef"
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="simple"
      class="rich-editor-toolbar"
    />
    <Editor
      v-model:html="innerValue"
      class="rich-editor-main"
      :default-config="editorConfig"
      :mode="'simple'"
      @on-created="handleCreated"
      @keydown="handleKeydown"
    />
  </div>
</template>

<script setup>
  import { shallowRef, ref, watch, onBeforeUnmount } from 'vue'
  import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
  import '@wangeditor/editor/dist/css/style.css'
  import { ElMessage } from 'element-plus'
  import { uploadPostImage, uploadPostVideo } from '@/axios/post'

  // eslint-disable-next-line no-undef
  const props = defineProps({
    modelValue: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    }
  })

  // eslint-disable-next-line no-undef
  const emit = defineEmits(['update:modelValue', 'submit', 'send-image', 'send-file'])

  const editorRef = shallowRef(null)
  const innerValue = ref(props.modelValue || '')

  // 仅保留表情和文件上传相关的工具栏按钮
  const toolbarConfig = {
    toolbarKeys: ['emotion',  'uploadImage', 'uploadVideo']
  }

  function normalizeUploadedUrl (res) {
    // 兼容不同后端返回格式：{ success, code, data:{url} } / { code, data:{url} } / { url } / { data:{url} }
    if (!res) return ''
    if (res.success && res.code === 200 && res.data?.url) return res.data.url
    if (res.code === 200 && res.data?.url) return res.data.url
    if (res.url) return res.url
    if (res.data?.url) return res.data.url
    return ''
  }

  async function uploadByType (file) {
    const mime = file?.type || ''
    if (mime.startsWith('image/')) {
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        ElMessage.error('图片大小不能超过 5MB')
        return { url: '' }
      }
      const res = await uploadPostImage(file)
      const url = normalizeUploadedUrl(res)
      return { url, messageType: 'image' }
    }

    // 非图片统一走“视频上传”接口（项目内目前只有这两个上传端点）
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      ElMessage.error('文件大小不能超过 100MB')
      return { url: '' }
    }
    const res = await uploadPostVideo(file)
    const url = normalizeUploadedUrl(res)
    const messageType = mime.startsWith('video/')
      ? 'video'
      : (mime.startsWith('audio/') ? 'audio' : 'file')
    return { url, messageType }
  }

  async function customUploadAndEmit (file) {
    try {
      const { url, messageType } = await uploadByType(file)
      if (!url) {
        ElMessage.error('上传失败')
        return
      }
      const payload = {
        url,
        name: file.name,
        size: file.size,
        type: file.type || '',
        messageType
      }
      if (messageType === 'image') {
        emit('send-image', payload)
      } else {
        emit('send-file', payload)
      }
    } catch (e) {
      // axios error 兼容
      const msg = e?.response?.data?.message || e?.message || '上传失败，请重试'
      ElMessage.error(msg)
      console.error('上传失败:', e)
    }
  }

  const editorConfig = {
    placeholder: '输入消息...',
    readOnly: props.disabled,
    scroll: false,
    MENU_CONF: {
      uploadImage: {
        // 使用自定义上传：不直接插入到编辑器内容，而是走外层聊天的发送逻辑
        async customUpload (file, insertFn) {
          await customUploadAndEmit(file)
          // 不调用 insertFn，避免把图片插入到文本消息中
        }
      },
      uploadVideo: {
        async customUpload (file, insertFn) {
          await customUploadAndEmit(file)
          // 同样不插入到富文本内容中
        }
      }
    }
  }

  watch(
    () => props.modelValue,
    (val) => {
      if (val !== innerValue.value) {
        innerValue.value = val || ''
      }
    }
  )

  watch(innerValue, (val) => {
    emit('update:modelValue', val)
  })

  function handleCreated (editor) {
    editorRef.value = editor
  }

  function handleKeydown (event) {
    // Ctrl+Enter 或 Cmd+Enter 发送消息，Enter 换行
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      emit('submit')
    }
  }

  // 对外暴露插入 emoji 的方法，父组件可通过 ref 调用
  function insertEmoji (emoji) {
    const editor = editorRef.value
    if (!editor) {
      // 编辑器还没创建好时，直接往本地值里追加，等创建好会同步
      innerValue.value = (innerValue.value || '') + emoji
      return
    }
    editor.insertText(emoji)
    // 强制同步一次 HTML 到 v-model
    innerValue.value = editor.getHtml()
  }

  // 让父组件可以拿到 insertEmoji / 获取内容 / 清空内容 等方法
  // eslint-disable-next-line no-undef
  defineExpose({
    insertEmoji,
    // 获取当前 HTML 内容
    getHtml: () => {
      const editor = editorRef.value
      if (editor) return editor.getHtml()
      return innerValue.value || ''
    },
    // 获取纯文本内容
    getText: () => {
      const editor = editorRef.value
      if (editor) return editor.getText()
      // 退化处理：编辑器还没创建好时，从 innerValue 中粗略去标签
      const div = document.createElement('div')
      div.innerHTML = innerValue.value || ''
      return div.innerText || ''
    },
    // 清空内容
    clear: () => {
      const editor = editorRef.value
      if (editor) {
        editor.clear()
      }
      innerValue.value = ''
    }
  })

  onBeforeUnmount(() => {
    const editor = editorRef.value
    if (editor) {
      editor.destroy()
    }
  })
</script>

<style scoped>
.rich-editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-radius: 6px;
  min-height: 90px;
  max-height: 140px;
  background: var(--bg-secondary, #1a1a1b);
}

.rich-editor-toolbar {
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-color, #343536);
}

.rich-editor-main {
  width: 100%;
  min-height: 60px;
  max-height: 120px;
  overflow-y: auto;
  padding: 6px 8px;
}

.rich-editor-wrapper :deep(.w-e-drop-panel) {
  top: unset !important;
  bottom: 0px !important;
}
</style>


