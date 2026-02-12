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
    auth: { user: 'hr@uolcc.edu.pk', pass: 'vlik dekw mwyn bnhh' }
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

// --- API ROUTES ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid" });
        res.json(user);
    });
});

// User Save (Fixed 404 Route)
app.post('/api/admin/user/save', (req, res) => {
    const { id, username, password, full_name, email, role, leave_balance } = req.body;
    if (id && id !== "") {
        let q = "UPDATE users SET username=?, full_name=?, email=?, role=?, leave_balance=? WHERE id=?";
        let p = [username, full_name, email, role, leave_balance, id];
        if (password && password.trim() !== "") {
            q = "UPDATE users SET username=?, full_name=?, email=?, role=?, leave_balance=?, password=? WHERE id=?";
            p = [username, full_name, email, role, leave_balance, password, id];
        }
        db.run(q, p, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    } else {
        db.run("INSERT INTO users (username, password, full_name, email, role, leave_balance) VALUES (?, ?, ?, ?, ?, ?)", [username, password, full_name, email, role, leave_balance], (err) => {
            if (err) return res.status(500).json({ error: "Exists" });
            res.json({ success: true });
        });
    }
});

app.get('/api/admin/users', (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => res.json(rows || []));
});

app.delete('/api/admin/user/:id', (req, res) => {
    db.run("DELETE FROM users WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

// Attendance & Manual Action
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

app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const pkTime = getPKTime();
    const month = new Date().toLocaleString("en-US", {month: 'long', timeZone: "Asia/Karachi"});
    db.run("INSERT INTO attendance (user_id, type, lat, lon, time, month) VALUES (?, ?, ?, ?, ?, ?)", [userId, type, lat, lon, pkTime, month], () => res.json({ success: true, time: pkTime }));
});

// Leaves
app.get('/api/admin/leaves', (req, res) => {
    db.all("SELECT l.*, u.full_name, u.email FROM leaves l JOIN users u ON l.user_id = u.id ORDER BY l.id DESC", (err, rows) => res.json(rows || []));
});

app.post('/api/leaves/apply', (req, res) => {
    const { userId, type, start_date, end_date, days, reason } = req.body;
    db.run("INSERT INTO leaves (user_id, type, start_date, end_date, days, reason, date) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, type, start_date, end_date, days, reason, getPKTime()], () => res.json({success: true}));
});

app.post('/api/admin/leaves/action', (req, res) => {
    const { id, userId, status, days, type, email } = req.body;
    db.run("UPDATE leaves SET status = ? WHERE id = ?", [status, id], () => {
        if (status === 'Approved' && type === 'Annual Leave') {
            db.run("UPDATE users SET leave_balance = leave_balance - ? WHERE id = ?", [days, userId]);
        }
        res.json({success: true});
    });
});

app.listen(PORT, '127.0.0.1', () => console.log(`LSAF Server Active on 5060`));
