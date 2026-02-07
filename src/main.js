import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/base.css'
import './styles/element-plus.css'
import './styles/wangEditor.css'
// 引入wangEditor
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'

// 处理 ResizeObserver 循环错误
const resizeObserverErrHandler = (err) => {
  if (err.message && err.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    // 忽略这个特定的错误
    return
  }
  // 重新抛出其他错误
  throw err
}

// 全局错误处理器
window.addEventListener('error', resizeObserverErrHandler)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('ResizeObserver loop completed with undelivered notifications')) {
    event.preventDefault()
  }
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
// 配置 Element Plus，避免 ResizeObserver 循环
app.use(ElementPlus, {
  size: 'default',
  zIndex: 3000,
  // 禁用某些可能导致 ResizeObserver 循环的功能
  button: {
    autoInsertSpace: false
  }
})
// 全局注册wangEditor组件
app.component('WangEditor', Editor)
app.component('WangEditorToolbar', Toolbar)
app.mount('#app')
