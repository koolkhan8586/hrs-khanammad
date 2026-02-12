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
        user: 'hr@uolcc.edu.pk', 
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
    db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, days REAL, reason TEXT, status TEXT DEFAULT 'Pending', date TEXT)`);
    
    // Default Admin
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

// --- ATTENDANCE (Dashboard & Log) ---
app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const pkTime = getPKTime();
    db.get("SELECT email, full_name FROM users WHERE id = ?", [userId], (err, user) => {
        db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, ?, ?, ?, ?)", 
        [userId, type, lat, lon, pkTime, new Date().toLocaleString("en-US", {month: 'long'})], () => {
            if (user?.email) sendMail(user.email, `Attendance: ${type}`, `<p>${user.full_name}, you marked ${type} at ${pkTime}.</p>`);
            res.json({ success: true, time: pkTime });
        });
    });
});

app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.id DESC", (err, rows) => res.json(rows || []));
});

// Admin Update/Manual Entry
app.post('/api/admin/attendance/action', (req, res) => {
    const { id, userId, type, time, action } = req.body;
    if (action === 'delete') {
        db.run("DELETE FROM attendance WHERE id = ?", [id], () => res.json({success: true}));
    } else if (action === 'edit') {
        db.run("UPDATE attendance SET type = ?, time = ? WHERE id = ?", [type, time, id], () => res.json({success: true}));
    } else {
        db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, 0, 0, ?, ?)", [userId, type, time, new Date(time).toLocaleString("en-US", {month:'long'})], () => res.json({success: true}));
    }
});

// --- LEAVES ---
app.post('/api/leaves/apply', (req, res) => {
    const { userId, type, days, reason } = req.body;
    db.run("INSERT INTO leaves (user_id, type, days, reason, date) VALUES (?, ?, ?, ?, ?)", [userId, type, days, reason, getPKTime()], () => res.json({success: true}));
});

app.get('/api/admin/leaves', (req, res) => {
    db.all("SELECT l.*, u.full_name, u.email FROM leaves l JOIN users u ON l.user_id = u.id ORDER BY l.id DESC", (err, rows) => res.json(rows || []));
});

app.post('/api/admin/leaves/approve', (req, res) => {
    const { id, userId, status, days, type, email } = req.body;
    db.run("UPDATE leaves SET status = ? WHERE id = ?", [status, id], () => {
        if (status === 'Approved' && type === 'Annual Leave') {
            db.run("UPDATE users SET leave_balance = leave_balance - ? WHERE id = ?", [days, userId]);
        }
        sendMail(email, `Leave ${status}`, `<p>Your ${type} for ${days} days has been ${status}.</p>`);
        res.json({success: true});
    });
});

// --- USER MANAGEMENT ---
app.get('/api/admin/users', (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => res.json(rows || []));
});

app.post('/api/admin/user/save', (req, res) => {
    const { id, username, password, full_name, email, role, leave_balance } = req.body;
    if (id) {
        db.run("UPDATE users SET username=?, full_name=?, email=?, role=?, leave_balance=? WHERE id=?", [username, full_name, email, role, leave_balance, id], () => res.json({success: true}));
    } else {
        db.run("INSERT INTO users (username, password, full_name, email, role, leave_balance) VALUES (?, ?, ?, ?, ?, ?)", [username, password, full_name, email, role, leave_balance], () => {
            sendMail(email, "Welcome to LSAF", `<p>Credentials: ${username} / ${password}</p>`);
            res.json({success: true});
        });
    }
});

app.delete('/api/admin/user/:id', (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({success: true}));
});

app.listen(PORT, '127.0.0.1', () => console.log(`LSAF Live on 5060`));
