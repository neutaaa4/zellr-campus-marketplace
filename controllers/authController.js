// controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ==========================================
// PIPELINE 1: Google SSO Login Processing 
// ==========================================
exports.verifyGoogleLogin = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ error: "Missing identity token." });
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        
        const payload = ticket.getPayload();
        const { sub: googleId, name, email, picture: avatarUrl } = payload;

        // AUTOMATIC OAUTH NAME SPLITTER PIPELINE
        const googleNameParts = name ? name.trim().split(/\s+/) : [];
        const extractedFirstName = googleNameParts[0] || 'Campus';
        const extractedLastName = googleNameParts.slice(1).join(' ') || 'User';

        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        let user = rows[0];

        if (!user) {
            // Brand new account: create it with decoupled structural name variables
            // Brand new account: create it with decoupled structural name variables
            const [result] = await db.query(
                `INSERT INTO users (google_id, first_name, last_name, email, avatar_url, status) VALUES (?, ?, ?, ?, ?, 'Active')`,
                [googleId, extractedFirstName, extractedLastName, email, avatarUrl]
            );
            const [newUserRows] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
            user = newUserRows[0];
        }
        
        else if (!user.google_id) {
            // HYBRID LINK: User registered with email/password first, now logging in with Google. Link it!
            await db.query('UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?', [googleId, avatarUrl, user.id]);
            user.google_id = googleId;
        }

        if (user.status === 'Suspended') {
            return res.status(403).json({ error: "Access Denied. This account has been suspended." });
        }

        const appSessionToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET, 
            { expiresIn: '30d' }
        );

        return res.json({
            message: "Authentication successful",
            token: appSessionToken,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                // FALLBACK MAPPING: Keeps legacy frontend dashboards functional without code pollution
                name: `${user.first_name} ${user.last_name}`.trim(),
                email: user.email,
                avatar: user.avatar_url,
                school: user.school || "University",
                role: user.role
            }
        });

    } catch (error) {
        console.error("Google Authentication Failure:", error);
        return res.status(401).json({ error: "Invalid Google credential token." });
    }
};

// ==========================================
// PIPELINE 2: Standard Password Form Handling (With Hybrid Detection)
// ==========================================
exports.verifyPasswordLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Please provide both credentials fields." });
    }

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password credentials." });
        }

        // HYBRID DETECTOR: Account exists via Google SSO but has no local password initialized
        if (user.google_id && !user.password_hash) {
            return res.status(401).json({ 
                error: "You signed up using Google. Please click the 'Continue with Google' button above to log in!" 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password credentials." });
        }

        if (user.status === 'Suspended') {
            return res.status(403).json({ error: "Access Denied. This account has been suspended." });
        }

        const appSessionToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return res.json({
            message: "Login successful",
            token: appSessionToken,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                // FALLBACK MAPPING: Keeps legacy frontend dashboards functional without code pollution
                name: `${user.first_name} ${user.last_name}`.trim(),
                email: user.email,
                avatar: user.avatar_url,
                school: user.school || "University",
                role: user.role
            }
        });

    } catch (error) {
        console.error("Internal Standard Authentication failure:", error);
        return res.status(500).json({ error: "Server encountered error during processing pipeline logic." });
    }
};

// ==========================================
// PIPELINE 3: Standard Registration (With Seamless Auto-Linking)
// ==========================================
exports.registerUser = async (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: "All profile registration fields are required." });
    }

    try {
        const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (existingUsers.length > 0) {
            const user = existingUsers[0];

            // HYBRID AUTO-LINK: User signed up with Google before, now setting a local password
            if (user.google_id && !user.password_hash) {
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
                
                return res.status(200).json({ 
                    message: "Account linked! Your Google account can now also log in using this password." 
                });
            }

            // Fallback: It's an actual duplicate traditional account registration
            return res.status(409).json({ error: "An account with this email address already exists." });
        }

        // Clean Path: Brand new account registration
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // FINAL REFACTOR: Capitalized 'User' to match your MySQL ENUM schema, and cleared duplicate return strings
        const [result] = await db.query(
            "INSERT INTO users (first_name, last_name, email, password_hash, status, role) VALUES (?, ?, ?, ?, 'Active', 'User')",
            [firstName, lastName, email, passwordHash]
        );

        return res.status(201).json({ 
            message: "User account registered successfully.",
            userId: result.insertId 
        });

    } catch (error) {
        console.error("Internal Registration pipeline failure:", error);
        return res.status(500).json({ error: "Server encountered an error while processing registration." });
    }
};

// ==========================================
// PIPELINE 4: Update User Profile Matrix Data (Decoupled Layout Variant)
// ==========================================
exports.updateProfile = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, name, school, avatar_url } = req.body;

    try {
        let finalFirstName = firstName;
        let finalLastName = lastName;

        // Fallback: If legacy code sends a combined "name" string, split it on the fly
        if (!finalFirstName && name) {
            const nameParts = name.trim().split(/\s+/);
            finalFirstName = nameParts[0];
            finalLastName = nameParts.slice(1).join(' ');
        }

        // FIX: Target split fields instead of dropped name column
        await db.query(
            'UPDATE users SET first_name = ?, last_name = ?, school = ?, avatar_url = ? WHERE id = ?',
            [finalFirstName || 'Campus', finalLastName || 'User', school, avatar_url, id]
        );
        
        return res.json({ message: "Profile updated cleanly inside the database!" });
    } catch (error) {
        console.error("Database profile update execution error:", error);
        return res.status(500).json({ error: "Failed to save profile changes to database." });
    }
};