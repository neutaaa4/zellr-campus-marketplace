// config/db.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    // FIX: Explicitly parse the port string into an integer base 10
    port: parseInt(process.env.DB_PORT, 10) || 26747,
    user: process.env.DB_USER,
    // FIX: Changed from DB_PASSWORD to match your exact .env key 'DB_PASS'
    password: process.env.DB_PASS, 
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    
    // REQUIRED: Establish a secure SSL handshake with Aiven
    ssl: {
        // FIX: Points to '../ca.pem' since the certificate is in your root folder
        ca: fs.readFileSync(path.join(__dirname, '../ca.pem')),
        rejectUnauthorized: true
    }
});

module.exports = pool;