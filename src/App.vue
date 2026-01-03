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
            
            <div class="navigation-section">
              <div class="nav-item" :class="{ active: active === '/' }" @click="$router.push('/')">
                <el-icon><House /></el-icon>
                <span>主页</span>
              </div>
              <div class="nav-item" :class="{ active: active === '/popular' }" @click="$router.push('/popular')">
                <el-icon><ArrowUp /></el-icon>
                <span>受欢迎</span>
              </div>
              <div class="nav-item" :class="{ active: active === '/browse' }" @click="$router.push('/browse')">
                <el-icon><UserFilled /></el-icon>
                <span>浏览</span>
              </div>
            </div>

            <div class="resources-section">
              <div class="section-header">
                <span>资源</span>
              </div>
              <div class="nav-item">
                <el-icon><InfoFilled /></el-icon>
                <span>关于 AniVerse</span>
              </div>
              <div class="nav-item">
                <el-icon><Promotion /></el-icon>
                <span>广告</span>
              </div>
              <div class="nav-item">
                <el-icon><Tools /></el-icon>
                <span>开发者平台</span>
              </div>
              <div class="nav-item">
                <el-icon><Star /></el-icon>
                <span>AniVerse Pro</span>
                <el-tag size="small" type="danger" effect="plain" class="beta-tag">
                  测试版
                </el-tag>
              </div>
              <div class="nav-item">
                <el-icon><QuestionFilled /></el-icon>
                <span>帮助</span>
              </div>
              <div class="nav-item">
                <el-icon><Document /></el-icon>
                <span>博客</span>
              </div>
              <div class="nav-item">
                <el-icon><Briefcase /></el-icon>
                <span>职业</span>
              </div>
              <div class="nav-item">
                <el-icon><Bell /></el-icon>
                <span>新闻</span>
              </div>
            </div>

            <div class="communities-section">
              <div class="section-header">
                <el-icon><Globe /></el-icon>
                <span>社区</span>
              </div>
              <div class="nav-item">
                <el-icon><Trophy /></el-icon>
                <span>AniVerse 最佳</span>
              </div>
            </div>

            <div class="sidebar-footer">
              <div class="nav-item">
                <span>AniVerse 规则</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- 主内容区域（包含中间内容和右侧栏） -->
        <main class="content-area" :class="{ expanded: !sidebarVisible }">
          <router-view />
        </main>
      </div>

      <!-- 主题设置 -->
      <ThemeSettings v-model="showThemeSettings" />
    </template>
  </div>
</template>

<script setup>
  import { computed, ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useThemeStore } from '@/stores/theme'
  import { useUserStore } from '@/stores/user'
  import { ElMessageBox } from 'element-plus'
  import ThemeSettings from '@/components/ThemeSettings.vue'
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
  } from '@element-plus/icons-vue'

  const route = useRoute()
  const router = useRouter()
  const keyword = ref('')
  const active = computed(() => route.path)
  const sidebarVisible = ref(true)
  const showThemeSettings = ref(false)
  const showUserMenu = ref(false)
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

.navigation-section,
.resources-section,
.communities-section {
  margin-bottom: 16px;
}

.section-header {
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
  justify-content: center;
}

.left-sidebar.collapsed .section-header {
  padding: 8px 0;
  justify-content: center;
}

.left-sidebar.collapsed .section-header span {
  display: none;
}

.left-sidebar.collapsed .section-header .el-icon {
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s, color 0.3s ease, padding 0.3s ease;
  position: relative;
  justify-content: flex-start;
}

.left-sidebar.collapsed .nav-item {
  padding: 8px 0;
  justify-content: center;
}

.left-sidebar.collapsed .nav-item span {
  display: none;
}

.left-sidebar.collapsed .nav-item .beta-tag {
  display: none;
}

.nav-item:hover {
  background: var(--bg-hover);
}

.nav-item.active {
  background: var(--bg-hover);
  border-left: 3px solid #ff4500;
  font-weight: 600;
}

.left-sidebar.collapsed .nav-item.active {
  border-left: none;
  border-radius: 8px;
  background: var(--bg-hover);
}

.nav-item .el-icon {
  font-size: 20px;
  width: 20px;
  height: 20px;
}

.beta-tag {
  margin-left: auto;
  font-size: 10px;
  padding: 2px 6px;
}

.sidebar-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  transition: border-color 0.3s ease;
}

.left-sidebar.collapsed .sidebar-footer .nav-item {
  justify-content: center;
}

/* 主内容区域 */
.content-area {
  flex: 1;
  margin-left: 240px;
  /* 背景色固定，不再随主题切换改变，使用背景图 */
  background: transparent;
  min-height: calc(100vh - 48px);
  transition: margin-left 0.3s ease;
}

.content-area.expanded {
  margin-left: 64px;
}
</style>
