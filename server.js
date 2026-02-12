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
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee', leave_balance INTEGER DEFAULT 20, base_salary REAL DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time TEXT, month TEXT)`);
    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role, leave_balance) VALUES ('admin', 'admin123', 'System Admin', 'admin', 0)");
});

// --- API ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid credentials" });
        res.json(user);
    });
});

// Admin: Mark Attendance for Staff
app.post('/api/admin/attendance/manual', (req, res) => {
    const { userId, type, time } = req.body;
    const month = new Date(time).toLocaleString("en-US", {month: 'long'});
    db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, 0, 0, ?, ?)", 
    [userId, type, time, month], () => res.json({ success: true }));
});

// Admin: Edit Attendance Record
app.post('/api/admin/attendance/update', (req, res) => {
    const { id, type, time } = req.body;
    const month = new Date(time).toLocaleString("en-US", {month: 'long'});
    db.run("UPDATE attendance SET type = ?, time = ?, month = ? WHERE id = ?", [type, time, month, id], () => res.json({ success: true }));
});

// Standard Attendance
app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const pkTime = getPKTime();
    const month = new Date().toLocaleString("en-US", {month: 'long', timeZone: "Asia/Karachi"});
    db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, ?, ?, ?, ?)", 
    [userId, type, lat, lon, pkTime, month], () => res.json({ success: true, time: pkTime }));
});

app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.id DESC", (err, rows) => res.json(rows || []));
});

app.delete('/api/admin/attendance/:id', (req, res) => {
    db.run("DELETE FROM attendance WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

app.get('/api/admin/users', (req, res) => {
    db.all("SELECT id, full_name FROM users WHERE role != 'admin'", (err, rows) => res.json(rows || []));
});

app.listen(PORT, '127.0.0.1', () => console.log(`LSAF Live on 5060`));
