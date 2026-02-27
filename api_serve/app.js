// 导入 express 模块
const express = require('express')
// 创建 express 的服务器实例
const app = express()

const http = require('http')                       
const initSocket = require('./soket/index')

const server = http.createServer(app)    
// write your code here...
// 导入 cors 中间件
const cors = require('cors')
// 将 cors 注册为全局中间件
const corsOptions = {
  origin: [
    'http://localhost:8080',  // 开发环境
    'http://localhost:3000',
    // vue-element-admin 默认开发端口 9528，作为 aniverse 后台管理前端
    'http://localhost:9527'
  ],
  credentials: true,          // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

const path = require('path')
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
// utils/Response.js
class Response {
  constructor (success, message, code = 200, data = null, token = null) {
    this.success = success    // 建议用 success 替代 isSucceed（更通用）
    this.message = message
    this.code = code         // HTTP 状态码
    this.data = data
    this.token = token       // JWT 令牌（可选）
  }
}

// 挂载到 res.cc
app.use((req, res, next) => {
  res.cc = (success, message, code = 200, data = null, token = null) => {
    res.status(code).json(new Response(success, message, code, data, token))
  }
  next()
})

const config = require('./config')

// 解析 token 的中间件
const { expressjwt: expressJWT } = require('express-jwt')

// 使用 .unless({ path: [/^\/api\//] }) 指定哪些接口不需要进行 Token 的身份认证
app.use(
  expressJWT({ 
    secret: config.jwtSecretKey, 
    algorithms: ['HS256'],
    requestProperty: 'user'  // 将解析后的 token 数据放在 req.user 上（兼容旧代码）
  })
    .unless({
      path: [
        /^\/api\/user\/login$/,
        /^\/api\/user\/register$/,
        // 管理员登录接口（公开）
        /^\/api\/admin\/auth\/login$/,
        /^\/api\/admin\/auth\/register$/,
        /^\/api\/category\/list$/,
        /^\/api\/genre\/list$/,
        /^\/api\/genre\/subreddits$/,
        /^\/api\/genre\/recommended$/,
        /^\/api\/genre\/popular$/,
        /^\/api\/subreddit\/list$/,
        /^\/api\/subreddit\/search$/,
        /^\/api\/subreddit\/detail$/,
        /^\/api\/post\/list$/ ,
        /^\/api\/post\/listwu$/,
        /^\/api\/comment\/list$/ ,
        /^\/api\/comment\/top$/ ,
        /^\/api\/comment\/child$/ ,
        /^\/api\/comment\/tree$/ ,
        /^\/api\/post\/GuestPostDetail$/ ,
        /^\/api\/post\/getUserPostDetail$/ ,
        /^\/api\/subreddit\/sortlist$/,
        /^\/api\/vote\/count$/,
        // 商城公开接口（商品 & 分类 & 评价）
        /^\/api\/mall\/products$/,
        /^\/api\/mall\/categories$/,
        /^\/api\/mall\/product\/\d+$/,
        /^\/api\/mall\/reviews$/,
        // 店铺公开接口（店铺列表 & 详情，只允许 GET 免认证）
        { url: /^\/api\/shop$/, methods: ['GET'] },
        { url: /^\/api\/shop\/\d+$/, methods: ['GET'] },
        { url: /^\/api\/shop\/\d+\/products$/, methods: ['GET'] },
        { url: /^\/api\/shop\/\d+\/featured$/, methods: ['GET'] },
        // 众筹公开接口（仅 GET）
        // 注意：这里必须限制 methods，否则 PUT/POST 会被错误地放行，导致 req.user 为空而 500
        { url: /^\/api\/crowdfunding\/projects\/\d+$/, methods: ['GET'] },
        { url: /^\/api\/crowdfunding\/projects\/\d+\/updates$/, methods: ['GET'] },
        { url: /^\/api\/crowdfunding\/projects\/\d+\/comments$/, methods: ['GET'] },
        // 次元库公开接口（查询类接口）
        /^\/api\/media\/list$/,
        /^\/api\/media\/detail\/\d+$/,
        /^\/api\/media\/search$/,
        /^\/api\/media\/\d+\/tags$/,
        /^\/api\/media\/\d+\/genres$/,
        /^\/api\/media\/\d+\/characters$/,
        /^\/api\/media\/\d+\/relations$/,
        /^\/api\/media\/\d+\/trends$/,
        /^\/api\/media\/\d+\/rankings$/,
        /^\/api\/media\/\d+\/synonyms$/,
        /^\/api\/tags\/list$/,
        /^\/api\/tags\/detail\/\d+$/,
        /^\/api\/tags\/\d+\/media$/,
        /^\/api\/characters\/list$/,
        /^\/api\/characters\/detail\/\d+$/,
        /^\/api\/characters\/\d+\/media$/,
        /^\/api\/voice-actors\/list$/,
        /^\/api\/voice-actors\/detail\/\d+$/,
        /^\/api\/voice-actors\/\d+\/characters$/,
        /^\/api\/media-genres\/list$/,
        /^\/api\/media-genres\/detail\/\d+$/,
        /^\/api\/media-genres\/\d+\/media$/,
        // 名场面公开接口（GET）
        { url: /^\/api\/scene-moments\/media\/\d+$/, methods: ['GET'] },
        { url: /^\/api\/scene-moments\/\d+$/, methods: ['GET'] },
        { url: /^\/api\/scene-moments\/\d+\/comments$/, methods: ['GET'] },
        { url: /^\/api\/scene-moments\/search$/, methods: ['GET'] },
        // 名场面上传接口（POST，需要登录）
        { url: /^\/api\/scene-moments\/upload$/, methods: ['POST'] },
        // 同好匹配公开接口（GET）
        { url: /^\/api\/user\/recommendations$/, methods: ['GET'] },
        { url: /^\/api\/user\/similarity\/\d+$/, methods: ['GET'] },
        /^\/uploads(\/.*)?$/
      ]
    })
)


// 导入并注册用户路由模块
app.get('/', (req, res) => {
  res.send('API server is running')
})
const userRouter = require('./router/user')
app.use('/api/user', userRouter)

// 导入并注册用户信息路由模块
const userInfoRouter = require('./router/userinfo')
app.use('/my', userInfoRouter)

//导入分类
const categoryRouter = require('./router/category')
app.use('/api/category', categoryRouter)

//导入分类（genres）
const genreRouter = require('./router/genre')
app.use('/api/genre', genreRouter)

//导入板块模块
const subredditRouter = require('./router/subreddit')
app.use('/api/subreddit',subredditRouter)

//导入帖子模块
const postRouter = require('./router/post')
app.use('/api/post', postRouter)

//导入评论模块
const commentRouter = require('./router/comment')
app.use('/api/comment', commentRouter)

//导入审核模块
const moderationRouter = require('./router/moderation')
app.use('/api/moderation', moderationRouter)

//导入vote
const voteRouter = require('./router/votes')
app.use('/api/vote',voteRouter)

//导入favorite
const favoriteRouter = require('./router/favorite')
app.use('/api/favorite',favoriteRouter)

//导入browse
const browseRouter = require('./router/browse')
app.use('/api/browse',browseRouter)

//导入成员表
const subredditMember = require('./router/subredditMember')
app.use('/api/subredditMember',subredditMember)

const friendRouter   = require('./router/friends')
const chatRoomRouter = require('./router/chatRoom')
const chatRouter     = require('./router/chat')
const mallRouter     = require('./router/mall')
const shopRouter     = require('./router/shop')
const crowdfundingRouter = require('./router/crowdfunding')

// 次元库相关路由
const mediaRouter = require('./router/media')
const tagsRouter = require('./router/tags')
const charactersRouter = require('./router/characters')
const voiceActorsRouter = require('./router/voiceActors')
const mediaGenresRouter = require('./router/mediaGenres')
const sceneMomentsRouter = require('./router/sceneMoments')

app.use('/api/friends',   friendRouter)
app.use('/api/chatroom',  chatRoomRouter)
app.use('/api/chat',      chatRouter)
app.use('/api/mall',      mallRouter)
app.use('/api/shop',      shopRouter)
app.use('/api/crowdfunding', crowdfundingRouter)

// 次元库路由
app.use('/api/media', mediaRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/characters', charactersRouter)
app.use('/api/voice-actors', voiceActorsRouter)
app.use('/api/media-genres', mediaGenresRouter)
app.use('/api/scene-moments', sceneMomentsRouter)

// 同好匹配模块路由
const userInterestRouter = require('./router/userInterest')
const userRecommendationRouter = require('./router/userRecommendation')
app.use('/api/user', userInterestRouter)
app.use('/api/user', userRecommendationRouter)

// 管理员路由
const adminRouter = require('./router/admin')
app.use('/api/admin', adminRouter)




app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.cc(false, '用户名或密码错误', 400)
  }
  if (err.name === 'UnauthorizedError') {
    return res.cc(false, '身份认证失败', 401)
  }
  console.log('错误信息:', err)
  res.cc(false, err.message, 500)
})

const socketInstance = initSocket(server)

// 将 socket 实例挂载到全局，这样其他模块可以访问
global.socketInstance = socketInstance

// 初始化定时任务调度器
const { initScheduler } = require('./scheduler')
initScheduler()

// 调用 app.listen 方法，指定端口号并启动web服务器
server.listen(3000, () => {
  console.log('api server running at http://localhost:3000')
})
