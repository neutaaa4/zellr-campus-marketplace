// routes/products.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// POST /api/products - List a new item
router.post('/', productController.createProduct);

// GET /api/products - Get all active listings
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Get a single item's details
router.get('/:id', productController.getProductById);

// NEW ROUTES: Connect the frontend to your new controller logic
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;