// routes/chat.js
const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/', chatController.saveMessage);
router.get('/', chatController.getAllMessages);
router.get('/:order_id', chatController.getChatHistory);
router.put('/read/:order_id', chatController.markAsRead); // NEW: Put read status handler route

module.exports = router;