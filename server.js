const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

const PORT = 5060;
const db = new sqlite3.Database('./hr_database.db');

app.use(bodyParser.json());
app.use(express.static('public'));

// --- Database Initialization ---
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        username TEXT UNIQUE, 
        password TEXT, 
        full_name TEXT, 
        role TEXT DEFAULT 'employee'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id INTEGER, 
        type TEXT, 
        lat REAL, 
        lon REAL, 
        time DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Insert Admin after a short delay to ensure table exists
    setTimeout(() => {
        db.run("INSERT OR IGNORE INTO users (username, password, full_name, role) VALUES ('admin', 'admin123', 'System Admin', 'admin')", (err) => {
            if(!err) console.log("Database Ready. Admin: admin / admin123");
        });
    }, 500);
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT id, username, full_name, role FROM users WHERE username = ? AND password = ?", [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!user) return res.status(401).json({ error: "Invalid username or password" });
        res.json(user);
    });
});

app.post('/api/admin/create-employee', (req, res) => {
    const { username, password, full_name } = req.body;
    db.run("INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, 'employee')", 
    [username, password, full_name], (err) => {
        if (err) return res.status(500).json({ error: "User already exists" });
        res.json({ message: "Employee created!" });
    });
});

app.post('/api/attendance', (req, res) => {
    const { userId, type, lat, lon } = req.body;
    const now = new Date().toISOString();
    db.run("INSERT INTO attendance (user_id, type, lat, lon, time) VALUES (?, ?, ?, ?, ?)", 
    [userId, type, lat, lon, now], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Success" });
    });
});

app.get('/api/admin/records', (req, res) => {
    db.all(`SELECT a.id, u.full_name as username, a.type, a.lat, a.lon, a.time 
            FROM attendance a JOIN users u ON a.user_id = u.id ORDER BY a.time DESC`, (err, rows) => {
        res.json(rows || []);
    });
});

app.delete('/api/admin/attendance/:id', (req, res) => {
    db.run("DELETE FROM attendance WHERE id = ?", [req.params.id], () => res.json({ success: true }));
});

app.get('/api/admin/export', (req, res) => {
    db.all("SELECT u.full_name, a.type, a.time, a.lat, a.lon FROM attendance a JOIN users u ON a.user_id = u.id", (err, rows) => {
        let csv = "Employee,Action,Time,Lat,Lon\n";
        rows.forEach(r => { csv += `"${r.full_name}",${r.type},${r.time},${r.lat},${r.lon}\n`; });
        res.header('Content-Type', 'text/csv').attachment('HR_Report.csv').send(csv);
    });
});

app.listen(PORT, '127.0.0.1', () => console.log(`Listening on Port ${PORT}`));
