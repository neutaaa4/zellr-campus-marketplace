// server.js
require('dotenv').config(); // MUST BE LINE 1

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./config/db');
const app = express();
const server = http.createServer(app);

// CORS Policy Matrix whitelisting explicit platform interaction blocks
const trustedPlatformOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://zellr-campus-marketplace.vercel.app"
];

const corsConfigurationSettings = {
    origin: function (origin, callback) {
        // Allows serverless environments and local script testing configurations
        if (!origin || trustedPlatformOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error("Network security violation: Origin blocked by Zellr CORS Engine."));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
};

const io = new Server(server, {
    cors: {
        origin: trustedPlatformOrigins,
        methods: ["GET", "POST"]
    }
});

// ==========================================
// 1. GLOBAL MIDDLEWARES (MUST BE FIRST)
// ==========================================
app.use(cors(corsConfigurationSettings));

// NEW: Required to prevent Google SSO "Continue with Google" popups from crashing
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public')); // Serve Tailwind build files here later

// ==========================================
// 2. ROUTE DEFINITIONS
// ==========================================
// Link Router Maps
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');
const ratingRoutes = require('./routes/ratings'); // NEW: Require the rating routes

// Initialize API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/ratings', ratingRoutes);

// ---------------------------------------------------------
// NEW: Public Profile Fetcher for seller.html
// ---------------------------------------------------------
app.get('/api/users/public/:id', async (req, res) => {
    try {
        // FIX: Replaced dropped 'name' column with CONCAT to prevent database crashes
        const [rows] = await db.query(
            `SELECT 
                id, 
                CONCAT(first_name, ' ', last_name) as name, 
                first_name, 
                last_name, 
                avatar_url as avatar, 
                school 
             FROM users 
             WHERE id = ?`, 
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(rows[0]);
    } catch (error) {
        console.error("Public Profile Fetcher Error:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// Basic Test Route
app.get('/api', (req, res) => {
    res.json({ message: "Welcome to Zellr API Engine." });
});

// Append this route alongside the other public lookups inside server.js:
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, first_name, last_name, email, avatar_url, school, role FROM users');
        res.json(rows);
    } catch (error) {
        console.error("Database user catalog fetch failure:", error);
        res.status(500).json({ error: "Failed to collect user registry list." });
    }
});

// ==========================================
// 3. REAL-TIME WEBSOCKETS CHAT LOGIC
// ==========================================
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific transaction/order room chat thread
    socket.on('join_room', (orderId) => {
        socket.join(`room_${orderId}`);
        console.log(`Socket ${socket.id} joined thread room_${orderId}`);
    });

    // Handle sending a new message
    socket.on('send_message', (data) => {
        // data = { order_id, sender_id, message_text }
        io.to(`room_${data.order_id}`).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// ==========================================
// 4. DATABASE HANDSHAKE & SERVER BOOT
// ==========================================
const PORT = process.env.PORT || 3000;

db.query('SELECT 1')
    .then(() => {
        console.log('✅ Success: Node.js can talk to your MySQL Database!');
    })
    .catch((err) => {
        console.error('❌ Error: Database connection failed!');
        console.error(err.message);
    });

server.listen(PORT, () => {
    console.log(`Zellr core operational on port ${PORT}`);
});