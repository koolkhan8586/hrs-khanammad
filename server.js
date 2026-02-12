const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer'); 
const app = express();

const PORT = 5060;
const db = new sqlite3.Database('./hr_database.db');

// --- EMAIL CONFIGURATION (REPLACE THESE) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com', 
        pass: 'YOUR_APP_PASSWORD'     
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
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee', leave_balance INTEGER DEFAULT 20)`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time TEXT, month TEXT)`);
    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role, leave_balance) VALUES ('admin', 'admin123', 'System Admin', 'admin', 0)");
});

// --- USER MANAGEMENT ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid login" });
        res.json(user);
    });
});

app.get('/api/admin/users', (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => res.json(rows || []));
});

app.post('/api/admin/user/create', (req, res) => {
    const { username, password, full_name, email, role, leave_balance } = req.body;
    db.run("INSERT INTO users (username, password, full_name, email, role, leave_balance) VALUES (?, ?, ?, ?, ?, ?)", 
    [username, password, full_name, email, role, leave_balance], (err) => {
        if (err) return res.status(500).json({ error: "Exists" });
        sendMail(email, "Welcome to LSAF", `Your account is ready.\nUser: ${username}\nPass: ${password}`);
        res.json({ success: true });
    });
});

app.post('/api/admin/user/update', (req, res) => {
    const { id, full_name, email, role, leave_balance } = req.body;
    db.run("UPDATE users SET full_name = ?, email = ?, role = ?, leave_balance = ? WHERE id = ?", 
    [full_name, email, role, leave_balance, id], () => res.json({ success: true }));
});

app.delete('/api/admin/user/:id', (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

// --- ATTENDANCE MANAGEMENT ---

app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const pkTime = getPKTime();
    const month = new Date().toLocaleString("en-US", {month: 'long', timeZone: "Asia/Karachi"});
    db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, ?, ?, ?, ?)", 
    [userId, type, lat, lon, pkTime, month], () => res.json({ success: true, time: pkTime }));
});

app.get('/api/admin/records', (req, res) => {
    const { month, userId } = req.query;
    let query = "SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id WHERE 1=1";
    let params = [];
    if(month) { query += " AND a.month = ?"; params.push(month); }
    if(userId) { query += " AND a.user_id = ?"; params.push(userId); }
    query += " ORDER BY a.id DESC";
    db.all(query, params, (err, rows) => res.json(rows || []));
});

app.delete('/api/admin/attendance/:id', (req, res) => {
    db.run("DELETE FROM attendance WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

app.listen(PORT, '127.0.0.1', () => console.log(`LSAF HRMS Live on 5060`));
