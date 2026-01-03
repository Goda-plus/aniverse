const express = require('express')
const router  = express.Router()
const h       = require('../router_handler/chat')

router.get('/history', h.history)
router.post('/send', h.sendMessage)

module.exports = router
