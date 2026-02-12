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

app.use(bodyParser.json());
app.use(express.static('public'));

db.serialize(() => {
    // Added leave_balance column (Default 20 days)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT UNIQUE, 
        password TEXT, 
        full_name TEXT, 
        email TEXT, 
        role TEXT DEFAULT 'employee',
        leave_balance INTEGER DEFAULT 20
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, reason TEXT, start_date DATE, end_date DATE, status TEXT DEFAULT 'Pending')`);

    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role, leave_balance) VALUES ('admin', 'admin123', 'System Admin', 'admin', 0)");
});

// --- API ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT id, username, full_name, role, email, leave_balance FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid login" });
        res.json(user);
    });
});

// Admin approves leave and deducts balance
app.post('/api/admin/update-leave', (req, res) => {
    const { leaveId, userId, status, daysToDeduct } = req.body;
    
    db.run("UPDATE leaves SET status = ? WHERE id = ?", [status, leaveId], (err) => {
        if (status === 'Approved') {
            db.run("UPDATE users SET leave_balance = leave_balance - ? WHERE id = ?", [daysToDeduct || 1, userId]);
        }
        res.json({ success: true });
    });
});

app.get('/api/user/stats/:userId', (req, res) => {
    db.get("SELECT leave_balance FROM users WHERE id = ?", [req.params.userId], (err, row) => {
        res.json(row);
    });
});

// (Existing attendance and create-employee routes remain the same)
app.listen(PORT, '127.0.0.1', () => console.log(`HRMS Live on 5060 with Leave Logic`));
