// config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    // Updated fallback to Aiven's active port 17900
    port: parseInt(process.env.DB_PORT, 10) || 17900,
    user: process.env.DB_USER,
    password: process.env.DB_PASS, 
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // Enable SSL encryption while trusting Aiven's certificate chain
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;