import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import CommunityView from '../views/CommunityView.vue'
import ScenesView from '../views/ScenesView.vue'
import MatchView from '../views/MatchView.vue'
import MallView from '../views/MallView.vue'
import CrowdView from '../views/CrowdView.vue'
import ProfileView from '../views/ProfileView.vue'
import LoginView from '../views/LoginView.vue'
import PostsView from '../views/PostsView.vue'
import CreatePostView from '../views/CreatePostView.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView
  },
  {
    path: '/popular',
    name: 'popular',
    component: DashboardView
  },
  {
    path: '/browse',
    name: 'browse',
    component: DashboardView
  },
  {
    path: '/all',
    name: 'all',
    component: PostsView
  },
  {
    path: '/r/:community',
    name: 'community-posts',
    component: PostsView
  },
  {
    path: '/community',
    name: 'community',
    component: CommunityView
  },
  {
    path: '/scenes',
    name: 'scenes',
    component: ScenesView
  },
  {
    path: '/match',
    name: 'match',
    component: MatchView
  },
  {
    path: '/mall',
    name: 'mall',
    component: MallView
  },
  {
    path: '/crowd',
    name: 'crowd',
    component: CrowdView
  },
  {
    path: '/profile',
    name: 'profile',
    component: ProfileView
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/register',
    name: 'register',
    component: LoginView
  },
  {
    path: '/create-post',
    name: 'create-post',
    component: CreatePostView
  },
  {
    path: '/r/:community/create-post',
    name: 'create-post-in-community',
    component: CreatePostView
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
