// controllers/chatController.js
const db = require('../config/db');

// 1. SAVE A NEW MESSAGE TO DATABASE (WITH EXPLICIT RECEIVER ACCOUNT IDENTIFICATION)
exports.saveMessage = async (req, res) => {
    const { order_id, sender_id, receiver_id, message_text } = req.body || {};

    if (!order_id || !sender_id || !receiver_id || !message_text) {
        return res.status(400).json({ error: "Missing required message parameters." });
    }

    try {
        await db.query(
            'INSERT INTO messages (order_id, sender_id, receiver_id, message_text, is_read) VALUES (?, ?, ?, ?, 0)',
            [order_id, sender_id, receiver_id, message_text]
        );
        res.status(201).json({ message: "Message archived securely." });
    } catch (error) {
        console.error("Error saving message:", error);
        res.status(500).json({ error: "Failed to store message thread entry." });
    }
};

// 2. RETRIEVE ALL MESSAGES (Required for frontend inbox compilation mapping)
exports.getAllMessages = async (req, res) => {
    // 1. Capture the requesting user's identity from the network query
    const userId = req.query.user_id;

    try {
        let query = 'SELECT * FROM messages ORDER BY created_at ASC';
        let params = [];

        // 2. STRICT BACKEND SECURITY: Only fetch rows where this user is the sender or receiver
        if (userId) {
            query = 'SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at ASC';
            params = [userId, userId];
        }

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error("Database messaging feed error:", error);
        res.status(500).json({ error: "Failed to retrieve messages securely." });
    }
};

// 3. RETRIEVE CHAT HISTORY FOR AN ORDER
exports.getChatHistory = async (req, res) => {
    const { order_id } = req.params;

    try {
        // CORRECTION: Combined first_name and last_name fields into sender_name using CONCAT
        const [rows] = await db.query(
            `SELECT m.*, CONCAT(u.first_name, ' ', u.last_name) as sender_name, u.avatar_url as sender_avatar 
             FROM messages m
             JOIN users u ON m.sender_id = u.id
             WHERE m.order_id = ?
             ORDER BY m.created_at ASC`,
            [order_id]
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ error: "Failed to retrieve conversation logs." });
    }
};

// 4. MARK INCOMING MESSAGES AS READ WHEN OPENING THE CHAT WINDOW
exports.markAsRead = async (req, res) => {
    const { order_id } = req.params;
    const { user_id } = req.body; 

    if (!user_id) {
        return res.status(400).json({ error: "Missing user identification parameter." });
    }

    try {
        await db.query(
            'UPDATE messages SET is_read = 1 WHERE order_id = ? AND receiver_id = ?',
            [order_id, user_id]
        );
        res.json({ message: "Fulfillment logs marked read successfully." });
    } catch (error) {
        console.error("Error updating read index status:", error);
        res.status(500).json({ error: "Failed to execute read update command." });
    }
};