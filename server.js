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

// Helper: Get Pakistan Time
function getPKTime() {
    return new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"});
}

async function sendMail(to, subject, html) {
    if (!to) return;
    try {
        await transporter.sendMail({ from: '"HR System" <YOUR_EMAIL@gmail.com>', to, subject, html });
        console.log("Email sent to: " + to);
    } catch (err) { console.error("Email Error:", err); }
}

app.use(bodyParser.json());
app.use(express.static('public'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee')`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, message TEXT, date TEXT)`);
    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES ('admin', 'admin123', 'System Admin', 'admin')");
});

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
        const html = `<h2>Welcome ${full_name}!</h2>
                      <p>Your HR account is ready.</p>
                      <p><b>URL:</b> https://hrs.khanammad.com</p>
                      <p><b>Username:</b> ${username}</p>
                      <p><b>Password:</b> ${password}</p>
                      <p>Note: This system follows Pakistan Standard Time.</p>`;
        sendMail(email, "Welcome to HR Portal", html);
        res.json({ message: "Employee created and welcome email sent!" });
    });
});

app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const pkTime = getPKTime();
    db.get("SELECT email, full_name FROM users WHERE id = ?", [userId], (err, user) => {
        db.run("INSERT INTO attendance (user_id, type, lat, lon, time) VALUES (?, ?, ?, ?, ?)", 
        [userId, type, lat, lon, pkTime], () => {
            if (user?.email) {
                sendMail(user.email, `Attendance Alert: ${type}`, 
                `<p>Hi ${user.full_name},</p><p>You marked <b>${type}</b> at <b>${pkTime}</b> (PKT).</p>`);
            }
            res.json({ success: true, time: pkTime });
        });
    });
});

app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY id DESC", (err, rows) => {
        res.json(rows || []);
    });
});

app.listen(PORT, '127.0.0.1', () => console.log(`HRMS Server Live on Port ${PORT} (Pakistan Time)`));
