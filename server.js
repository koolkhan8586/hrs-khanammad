const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer'); // 1. Added Nodemailer
const app = express();

const PORT = 5060;
const db = new sqlite3.Database('./hr_database.db');

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'hr@uolcc.edu.pk', // Your Gmail address
        pass: 'vlik dekw mwyn bnhh'     // The 16-character App Password
    }
});

// Helper Function to send email
async function sendMail(to, subject, html) {
    try {
        await transporter.sendMail({ from: '"HR System" <YOUR_EMAIL@gmail.com>', to, subject, html });
        console.log(`Email sent to ${to}`);
    } catch (err) {
        console.error("Email Error:", err);
    }
}

app.use(bodyParser.json());
app.use(express.static('public'));

// --- Database & Routes ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee')`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time DATETIME)`);
    db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, reason TEXT, start_date DATE, status TEXT DEFAULT 'Pending')`);
    db.run(`CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, reason TEXT, status TEXT DEFAULT 'Pending')`);
    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES ('admin', 'admin123', 'System Admin', 'admin')");
});

// CREATE EMPLOYEE (With Welcome Email)
app.post('/api/admin/create-employee', (req, res) => {
    const { username, password, full_name, email } = req.body;
    db.run("INSERT INTO users (username, password, full_name, email, role) VALUES (?, ?, ?, ?, 'employee')", 
    [username, password, full_name, email], function(err) {
        if (err) return res.status(500).json({ error: "User already exists" });
        
        // Send Welcome Email
        const html = `<h2>Welcome ${full_name}!</h2>
                      <p>Your HR account is ready.</p>
                      <p><b>URL:</b> https://hrs.khanmmad.com</p>
                      <p><b>Username:</b> ${username}</p>
                      <p><b>Password:</b> ${password}</p>`;
        sendMail(email, "Welcome to HR Portal", html);
        
        res.json({ message: "Employee created and email sent!" });
    });
});

// MARK ATTENDANCE (With Notification)
app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    db.get("SELECT email, full_name FROM users WHERE id = ?", [userId], (err, user) => {
        db.run("INSERT INTO attendance (user_id, type, lat, lon, time) VALUES (?, ?, ?, ?, ?)", 
        [userId, type, lat, lon, new Date().toISOString()], () => {
            if (user && user.email) {
                sendMail(user.email, `Attendance Alert: ${type}`, `<p>Hi ${user.full_name}, you marked <b>${type}</b> at ${new Date().toLocaleString()}.</p>`);
            }
            res.json({ success: true });
        });
    });
});

// LEAVE REQUEST (Email Confirmation)
app.post('/api/leaves/request', (req, res) => {
    const { userId, type, reason, start_date } = req.body;
    db.get("SELECT email FROM users WHERE id = ?", [userId], (err, user) => {
        db.run("INSERT INTO leaves (user_id, type, reason, start_date) VALUES (?, ?, ?, ?)", [userId, type, reason, start_date], () => {
            sendMail(user.email, "Leave Request Received", `<p>Your request for ${type} on ${start_date} is now Pending admin approval.</p>`);
            res.json({ success: true });
        });
    });
});

// (Keep existing Login, Records, Update-Status, and Export routes here...)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid login" });
        res.json(user);
    });
});

app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY time DESC", (err, rows) => res.json(rows || []));
});

app.listen(PORT, '127.0.0.1', () => console.log("HRMS Server Live with Email on 5060"));
