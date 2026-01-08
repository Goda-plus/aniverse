import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue')
  },
  {
    path: '/popular',
    name: 'popular',
    component: () => import('../views/DashboardView.vue')
  },
  {
    path: '/browse',
    name: 'browse',
    component: () => import('../views/BrowseCommunitiesView.vue')
  },
  {
    path: '/all',
    name: 'all',
    component: () => import('../views/PostsView.vue')
  },
  {
    path: '/r/:community',
    name: 'community-posts',
    component: () => import('../views/PostsView.vue')
  },
  {
    path: '/community',
    name: 'community',
    component: () => import('../views/CommunityView.vue')
  },
  {
    path: '/scenes',
    name: 'scenes',
    component: () => import('../views/ScenesView.vue')
  },
  {
    path: '/match',
    name: 'match',
    component: () => import('../views/MatchView.vue')
  },
  {
    path: '/mall',
    name: 'mall',
    component: () => import('../views/MallView.vue')
  },
  {
    path: '/mall/product/:id',
    name: 'product-detail',
    component: () => import('../views/ProductDetailView.vue')
  },
  {
    path: '/mall/cart',
    name: 'shopping-cart',
    component: () => import('../views/ShoppingCartView.vue')
  },
  {
    path: '/mall/checkout',
    name: 'checkout',
    component: () => import('../views/CheckoutView.vue')
  },
  {
    path: '/mall/orders',
    name: 'order-list',
    component: () => import('../views/OrderListView.vue')
  },
  {
    path: '/mall/order/:id',
    name: 'order-detail',
    component: () => import('../views/OrderDetailView.vue')
  },
  {
    path: '/crowd',
    name: 'crowd',
    component: () => import('../views/CrowdView.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue')
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/LoginView.vue')
  },
  {
    path: '/create-post',
    name: 'create-post',
    component: () => import('../views/CreatePostView.vue')
  },
  {
    path: '/r/:community/create-post',
    name: 'create-post-in-community',
    component: () => import('../views/CreatePostView.vue')
  },
  {
    path: '/post/:id',
    name: 'post-detail',
    component: () => import('../views/PostDetailView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
