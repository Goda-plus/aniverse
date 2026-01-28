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

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
// 全局注册wangEditor组件
app.component('WangEditor', Editor)
app.component('WangEditorToolbar', Toolbar)
app.mount('#app')
