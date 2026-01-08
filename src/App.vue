<template>
  <div class="app-shell">
    <!-- 登录页面独立显示，不包含导航栏和侧边栏 -->
    <router-view v-if="isAuthPage" />
    
    <!-- 其他页面显示完整布局 -->
    <template v-else>
      <!-- 顶部导航栏 -->
      <header class="top-navbar setting-control">
        <div class="navbar-content">
          <div class="navbar-left">
            <el-button text class="menu-toggle-btn" @click="toggleSidebar">
              <el-icon v-if="!sidebarVisible">
                <Expand />
              </el-icon>
              <el-icon v-else>
                <Fold />
              </el-icon>
            </el-button>
            <div v-if="!sidebarVisible" class="logo">
              <span class="logo-text">AniVerse</span>
            </div>
          </div>
          <div class="navbar-center">
            <div class="search-container">
              <el-input
                v-model="keyword"
                placeholder="查找所需一切信息"
                clearable
                :prefix-icon="Search"
                class="search-input"
              />
              <el-button type="primary" class="ask-button">
                询问
              </el-button>
            </div>
          </div>
          <div class="navbar-right">
            <el-button text class="get-app-btn">
              <el-icon><Download /></el-icon>
              获取应用
            </el-button>
            <el-button 
              v-if="!userStore.isLoggedIn"
              type="primary" 
              round 
              class="login-btn"
              @click="goToLogin"
            >
              登录
            </el-button>
            <div v-else class="user-menu-wrapper" @mouseenter="showUserMenu = true" @mouseleave="showUserMenu = false">
              <el-avatar 
                v-if="userStore.avatar" 
                :src="userStore.avatar" 
                :size="32"
                class="header-avatar"
              />
              <el-avatar 
                v-else
                :size="32"
                class="header-avatar"
              >
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <transition name="fade">
                <div v-if="showUserMenu" class="user-dropdown-menu">
                  <div class="menu-item" @click="handleUserCommand('profile')">
                    <el-icon><UserFilled /></el-icon>
                    <span>查看个人资料</span>
                  </div>
                  <div class="menu-item" @click="handleUserCommand('avatar')">
                    <el-icon><Avatar /></el-icon>
                    <span>编辑头像</span>
                  </div>
                  <div class="menu-item" @click="handleUserCommand('create-post')">
                    <el-icon><Plus /></el-icon>
                    <span>创建帖子</span>
                  </div>
                  <div class="menu-item" @click="handleUserCommand('drafts')">
                    <el-icon><Document /></el-icon>
                    <span>草稿</span>
                  </div>
                  <div class="menu-item" @click="handleUserCommand('monetization')">
                    <el-icon><Money /></el-icon>
                    <span>创收</span>
                    <span class="menu-subtitle">在 AniVerse 上赚取现金</span>
                  </div>
                  <div class="menu-item" @click="handleUserCommand('premium')">
                    <el-icon><Star /></el-icon>
                    <span>Premium</span>
                  </div>
                  <div class="menu-item menu-item-with-toggle" @click="toggleDarkMode">
                    <el-icon><Moon v-if="!themeStore.isDark" /><Sunny v-else /></el-icon>
                    <span>深色模式</span>
                    <el-switch 
                      v-model="darkModeEnabled" 
                      class="dark-mode-switch"
                      @change="handleDarkModeChange"
                    />
                  </div>
                  <div class="menu-divider" />
                  <div class="menu-item" @click="handleUserCommand('logout')">
                    <el-icon><SwitchButton /></el-icon>
                    <span>注销</span>
                  </div>
                  <div class="menu-item" @click="handleUserCommand('advertise')">
                    <el-icon><Promotion /></el-icon>
                    <span>在 AniVerse 上投放广告</span>
                  </div>
                  <div class="menu-item" @click="handleUserCommand('settings')">
                    <el-icon><Setting /></el-icon>
                    <span>设置</span>
                  </div>
                </div>
              </transition>
            </div>
            <el-button text class="menu-btn">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
          </div>
        </div>
      </header>

      <div class="main-layout">
        <!-- 左侧菜单栏 -->
        <aside class="left-sidebar setting-control" :class="{ collapsed: !sidebarVisible }">
          <div class="sidebar-content">
            <!-- Logo区域 -->
            <div class="sidebar-logo">
              <div class="logo-header">
                <div class="logo-wrapper">
                  <img src="@/assets/logo.png" alt="AniVerse Logo" class="logo-image">
                  <!-- 可选的通知徽章 -->
                  <!-- <span class="logo-badge" /> -->
                </div>
                <span class="logo-title">AniVerse</span>
              </div>
              <div class="logo-divider" />
            </div>
            
            <el-menu
              :default-active="active"
              :collapse="!sidebarVisible"
              :collapse-transition="false"
              class="sidebar-menu"
              @select="handleMenuSelect"
            >
              <!-- 导航部分 -->
              <el-menu-item index="/">
                <el-icon><House /></el-icon>
                <template #title>
                  主页
                </template>
              </el-menu-item>
              <el-menu-item index="/popular">
                <el-icon><ArrowUp /></el-icon>
                <template #title>
                  受欢迎
                </template>
              </el-menu-item>
              <el-menu-item index="/browse">
                <el-icon><UserFilled /></el-icon>
                <template #title>
                  浏览
                </template>
              </el-menu-item>
              <el-menu-item index="/all">
                <el-icon><DataBoard /></el-icon>
                <template #title>
                  动态
                </template>
              </el-menu-item>
              <el-menu-item index="/create-community">
                <el-icon><Plus /></el-icon>
                <template #title>
                  + 创建社区
                </template>
              </el-menu-item>
              <el-menu-item index="/mall">
                <el-icon><ShoppingCartFull /></el-icon>
                <template #title>
                  周边商城
                </template>
              </el-menu-item>

              <!-- 资源部分 -->
              <el-menu-item-group>
                <template #title>
                  <span class="section-header-text">资源</span>
                </template>
                <el-menu-item index="/about">
                  <el-icon><InfoFilled /></el-icon>
                  <template #title>
                    关于 AniVerse
                  </template>
                </el-menu-item>
                <el-menu-item index="/advertise">
                  <el-icon><Promotion /></el-icon>
                  <template #title>
                    广告
                  </template>
                </el-menu-item>
                <el-menu-item index="/developer">
                  <el-icon><Tools /></el-icon>
                  <template #title>
                    开发者平台
                  </template>
                </el-menu-item>
                <el-menu-item index="/pro" class="pro-menu-item">
                  <el-icon><Star /></el-icon>
                  <template #title>
                    <span class="menu-item-title">AniVerse Pro</span>
                    <el-tag size="small" type="danger" effect="plain" class="beta-tag">
                      测试版
                    </el-tag>
                  </template>
                </el-menu-item>
                <el-menu-item index="/help">
                  <el-icon><QuestionFilled /></el-icon>
                  <template #title>
                    帮助
                  </template>
                </el-menu-item>
                <el-menu-item index="/blog">
                  <el-icon><Document /></el-icon>
                  <template #title>
                    博客
                  </template>
                </el-menu-item>
                <el-menu-item index="/careers">
                  <el-icon><Briefcase /></el-icon>
                  <template #title>
                    职业
                  </template>
                </el-menu-item>
                <el-menu-item index="/news">
                  <el-icon><Bell /></el-icon>
                  <template #title>
                    新闻
                  </template>
                </el-menu-item>
              </el-menu-item-group>

              <!-- 社区部分 -->
              <el-menu-item-group>
                <template #title>
                  <el-icon><Globe /></el-icon>
                  <span class="section-header-text">社区</span>
                </template>
                <el-menu-item index="/best">
                  <el-icon><Trophy /></el-icon>
                  <template #title>
                    AniVerse 最佳
                  </template>
                </el-menu-item>
              </el-menu-item-group>

              <!-- 底部 -->
              <el-menu-item index="/rules" class="sidebar-footer-item">
                <template #title>
                  AniVerse 规则
                </template>
              </el-menu-item>
            </el-menu>
          </div>
        </aside>

        <!-- 主内容区域（包含中间内容和右侧栏） -->
        <main class="content-area" :class="{ expanded: !sidebarVisible }">
          <router-view />
        </main>
      </div>

      <!-- 主题设置 -->
      <ThemeSettings v-model="showThemeSettings" />
      
      <!-- 创建社区弹窗 -->
      <CreateCommunityDialog 
        v-model="showCreateCommunityDialog"
        @success="handleCommunityCreated"
      />
    </template>
  </div>
</template>

<script setup>
  import { computed, ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useThemeStore } from '@/stores/theme'
  import { useUserStore } from '@/stores/user'
  import { ElMessageBox, ElMessage } from 'element-plus'
  import ThemeSettings from '@/components/ThemeSettings.vue'
  import CreateCommunityDialog from '@/components/CreateCommunityDialog.vue'
  import {
    House,
    ArrowUp,
    UserFilled,
    InfoFilled,
    Promotion,
    Tools,
    Star,
    QuestionFilled,
    Document,
    Briefcase,
    Bell,
    Globe,
    Trophy,
    Search,
    Download,
    MoreFilled,
    Expand,
    Fold,
    Setting,
    SwitchButton,
    Avatar,
    Money,
    Moon,
    Sunny,
    DataBoard,
    Plus,
    ShoppingCartFull
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const keyword = ref('')
  const active = computed(() => route.path)
  const sidebarVisible = ref(false)
  const showThemeSettings = ref(false)
  const showUserMenu = ref(false)
  const showCreateCommunityDialog = ref(false)
  const themeStore = useThemeStore()
  const userStore = useUserStore()
  const darkModeEnabled = computed({
    get: () => themeStore.isDark,
    set: (val) => {
      themeStore.setMode(val ? 'dark' : 'light')
    }
  })

  // 判断是否是认证页面（登录/注册），这些页面不显示导航栏和侧边栏
  const isAuthPage = computed(() => {
    return route.path === '/login' || route.path === '/register'
  })

  const toggleSidebar = () => {
    sidebarVisible.value = !sidebarVisible.value
  }

  const handleMenuSelect = (index) => {
    if (index === '/create-community') {
      if (!userStore.isLoggedIn) {
        ElMessage.warning('请先登录')
        goToLogin()
        return
      }
      showCreateCommunityDialog.value = true
      return
    }
    router.push(index)
  }

  const handleCommunityCreated = (data) => {
    // 社区创建成功后的回调
    console.log('社区创建成功:', data)
  }

  const goToLogin = () => {
    router.push({
      path: '/login',
      query: { redirect: route.fullPath }
    })
  }

  const handleUserCommand = async (command) => {
    if (command === 'profile') {
      router.push('/profile')
      showUserMenu.value = false
    } else if (command === 'avatar') {
      // TODO: 实现编辑头像功能
      showUserMenu.value = false
    } else if (command === 'create-post') {
      router.push('/create-post')
      showUserMenu.value = false
    } else if (command === 'drafts') {
      // TODO: 实现草稿功能
      showUserMenu.value = false
    } else if (command === 'monetization') {
      // TODO: 实现创收功能
      showUserMenu.value = false
    } else if (command === 'premium') {
      // TODO: 实现Premium功能
      showUserMenu.value = false
    } else if (command === 'settings') {
      showThemeSettings.value = true
      showUserMenu.value = false
    } else if (command === 'advertise') {
      // TODO: 实现广告投放功能
      showUserMenu.value = false
    } else if (command === 'logout') {
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        userStore.logout()
        router.push('/')
        showUserMenu.value = false
      } catch {
        // 用户取消
      }
    }
  }

  const toggleDarkMode = () => {
    darkModeEnabled.value = !darkModeEnabled.value
  }

  const handleDarkModeChange = (val) => {
    themeStore.setMode(val ? 'dark' : 'light')
  }

  onMounted(() => {
    themeStore.initTheme()
    themeStore.initSettings()
    userStore.init()
    // 每分钟检查一次时间（如果模式是 auto）
    setInterval(() => {
      if (themeStore.mode === 'auto') {
        themeStore.updateTheme()
      }
    }, 60000) // 每分钟检查一次
  })
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  /* 背景色固定，不再随主题切换改变，使用背景图 */
  background: transparent;
  color: var(--text-primary);
  transition: color 0.3s ease;
  position: relative;
}

/* 顶部导航栏 */
.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  z-index: 1000;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.navbar-content {
  max-width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-toggle-btn {
  color: var(--text-primary);
  padding: 4px 8px;
  font-size: 20px;
  transition: color 0.3s ease;
}

.menu-toggle-btn:hover {
  color: #ff4500 !important;
}

::v-deep(.el-button.menu-toggle-btn:hover) {
  background-color: transparent;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 20px;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.logo-text {
  font-weight: 700;
}

.navbar-center {
  flex: 1;
  max-width: 600px;
  margin: 0 auto;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
}

:deep(.search-input .el-input__wrapper) {
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 25px;
  box-shadow: none;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

:deep(.search-input .el-input__wrapper:hover) {
  border-color: var(--text-secondary);
}

:deep(.search-input .el-input__inner) {
  color: var(--text-primary);
  transition: color 0.3s ease;
}

.ask-button {
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff !important;
  padding: 8px 16px;
}

.ask-button:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.get-app-btn {
  color: var(--text-primary);
  transition: color 0.3s ease, background-color 0.3s ease;
}

.get-app-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.login-btn {
  background: #ff4500;
  border-color: #ff4500;
  color: #ffffff !important;
  padding: 6px 16px;
}

.login-btn:hover {
  background: #ff6314;
  border-color: #ff6314;
}

.menu-btn {
  color: var(--text-primary);
  padding: 4px;
  transition: color 0.3s ease, background-color 0.3s ease;
}

.menu-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* 用户菜单 */
.user-menu-wrapper {
  position: relative;
  cursor: pointer;
}

.header-avatar {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.header-avatar:hover {
  transform: scale(1.05);
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 240px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  padding: 8px 0;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;
  position: relative;
}

.menu-item:hover {
  background: var(--bg-hover);
}

.menu-item .el-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.menu-item span {
  flex: 1;
}

.menu-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: auto;
  font-weight: normal;
}

.menu-item-with-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dark-mode-switch {
  margin-left: auto;
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
  transition: background-color 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 主布局 */
.main-layout {
  display: flex;
  margin-top: 48px;
  min-height: calc(100vh - 48px);
}

/* 左侧菜单栏 */
.left-sidebar {
  width: 240px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  position: fixed;
  left: 0;
  top: 48px;
  bottom: 0;
  overflow-y: auto;
  z-index: 100;
  scrollbar-width: none;
  transition: width 0.3s ease, background-color 0.3s ease, border-color 0.3s ease;
}

.left-sidebar.collapsed {
  width: 64px;
}

.sidebar-content {
  padding: 16px 0;
  height: 100%;
  width: 90%;
  margin: 0 auto;
}

.left-sidebar.collapsed .sidebar-content {
  width: 100%;
  padding: 16px 0;
}

/* Logo区域 */
.sidebar-logo {
  display: flex;
  flex-direction: column;
  padding: 16px 0 12px 0;
  margin-bottom: 8px;
  position: relative;
}

.logo-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  transition: padding 0.3s ease;
}

.logo-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  transition: opacity 0.3s ease, width 0.3s ease;
  flex: 1;
}

.left-sidebar.collapsed .logo-header {
  justify-content: center;
  padding: 0;
}

.left-sidebar.collapsed .logo-title {
  display: none;
}

.logo-wrapper {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.logo-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  display: block;
  border: 2px solid var(--border-color);
  transition: transform 0.2s ease, border-color 0.3s ease;
}

.logo-image:hover {
  transform: scale(1.05);
}

.logo-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: #ff4500;
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
  z-index: 10;
}

.logo-divider {
  width: 100%;
  height: 1px;
  background: var(--border-color);
  margin-top: 12px;
  transition: background-color 0.3s ease;
}

.left-sidebar.collapsed .sidebar-logo {
  padding: 16px 0 12px 0;
  align-items: center;
}

.left-sidebar.collapsed .logo-image {
  width: 40px;
  height: 40px;
}

.left-sidebar.collapsed .logo-divider {
  width: 80%;
  margin: 12px auto 0;
}

/* Element Plus Menu 样式 */
.sidebar-menu {
  border: none;
  background: transparent;
}

:deep(.sidebar-menu .el-menu-item),
:deep(.sidebar-menu .el-sub-menu__title) {
  height: 40px;
  line-height: 40px;
  color: var(--text-primary);
  transition: background-color 0.2s, color 0.3s ease;
  padding: 0 16px !important;
  margin: 0;
}

:deep(.sidebar-menu .el-menu-item:hover),
:deep(.sidebar-menu .el-sub-menu__title:hover) {
  background: var(--bg-hover);
}

:deep(.sidebar-menu .el-menu-item.is-active) {
  background: var(--bg-hover);
  border-left: 3px solid #ff4500;
  font-weight: 600;
  color: var(--text-primary);
}

.left-sidebar.collapsed :deep(.sidebar-menu .el-menu-item.is-active) {
  border-left: none;
  border-radius: 8px;
}

:deep(.sidebar-menu .el-menu-item .el-icon),
:deep(.sidebar-menu .el-sub-menu__title .el-icon) {
  font-size: 20px;
  width: 20px;
  height: 20px;
  margin-right: 12px;
}

.left-sidebar.collapsed :deep(.sidebar-menu .el-menu-item .el-icon),
.left-sidebar.collapsed :deep(.sidebar-menu .el-sub-menu__title .el-icon) {
  margin-right: 0;
}

/* 菜单组标题 */
:deep(.sidebar-menu .el-menu-item-group__title) {
  padding: 8px 16px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.3s ease;
  line-height: 1.5;
}

.left-sidebar.collapsed :deep(.sidebar-menu .el-menu-item-group__title) {
  padding: 8px 0;
  justify-content: center;
}

.left-sidebar.collapsed :deep(.sidebar-menu .el-menu-item-group__title .section-header-text) {
  display: none;
}

.left-sidebar.collapsed :deep(.sidebar-menu .el-menu-item-group__title .el-icon) {
  margin: 0;
}

.section-header-text {
  margin-left: 0;
}

/* 菜单项标题样式 */
:deep(.sidebar-menu .el-menu-item span),
:deep(.sidebar-menu .el-menu-item .el-tag) {
  display: inline-flex;
  align-items: center;
}

.left-sidebar.collapsed :deep(.sidebar-menu .el-menu-item span:not(.beta-tag)) {
  display: none;
}

/* Beta 标签 */
.pro-menu-item :deep(.el-menu-item__title) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.menu-item-title {
  flex: 1;
}

.beta-tag {
  margin-left: 8px;
  font-size: 10px;
  padding: 2px 6px;
  flex-shrink: 0;
}

.left-sidebar.collapsed :deep(.sidebar-menu .el-menu-item .beta-tag) {
  display: none;
}

/* 底部菜单项 */
.sidebar-footer-item {
  margin-top: 24px;
  border-top: 1px solid var(--border-color);
  padding-top: 16px !important;
}

.left-sidebar.collapsed .sidebar-footer-item {
  border-top: none;
  padding-top: 0 !important;
}

/* 菜单项间距 */
:deep(.sidebar-menu .el-menu-item-group) {
  margin-bottom: 16px;
}

:deep(.sidebar-menu .el-menu-item-group:last-child) {
  margin-bottom: 0;
}

/* 主内容区域 */
.content-area {
  flex: 1;
  margin-left: 240px;
  /* 背景色固定，不再随主题切换改变，使用背景图 */
  background: transparent;
  min-height: calc(100vh - 48px);
  transition: margin-left 0.3s ease;
  min-width: calc(100vw - 240px);
  max-width: calc(100vw - 64px);
}

.content-area.expanded {
  margin-left: 64px;
}
</style>
