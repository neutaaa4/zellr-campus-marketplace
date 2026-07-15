// controllers/ratingController.js
const db = require('../config/db');

// 1. SUBMIT A NEW SELLER RATING
exports.createRating = async (req, res) => {
    const { order_id, seller_id, rating, comment } = req.body || {};

    // Block submission if core values are missing
    if (!order_id || !seller_id || !rating) {
        return res.status(400).json({ error: "Missing required rating parameters." });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO ratings (order_id, seller_id, rating, comment) VALUES (?, ?, ?, ?)',
            [order_id, seller_id, rating, comment || null]
        );
        
        res.status(201).json({ 
            message: "Rating saved successfully.", 
            rating_id: result.insertId 
        });
    } catch (error) {
        console.error("Error saving seller rating:", error);
        res.status(500).json({ error: "Failed to store rating in the database." });
    }
};

// 2. FETCH ALL RATINGS (Required for the Account UI computation)
exports.getAllRatings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM ratings ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error("Error fetching ratings ledger:", error);
        res.status(500).json({ error: "Failed to retrieve marketplace ratings." });
    }
};