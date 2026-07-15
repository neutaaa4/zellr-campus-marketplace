// controllers/productController.js
const db = require('../config/db');

// 1. ADD NEW ITEM FOR SALE
exports.createProduct = async (req, res) => {
    // Extract open_to_trades and payment_methods from the frontend payload
    const { seller_id, title, price, category, item_condition, campus, description, image_url, open_to_trades, payment_methods } = req.body;

    // Basic validation check
    if (!seller_id || !title || !price || !category) {
        return res.status(400).json({ error: "Required fields are missing." });
    }

    try {
        // Stringify the array for MySQL storage and enforce strict boolean/integer conversion
        const safePaymentMethods = Array.isArray(payment_methods) ? JSON.stringify(payment_methods) : '["Cash Payment"]';
        const safeTradingMode = (open_to_trades === false || open_to_trades === "false") ? 0 : 1;

        const [result] = await db.query(
            `INSERT INTO products (seller_id, title, price, category, item_condition, campus, description, image_url, open_to_trades, payment_methods) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [seller_id, title, price, category, item_condition, campus, description, image_url || null, safeTradingMode, safePaymentMethods]
        );

        res.status(201).json({
            message: "Item listed successfully!",
            product_id: result.insertId
        });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(500).json({ error: "Failed to list item due to database error." });
    }
};

// 2. FETCH ALL PRODUCTS (Main Feed & Seller Hub Mapping)
exports.getAllProducts = async (req, res) => {
    try {
        // CORRECTION: Combined first_name and last_name fields into seller_name using CONCAT
        const [rows] = await db.query(
            `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as seller_name, u.avatar_url as seller_avatar, u.school as seller_school 
             FROM products p 
             JOIN users u ON p.seller_id = u.id 
             ORDER BY p.created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to retrieve product feed." });
    }
};

// 3. FETCH SINGLE PRODUCT DETAILS
exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        // CORRECTION: Combined first_name and last_name fields into seller_name using CONCAT
        const [rows] = await db.query(
            `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as seller_name, u.email as seller_email, u.avatar_url as seller_avatar 
             FROM products p 
             JOIN users u ON p.seller_id = u.id 
             WHERE p.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Product not found." });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({ error: "Server error retrieving product details." });
    }
};

// 4. UPDATE PRODUCT (Handles the PUT request)
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { title, price, category, item_condition, campus, description, image_url, open_to_trades, payment_methods } = req.body;

    try {
        // Stringify the array for MySQL storage and enforce strict boolean/integer conversion
        const safePaymentMethods = Array.isArray(payment_methods) ? JSON.stringify(payment_methods) : '["Cash Payment"]';
        const safeTradingMode = (open_to_trades === false || open_to_trades === "false") ? 0 : 1;

        await db.query(
            `UPDATE products 
             SET title = ?, price = ?, category = ?, item_condition = ?, campus = ?, description = ?, image_url = ?, open_to_trades = ?, payment_methods = ? 
             WHERE id = ?`,
            [title, price, category, item_condition, campus, description, image_url, safeTradingMode, safePaymentMethods, id]
        );
        res.json({ message: "Product updated successfully!" });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Failed to update product." });
    }
};

// 5. DELETE PRODUCT (Handles the DELETE request)
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({ message: "Product deleted successfully!" });
    } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).json({ error: "Failed to delete product." });
    }
};