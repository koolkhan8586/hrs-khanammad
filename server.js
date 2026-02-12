const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();

const PORT = 5060;
const db = new sqlite3.Database('./hr_database.db');

app.use(bodyParser.json());
app.use(express.static('public'));

// --- Updated Database Initialization ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, full_name TEXT, role TEXT DEFAULT 'employee')`);
    db.run(`CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, lat REAL, lon REAL, time DATETIME)`);
    
    // New Table: Leaves
    db.run(`CREATE TABLE IF NOT EXISTS leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, reason TEXT, start_date DATE, status TEXT DEFAULT 'Pending')`);
    
    // New Table: Loans
    db.run(`CREATE TABLE IF NOT EXISTS loans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, amount REAL, reason TEXT, status TEXT DEFAULT 'Pending')`);

    db.run("INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES ('admin', 'admin123', 'System Admin', 'admin')");
});

// --- Auth & Attendance (Existing) ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (!user) return res.status(401).json({ error: "Invalid login" });
        res.json(user);
    });
});

app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    db.run("INSERT INTO attendance (user_id, type, lat, lon, time) VALUES (?, ?, ?, ?, ?)", [userId, type, lat, lon, new Date().toISOString()], () => res.json({ success: true }));
});

// --- LEAVE MODULE ---
app.post('/api/leaves/request', (req, res) => {
    const { userId, type, reason, start_date } = req.body;
    db.run("INSERT INTO leaves (user_id, type, reason, start_date) VALUES (?, ?, ?, ?)", [userId, type, reason, start_date], () => res.json({ success: true }));
});

app.get('/api/admin/leaves', (req, res) => {
    db.all("SELECT l.*, u.full_name FROM leaves l JOIN users u ON l.user_id = u.id", (err, rows) => res.json(rows));
});

// --- LOAN MODULE ---
app.post('/api/loans/request', (req, res) => {
    const { userId, amount, reason } = req.body;
    db.run("INSERT INTO loans (user_id, amount, reason) VALUES (?, ?, ?)", [userId, amount, reason], () => res.json({ success: true }));
});

app.get('/api/admin/loans', (req, res) => {
    db.all("SELECT l.*, u.full_name FROM loans l JOIN users u ON l.user_id = u.id", (err, rows) => res.json(rows));
});

// --- ADMIN ACTIONS (Approve/Reject) ---
app.post('/api/admin/update-status', (req, res) => {
    const { table, id, status } = req.body; // table: 'leaves' or 'loans'
    db.run(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id], () => res.json({ success: true }));
});

// (Existing Admin routes: create-employee, records, delete-attendance remain the same...)
app.post('/api/admin/create-employee', (req, res) => {
    const { username, password, full_name } = req.body;
    db.run("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, 'employee')", [username, password, full_name], (err) => {
        if (err) return res.status(500).json({ error: "Exists" });
        res.json({ message: "Created" });
    });
});

app.get('/api/admin/records', (req, res) => {
    db.all("SELECT a.*, u.full_name as username FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY time DESC", (err, rows) => res.json(rows || []));
});

app.listen(PORT, '127.0.0.1', () => console.log("HRMS Server Live on 5060"));
