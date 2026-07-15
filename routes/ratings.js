// routes/ratings.js
const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

// POST /api/ratings - Create a new rating
router.post('/', ratingController.createRating);

// GET /api/ratings - Retrieve all ratings
router.get('/', ratingController.getAllRatings);

module.exports = router;