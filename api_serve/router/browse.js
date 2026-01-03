const express = require('express')
const router = express.Router()
const browseHandler = require('../router_handler/browse')
const expressJoi = require('@escook/express-joi')
const { add_history_schema ,delete_history_schema} = require('../schema/browse')

// 添加或更新历史记录
router.post('/add', expressJoi(add_history_schema), browseHandler.addOrUpdateHistory)

// 获取历史记录
router.get('/list', browseHandler.getBrowseHistory)

// 删除指定记录
router.delete('/delete', expressJoi(delete_history_schema), browseHandler.deleteHistoryItem)

// 清空所有历史
router.delete('/clear', browseHandler.clearAllHistory)

module.exports = router
