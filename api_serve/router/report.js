const express = require('express')
const router = express.Router()
const reportHandler = require('../router_handler/report')

router.post('/', reportHandler.submitReport)

module.exports = router
