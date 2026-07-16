// controllers/orderController.js
const db = require('../config/db');

// 1. INITIATE OR UPGRADE AN ORDER CONTEXT (Handles both Inquiry and Buy Now)
exports.createOrder = async (req, res) => {
    const { product_id, buyer_id, status } = req.body || {};

    if (!product_id || !buyer_id) {
        return res.status(400).json({ error: "Missing product or buyer identification." });
    }

    try {
        // Fetch product information
        const [products] = await db.query('SELECT seller_id, status FROM products WHERE id = ?', [product_id]);
        
        if (products.length === 0) {
            return res.status(404).json({ error: "Product no longer exists." });
        }
        
        // Only enforce block if a user tries to purchase a finalized product
        if (products[0].status === 'sold' && status === 'pending') {
            return res.status(400).json({ error: "This item has already been sold." });
        }

        // Inside createOrder() in controllers/orderController.js
        const sellerId = products[0].seller_id;

        // FIX: Ensure both values are consistently compared as integers to prevent self-purchasing bypasses
        if (parseInt(buyer_id) === parseInt(sellerId)) {
            return res.status(400).json({ error: "You cannot purchase your own listed item." });
        }

        // FIX: Check if an inquiry thread already exists between this buyer and product
        const [existing] = await db.query(
            'SELECT id, status FROM orders WHERE product_id = ? AND buyer_id = ?', 
            [product_id, buyer_id]
        );

        if (existing.length > 0) {
            // If it was just an inquiry and they are now buying, upgrade the status
            if (existing[0].status === 'inquiry' && status === 'pending') {
                await db.query('UPDATE orders SET status = "pending" WHERE id = ?', [existing[0].id]);
                return res.status(200).json({
                    message: "Inquiry conversation upgraded to a formal pending order.",
                    order_id: existing[0].id
                });
            }
            // Otherwise, return the existing ID to prevent duplication
            return res.status(200).json({
                message: "Order context already established.",
                order_id: existing[0].id
            });
        }

        // Insert a clean new record with the requested status ('inquiry' or 'pending')
        const [result] = await db.query(
            'INSERT INTO orders (product_id, buyer_id, seller_id, status) VALUES (?, ?, ?, ?)',
            [product_id, buyer_id, sellerId, status || 'inquiry']
        );

        res.status(201).json({
            message: "Order context logged successfully.",
            order_id: result.insertId
        });
    } catch (error) {
        console.error("Error creating order context:", error);
        res.status(500).json({ error: "Failed to process transaction request." });
    }
};

// 2. COMPLETE ORDER (Buyer clicks "Mark as Received")
exports.completeOrder = async (req, res) => {
    const { order_id } = req.params;

    try {
        // Find the order record to get the associated product_id
        const [orders] = await db.query('SELECT product_id FROM orders WHERE id = ?', [order_id]);
        
        if (orders.length === 0) {
            return res.status(404).json({ error: "Order record not found." });
        }

        const productId = orders[0].product_id;

        // Transaction block: Mark order as completed AND mark product as sold
        // SURGICAL FIX: Flipped string wrappers so MySQL receives single-quoted text literals
        await db.query("UPDATE orders SET status = 'completed' WHERE id = ?", [order_id]);
        await db.query("UPDATE products SET status = 'sold' WHERE id = ?", [productId]);

        res.json({ message: "Purchase finalized! Item marked as sold." });
    } catch (error) {
        console.error("Error completing order:", error);
        res.status(500).json({ error: "Failed to finalize transaction." });
    }
};

// 3. GET AN ACCOUNT'S OUTGOING ORDERS (Items I am buying)
exports.getBuyerOrders = async (req, res) => {
    const { user_id } = req.params;
    try {
        // CORRECTION: Replaced dropped u.name selection with combined string expression values
        const [rows] = await db.query(
            `SELECT o.*, p.title, p.price, p.image_url, CONCAT(u.first_name, ' ', u.last_name) as seller_name 
             FROM orders o
             JOIN products p ON o.product_id = p.id
             JOIN users u ON o.seller_id = u.id
             WHERE o.buyer_id = ?`, [user_id]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching buyer orders:", error);
        res.status(500).json({ error: "Failed to load purchases ledger." });
    }
};

// 4. GET ALL MARKETPLACE ORDERS (Optimized with server-side optional parameter filtering)
exports.getAllOrders = async (req, res) => {
    const { user_id } = req.query; // Intercept optional identity tracker variables

    try {
        let query = `
            SELECT 
                o.*, 
                p.title AS product_title,
                p.price AS product_price,
                p.image_url AS product_image,
                CONCAT(b.first_name, ' ', b.last_name) AS buyer_name, 
                b.avatar_url AS buyer_avatar,
                b.school AS buyer_school,
                CONCAT(s.first_name, ' ', s.last_name) AS seller_name, 
                s.avatar_url AS seller_avatar,
                s.school AS seller_school
            FROM orders o
            JOIN products p ON o.product_id = p.id
            JOIN users b ON o.buyer_id = b.id
            JOIN users s ON o.seller_id = s.id
        `;
        let params = [];

        // SURGICAL FIX: Offload data containment bounds directly to MySQL instead of raw browser runtime processing
        if (user_id) {
            query += ` WHERE o.buyer_id = ? OR o.seller_id = ?`;
            params = [user_id, user_id];
        }

        query += ` ORDER BY o.created_at DESC`;

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching database records via joined relations:", error);
        res.status(500).json({ error: "Failed to retrieve live relational order records." });
    }
};

// 5. UPDATE ORDER STATUS DYNAMICALLY (Handles intermediate steps like 'Ready for Delivery' and 'completed')
exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: "Missing status field in update body." });
    }

    try {
        // Find the order record to see what the product ID is
        const [orders] = await db.query('SELECT product_id FROM orders WHERE id = ?', [id]);
        if (orders.length === 0) {
            return res.status(404).json({ error: "Order record not found." });
        }

        const productId = orders[0].product_id;

        // Perform status modification
        await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

        // Production sync logic: If the order is moved to completed, ensure the product status changes to sold automatically
        // SURGICAL FIX: Aligned lifecycle status sync query with strict MySQL quote standards
        if (status === 'completed') {
            await db.query("UPDATE products SET status = 'sold' WHERE id = ?", [productId]);
        }

        res.json({ message: "Order record modified successfully." });
    } catch (error) {
        console.error("Error changing order state:", error);
        res.status(500).json({ error: "Failed to alter transaction lifecycle status." });
    }
};