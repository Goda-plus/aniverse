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
    toolbarKeys: ['emotion', '|', 'uploadImage', 'uploadVideo']
  }

  const editorConfig = {
    placeholder: '输入消息...',
    readOnly: props.disabled,
    scroll: false,
    MENU_CONF: {
      uploadImage: {
        // 使用自定义上传：不直接插入到编辑器内容，而是走外层聊天的发送逻辑
        customUpload (file, insertFn) {
          emit('send-image', file)
          // 不调用 insertFn，避免把图片插入到文本消息中
        }
      },
      uploadVideo: {
        customUpload (file, insertFn) {
          emit('send-file', file)
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
  overflow: hidden;
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
</style>


