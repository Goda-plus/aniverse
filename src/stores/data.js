import { defineStore } from 'pinia'

export const useDataStore = defineStore('data', {
  state: () => ({
    user: {
      name: 'Miku',
      level: 'Lv.5',
      badges: ['社交达人', '场景标注', '众筹支持者'],
      interests: ['机甲', '治愈', '青春校园', '音乐'],
      theme: 'light'
    },
    feed: [
      {
        id: 1,
        author: '桜井玲',
        avatar: 'https://i.pravatar.cc/80?img=11',
        time: '2 小时前',
        tags: ['#孤独摇滚', '#现场'],
        content: '昨晚现场录到波奇最燃的吉他独奏段，分享给大家！',
        images: ['https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=800&q=80'],
        likes: 218,
        liked: false,
        starred: false,
        comments: 42
      },
      {
        id: 2,
        author: 'Rikka',
        avatar: 'https://i.pravatar.cc/80?img=16',
        time: '4 小时前',
        tags: ['#咒术回战', '#台词'],
        content: '“不要把我和你们这些普通人相提并论。”——五条悟真是帅炸！',
        images: [],
        likes: 412,
        liked: true,
        starred: true,
        comments: 88
      }
    ],
    scenes: [
      {
        id: 101,
        title: '“我会守护你的夏日”',
        work: '凉宫春日的消失',
        position: '01:12:33',
        dialog: '长门：谢谢你带我看到冬天的雪。',
        tags: ['治愈', '名场景'],
        cover: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 102,
        title: '波奇舞台初登场',
        work: '孤独摇滚',
        position: '00:09:21',
        dialog: '波奇：虽然害怕，但我想再向前一步！',
        tags: ['音乐', '热血'],
        cover: 'https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=800&q=80'
      }
    ],
    matches: [
      {
        id: 301,
        name: '卡缪',
        reason: '共同喜欢《EVA》与机甲标签',
        similarity: 0.92,
        avatar: 'https://i.pravatar.cc/80?img=19'
      },
      {
        id: 302,
        name: '白银',
        reason: '常浏览你收藏的治愈类作品',
        similarity: 0.84,
        avatar: 'https://i.pravatar.cc/80?img=32'
      }
    ],
    products: [
      {
        id: 501,
        name: '初音未来 2025 EXPO 手办',
        price: 599,
        stock: 25,
        rating: 4.9,
        tags: ['正版', '限定'],
        cover: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 502,
        name: '咒术回战 五条悟眼罩',
        price: 89,
        stock: 120,
        rating: 4.6,
        tags: ['周边', 'COS'],
        cover: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80'
      }
    ],
    cart: [],
    orders: [],
    crowds: [
      {
        id: 701,
        title: '「重返夏日祭」原创主题手账',
        goal: 50000,
        raised: 32800,
        supporters: 622,
        daysLeft: 12,
        cover: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=800&q=80',
        rewards: [
          { name: '明信片套装', amount: 39 },
          { name: '主题手账 + 贴纸', amount: 99 }
        ]
      },
      {
        id: 702,
        title: '独立乐队「电光石火」Live 蓝光',
        goal: 80000,
        raised: 54000,
        supporters: 410,
        daysLeft: 20,
        cover: 'https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=800&q=80',
        rewards: [
          { name: '数字版', amount: 49 },
          { name: '实体蓝光 + 海报', amount: 159 }
        ]
      }
    ]
  }),
  getters: {
    cartTotal: (state) => state.cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
    likedPosts: (state) => state.feed.filter(item => item.liked)
  },
  actions: {
    toggleLike (id) {
      const post = this.feed.find(p => p.id === id)
      if (post) {
        post.liked = !post.liked
        post.likes += post.liked ? 1 : -1
      }
    },
    toggleStar (id) {
      const post = this.feed.find(p => p.id === id)
      if (post) {
        post.starred = !post.starred
      }
    },
    addToCart (product) {
      const item = this.cart.find(i => i.id === product.id)
      if (item) {
        item.quantity += 1
      } else {
        this.cart.push({ ...product, quantity: 1 })
      }
    },
    updateQuantity (id, quantity) {
      const item = this.cart.find(i => i.id === id)
      if (item) {
        item.quantity = Math.max(1, quantity)
      }
    },
    removeCartItem (id) {
      this.cart = this.cart.filter(i => i.id !== id)
    },
    supportCrowd (id, reward) {
      const project = this.crowds.find(c => c.id === id)
      if (project) {
        project.supporters += 1
        project.raised += reward.amount
      }
    }
  }
})



