const express = require('express')
const router  = express.Router()
const h       = require('../router_handler/friends')

router.post('/request',  h.requestFriend)
router.post('/handle',   h.handleRequest)
router.get ('/list',     h.listFriends)
router.get('/pendlist',h.pendingRequests)
router.put('/remark',   h.updateRemark)
router.delete('/friend', h.deleteFriend)

module.exports = router
