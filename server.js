const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer'); 
const app = express();

const PORT = 5060;
const db = new sqlite3.Database('./hr_database.db');

// --- EMAIL CONFIGURATION (REPLACE WITH YOUR GMAIL & APP PASSWORD) ---
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
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee', leave_balance INTEGER DEFAULT 20, base_salary REAL DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time TEXT, month TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, reason TEXT, days INTEGER, status TEXT DEFAULT 'Pending', date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, reason TEXT, status TEXT DEFAULT 'Pending', date TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS disbursements (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, month TEXT, amount REAL, date TEXT)`);

    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role, leave_balance) VALUES ('admin', 'admin123', 'System Admin', 'admin', 0)");
});

// --- AUTH & USER ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        res.json(user);
    });
});

app.get('/api/admin/users', (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => res.json(rows || []));
});

// --- LEAVE & LOAN LOGIC ---
app.post('/api/request/leave', (req, res) => {
    const { userId, type, reason, days } = req.body;
    db.run("INSERT INTO leaves (user_id, type, reason, days, date) VALUES (?, ?, ?, ?, ?)", [userId, type, reason, days, getPKTime()], () => res.json({ success: true }));
});

app.post('/api/request/loan', (req, res) => {
    const { userId, amount, reason } = req.body;
    db.run("INSERT INTO loans (user_id, amount, reason, date) VALUES (?, ?, ?, ?)", [userId, amount, reason, getPKTime()], () => res.json({ success: true }));
});

app.get('/api/admin/requests', (req, res) => {
    db.all("SELECT 'leave' as category, l.id, l.user_id, l.type, l.reason, l.days as val, l.status, u.full_name FROM leaves l JOIN users u ON l.user_id = u.id WHERE l.status = 'Pending' UNION SELECT 'loan' as category, lo.id, lo.user_id, 'Loan' as type, lo.reason, lo.amount as val, lo.status, u.full_name FROM loans lo JOIN users u ON lo.user_id = u.id WHERE lo.status = 'Pending'", (err, rows) => res.json(rows || []));
});

app.post('/api/admin/approve', (req, res) => {
    const { category, id, userId, val, status } = req.body;
    const table = category === 'leave' ? 'leaves' : 'loans';
    db.run(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id], () => {
        if (status === 'Approved' && category === 'leave') {
            db.run("UPDATE users SET leave_balance = leave_balance - ? WHERE id = ?", [val, userId]);
        }
        res.json({ success: true });
    });
});

// --- ATTENDANCE & SALARY ---
app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const pkTime = getPKTime();
    db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, ?, ?, ?, ?)", [userId, type, lat, lon, pkTime, new Date().toLocaleString("en-US", {month: 'long'})], () => res.json({ success: true, time: pkTime }));
});

app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.id DESC", (err, rows) => res.json(rows || []));
});

app.listen(PORT, '127.0.0.1', () => console.log(`LSAF HRMS Live on Port ${PORT}`));
