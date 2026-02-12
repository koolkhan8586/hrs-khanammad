const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer'); 
const app = express();

const PORT = 5060;
const db = new sqlite3.Database('./hr_database.db');

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hr@uolc.edu.pk', 
        pass: 'vlik dekw mwyn bnhh'     
    }
});

function getPKTime() {
    return new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"});
}

async function sendMail(to, subject, html) {
    if (!to) return;
    try {
        await transporter.sendMail({ from: '"LSAF HR System" <YOUR_EMAIL@gmail.com>', to, subject, html });
    } catch (err) { console.error("Email Error:", err); }
}

app.use(bodyParser.json({limit: '10mb'}));
app.use(express.static('public'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee', leave_balance REAL DEFAULT 20)`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time TEXT, month TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, start_date TEXT, end_date TEXT, days REAL, reason TEXT, status TEXT DEFAULT 'Pending', date TEXT)`);
    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role, leave_balance) VALUES ('admin', 'admin123', 'System Admin', 'admin', 0)");
});

// --- AUTH ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        res.json(user);
    });
});

// --- ATTENDANCE & FILTERS ---
app.get('/api/admin/records', (req, res) => {
    const { month, userId } = req.query;
    let query = "SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id WHERE 1=1";
    let params = [];
    if (month) { query += " AND a.month = ?"; params.push(month); }
    if (userId) { query += " AND a.user_id = ?"; params.push(userId); }
    db.all(query + " ORDER BY a.id DESC", params, (err, rows) => res.json(rows || []));
});

app.post('/api/admin/attendance/action', (req, res) => {
    const { id, userId, type, time, action } = req.body;
    if (action === 'delete') {
        db.run("DELETE FROM attendance WHERE id = ?", [id], () => res.json({success: true}));
    } else if (action === 'edit') {
        db.run("UPDATE attendance SET type = ?, time = ? WHERE id = ?", [type, time, id], () => res.json({success: true}));
    } else if (action === 'manual') {
        const m = new Date(time).toLocaleString("en-US", {month:'long'});
        db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, 0, 0, ?, ?)", [userId, type, time, m], () => res.json({success: true}));
    }
});

// --- USER MANAGEMENT (FIXED SAVE LOGIC) ---
app.get('/api/admin/users', (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => res.json(rows || []));
});

app.post('/api/admin/user/save', (req, res) => {
    const { id, username, password, full_name, email, role, leave_balance } = req.body;
    if (id) {
        // Update existing user
        let query = "UPDATE users SET username=?, full_name=?, email=?, role=?, leave_balance=? WHERE id=?";
        let params = [username, full_name, email, role, leave_balance, id];
        
        // Update password only if a new one is provided
        if (password && password.trim() !== "") {
            query = "UPDATE users SET username=?, full_name=?, email=?, role=?, leave_balance=?, password=? WHERE id=?";
            params = [username, full_name, email, role, leave_balance, password, id];
        }
        
        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        // Create new user
        db.run("INSERT INTO users (username, password, full_name, email, role, leave_balance) VALUES (?, ?, ?, ?, ?, ?)", 
        [username, password, full_name, email, role, leave_balance], function(err) {
            if (err) return res.status(500).json({ error: "User exists" });
            sendMail(email, "Welcome to LSAF", `<p>Credentials: ${username} / ${password}</p>`);
            res.json({ success: true });
        });
    }
});

app.post('/api/admin/user/import', (req, res) => {
    const users = req.body;
    const stmt = db.prepare("INSERT OR IGNORE INTO users (username, password, full_name, email, role, leave_balance) VALUES (?, ?, ?, ?, ?, ?)");
    users.forEach(u => stmt.run(u.username, u.password, u.full_name, u.email, u.role, u.leave_balance));
    stmt.finalize(() => res.json({success: true}));
});

app.delete('/api/admin/user/:id', (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({success: true}));
});

app.listen(PORT, '127.0.0.1', () => console.log(`LSAF Live on 5060`));
