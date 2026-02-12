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

// Helper: Get Pakistan Time String
function getPKTime() {
    return new Date().toLocaleString("en-US", {timeZone: "Asia/Karachi"});
}

async function sendMail(to, subject, html) {
    if (!to) return;
    try {
        await transporter.sendMail({ from: '"HR System" <YOUR_EMAIL@gmail.com>', to, subject, html });
    } catch (err) { console.error("Email Error:", err); }
}

app.use(bodyParser.json());
app.use(express.static('public'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, email TEXT, role TEXT DEFAULT 'employee')`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time TEXT)`);
    // New Table: Payslips
    db.run(`CREATE TABLE IF NOT EXISTS payslips (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, month TEXT, salary REAL, bonus REAL, deductions REAL, net_pay REAL, date TEXT)`);
    
    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES ('admin', 'admin123', 'System Admin', 'admin')");
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid login" });
        res.json(user);
    });
});

app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const pkTime = getPKTime();
    db.get("SELECT email, full_name FROM users WHERE id = ?", [userId], (err, user) => {
        db.run("INSERT INTO attendance (user_id, type, lat, lon, time) VALUES (?, ?, ?, ?, ?)", 
        [userId, type, lat, lon, pkTime], () => {
            if (user?.email) {
                sendMail(user.email, `Attendance Alert: ${type}`, `<p>Hi ${user.full_name},</p><p>You marked <b>${type}</b> at <b>${pkTime}</b> (PKT).</p>`);
            }
            res.json({ success: true, time: pkTime });
        });
    });
});

// Admin: Generate Payslip
app.post('/api/admin/generate-payslip', (req, res) => {
    const { userId, month, salary, bonus, deductions } = req.body;
    const net = (parseFloat(salary) + parseFloat(bonus)) - parseFloat(deductions);
    db.run("INSERT INTO payslips (user_id, month, salary, bonus, deductions, net_pay, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [userId, month, salary, bonus, deductions, net, getPKTime()], () => res.json({ success: true }));
});

// Employee: View Payslips
app.get('/api/payslips/:userId', (req, res) => {
    db.all("SELECT * FROM payslips WHERE user_id = ? ORDER BY id DESC", [req.params.userId], (err, rows) => res.json(rows || []));
});

app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY id DESC", (err, rows) => res.json(rows || []));
});

app.listen(PORT, '127.0.0.1', () => console.log(`HRMS running on 5060 (PKT)`));
