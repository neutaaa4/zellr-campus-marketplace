// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Clean endpoints to map perfectly with app.use('/api/auth')
router.post('/google', authController.verifyGoogleLogin);
router.post('/login', authController.verifyPasswordLogin);
router.post('/register', authController.registerUser); 

// NEW PUT ROUTE: Listens for profile updates at /api/auth/profile/:id
router.put('/profile/:id', authController.updateProfile);

module.exports = router;