const express = require('express')
const publicOrderController = require('../controllers/publicOrderController')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

router.get('/my', authenticateToken, publicOrderController.getMyOrders)
router.post('/', authenticateToken, publicOrderController.create)

module.exports = router
