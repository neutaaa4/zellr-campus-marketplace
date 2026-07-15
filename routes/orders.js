// routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// POST /api/orders - Create a pending order
router.post('/', orderController.createOrder);

// GET /api/orders - Fetch all orders (Required by listings.html and account.html client-side filters)
router.get('/', orderController.getAllOrders);

// PUT /api/orders/:id - Dynamically update status ('Ready for Delivery' or 'completed')
router.put('/:id', orderController.updateOrderStatus);

module.exports = router;