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
        user: 'hr@uolcc.edu.pk', 
        pass: 'vlik dekw mwyn bnhh'     
    }
});

async function sendMail(to, subject, html) {
    try {
        await transporter.sendMail({ from: '"HR System" <YOUR_EMAIL@gmail.com>', to, subject, html });
    } catch (err) { console.error("Email Error:", err); }
}

app.use(bodyParser.json());
app.use(express.static('public'));

// --- Database Tables ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee')`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time DATETIME)`);
    db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, reason TEXT, start_date DATE, status TEXT DEFAULT 'Pending')`);
    db.run(`CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, reason TEXT, status TEXT DEFAULT 'Pending')`);
    db.run(`CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, message TEXT, date DATETIME)`);

    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES ('admin', 'admin123', 'System Admin', 'admin')");
});

// --- API Routes ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid login" });
        res.json(user);
    });
});

app.post('/api/admin/create-employee', (req, res) => {
    const { username, password, full_name, email } = req.body;
    db.run("INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, 'employee')", 
    [username, password, full_name, email], function(err) {
        if (err) return res.status(500).json({ error: "User already exists" });
        const html = `<h2>Welcome ${full_name}!</h2><p><b>URL:</b> https://hrs.khanmmad.com<br><b>User:</b> ${username}<br><b>Pass:</b> ${password}</p>`;
        sendMail(email, "Welcome to HR Portal", html);
        res.json({ message: "Employee created and email sent!" });
    });
});

app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    db.get("SELECT email, full_name FROM users WHERE id = ?", [userId], (err, user) => {
        db.run("INSERT INTO attendance (user_id, type, lat, lon, time) VALUES (?, ?, ?, ?, ?)", 
        [userId, type, lat, lon, new Date().toISOString()], () => {
            if (user?.email) sendMail(user.email, `Attendance: ${type}`, `<p>Hi ${user.full_name}, you marked ${type} at ${new Date().toLocaleString()}.</p>`);
            res.json({ success: true });
        });
    });
});

app.post('/api/admin/announcement', (req, res) => {
    const { title, message } = req.body;
    db.run("INSERT INTO announcements (title, message, date) VALUES (?, ?, ?)", [title, message, new Date().toISOString()], () => {
        db.all("SELECT email FROM users WHERE email IS NOT NULL", (err, users) => {
            users.forEach(u => sendMail(u.email, `New Announcement: ${title}`, `<p>${message}</p>`));
        });
        res.json({ message: "Announcement posted and emailed to all!" });
    });
});

app.get('/api/announcements', (req, res) => {
    db.all("SELECT * FROM announcements ORDER BY date DESC", (err, rows) => res.json(rows));
});

// Other existing list routes
app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY time DESC", (err, rows) => res.json(rows || []));
});
app.get('/api/admin/leaves', (req, res) => {
    db.all("SELECT l.*, u.full_name FROM leaves l JOIN users u ON l.user_id = u.id", (err, rows) => res.json(rows));
});
app.post('/api/leaves/request', (req, res) => {
    const { userId, type, reason, start_date } = req.body;
    db.run("INSERT INTO leaves (user_id, type, reason, start_date) VALUES (?, ?, ?, ?)", [userId, type, reason, start_date], () => res.json({ success: true }));
});

app.listen(PORT, '127.0.0.1', () => console.log("HRMS running on 5060"));
