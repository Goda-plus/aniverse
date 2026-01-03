const express = require('express')
const router  = express.Router()
const h       = require('../router_handler/chatRoom')

router.post('/create',  h.createRoom)
router.get ('/list',    h.listRooms)

module.exports = router
