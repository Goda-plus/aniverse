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
    path: '/mall/payment/:id',
    name: 'payment',
    component: () => import('../views/PaymentView.vue')
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
    path: '/crowdfunding',
    name: 'crowdfunding',
    component: () => import('../views/CrowdfundingView.vue')
  },
  {
    path: '/crowdfunding/project/:id',
    name: 'crowdfunding-project',
    component: () => import('../views/CrowdfundingProjectView.vue')
  },
  {
    path: '/crowdfunding/create',
    name: 'crowdfunding-create',
    component: () => import('../views/CrowdfundingCreateView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/crowdfunding/edit/:id',
    name: 'crowdfunding-edit',
    component: () => import('../views/CrowdfundingEditView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/crowd',
    name: 'crowd',
    component: () => import('../views/CrowdView.vue')
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    redirect: '/profile/posts',
    children: [
      {
        path: 'overview',
        name: 'profile-overview',
        component: () => import('../views/profile/OverviewTab.vue')
      },
      {
        path: 'posts',
        name: 'profile-posts',
        component: () => import('../views/profile/PostsTab.vue')
      },
      {
        path: 'comments',
        name: 'profile-comments',
        component: () => import('../views/profile/CommentsTab.vue')
      },
      {
        path: 'saved',
        name: 'profile-saved',
        component: () => import('../views/profile/SavedTab.vue')
      },
      {
        path: 'history',
        name: 'profile-history',
        component: () => import('../views/profile/HistoryTab.vue')
      },
      {
        path: 'upvoted',
        name: 'profile-upvoted',
        component: () => import('../views/profile/UpvotedTab.vue')
      },
      {
        path: 'downvoted',
        name: 'profile-downvoted',
        component: () => import('../views/profile/DownvotedTab.vue')
      },
      {
        path: 'communities',
        name: 'profile-communities',
        component: () => import('../views/profile/CommunitiesTab.vue')
      }
    ]
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
  },
  {
    path: '/media-library',
    name: 'media-library',
    component: () => import('../views/MediaLibraryView.vue')
  },
  {
    path: '/pro',
    name: 'favorites',
    component: () => import('../views/FavoriteView.vue')
  },
  {
    path: '/media/:id',
    name: 'media-detail',
    component: () => import('../views/MediaDetailView.vue'),
    redirect: { name: 'media-detail-overview' },
    children: [
      {
        path: 'overview',
        name: 'media-detail-overview',
        component: () => import('../views/mediaDetail/OverviewTab.vue')
      },
      {
        path: 'characters',
        name: 'media-detail-characters',
        component: () => import('../views/mediaDetail/CharactersTab.vue')
      },
      {
        path: 'social',
        name: 'media-detail-social',
        component: () => import('../views/mediaDetail/SocialTab.vue')
      },
      // Staff / Stats tabs removed
    ]
  },
  {
    path: '/character/:id',
    name: 'character-detail',
    component: () => import('../views/CharacterDetailView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
