<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HR Portal - Khan Mmad</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
    <style>
        :root { --sidebar-bg: #ffffff; --main-bg: #f8f9fa; --primary: #27ae60; --text: #2c3e50; --border: #edf2f7; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; display: flex; height: 100vh; background: var(--main-bg); overflow: hidden; }
        
        .sidebar { width: 250px; background: var(--sidebar-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 20px 0; }
        .logo { padding: 0 25px 30px; font-size: 20px; font-weight: bold; color: var(--primary); }
        .nav-item { padding: 12px 25px; cursor: pointer; display: flex; align-items: center; gap: 10px; color: var(--text); border-radius: 0 25px 25px 0; margin-right: 10px; }
        .nav-item:hover, .nav-item.active { background: #f0fdf4; color: var(--primary); }
        
        .content { flex: 1; overflow-y: auto; padding: 30px; }
        .card { background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; }
        
        .hero { background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; padding: 40px; border-radius: 20px; text-align: center; }
        .btn { padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s; }
        .btn-main { background: white; color: var(--primary); font-size: 18px; margin: 10px; }
        .btn-save { background: var(--primary); color: white; }
        .btn-del { background: #e74c3c; color: white; }

        input, select { width: 100%; padding: 10px; margin: 8px 0; border: 1px solid var(--border); border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
        
        #login-screen { position: fixed; inset: 0; background: white; display: flex; align-items: center; justify-content: center; z-index: 9999; }
    </style>
</head>
<body>

    <div id="login-screen">
        <div class="card" style="width: 320px; text-align: center;">
            <h2 style="color:var(--primary)">HR Portal</h2>
            <input type="text" id="login_un" placeholder="Username">
            <input type="password" id="login_pw" placeholder="Password">
            <button class="btn btn-save" style="width:100%" onclick="login()">Login</button>
        </div>
    </div>

    <div class="sidebar" id="sidebar" style="display:none;">
        <div class="logo"><i class="fas fa-id-badge"></i> HR Portal</div>
        <div class="nav-item active" onclick="showSection('attendance')"><i class="fas fa-clock"></i> Attendance</div>
        <div class="nav-item" id="admin-nav" style="display:none;" onclick="showSection('admin')"><i class="fas fa-users-cog"></i> User Management</div>
        <div class="nav-item" onclick="logout()" style="margin-top:auto;"><i class="fas fa-sign-out-alt"></i> Logout</div>
    </div>

    <div class="content" id="content" style="display:none;">
        <div id="attendance-section" class="section">
            <div class="hero">
                <h1 id="clock">00:00:00</h1>
                <p id="date">Date Loading...</p>
                <button class="btn btn-main" onclick="handleClock('Check-In')">Clock In</button>
                <button class="btn btn-main" onclick="handleClock('Check-Out')">Clock Out</button>
            </div>
            <div id="map" style="height:400px; margin-top:25px; border-radius:15px;"></div>
        </div>

        <div id="admin-section" class="section" style="display:none;">
            <div class="card">
                <h3>Create New Employee</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="text" id="new_name" placeholder="Full Name">
                    <input type="email" id="new_email" placeholder="Email">
                    <input type="text" id="new_un" placeholder="Username">
                    <input type="password" id="new_pw" placeholder="Password">
                </div>
                <button class="btn btn-save" onclick="createUser()">Add Employee</button>
            </div>

            <div class="card">
                <h3>Manage Employees</h3>
                <table id="userTable">
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        let map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        let currentUser = JSON.parse(localStorage.getItem('user'));
        let marker;

        setInterval(() => {
            const now = new Date();
            document.getElementById('clock').innerText = now.toLocaleTimeString('en-GB');
            document.getElementById('date').innerText = now.toDateString();
        }, 1000);

        if(currentUser) initApp();

        function login() {
            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: login_un.value, password: login_pw.value })
            }).then(res => res.json()).then(user => {
                if(user.error) return alert(user.error);
                localStorage.setItem('user', JSON.stringify(user));
                location.reload();
            });
        }

        function initApp() {
            login_screen.style.display = 'none';
            sidebar.style.display = 'flex';
            content.style.display = 'block';
            if(currentUser.role === 'admin') admin_nav.style.display = 'flex';
            
            navigator.geolocation.getCurrentPosition(pos => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 15);
                marker = L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(map);
            });
            setTimeout(() => map.invalidateSize(), 400);
        }

        function showSection(id) {
            document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            document.getElementById(id + '-section').style.display = 'block';
            event.currentTarget.classList.add('active');
            if(id === 'admin') loadUsers();
            if(id === 'attendance') setTimeout(() => map.invalidateSize(), 200);
        }

        function handleClock(type) {
            navigator.geolocation.getCurrentPosition(pos => {
                fetch('/api/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUser.id, type, lat: pos.coords.latitude, lon: pos.coords.longitude })
                }).then(res => res.json()).then(d => alert(`${type} marked at ${d.time}`));
            });
        }

        function loadUsers() {
            fetch('/api/admin/users').then(r => r.json()).then(data => {
                const tbody = document.querySelector('#userTable tbody');
                tbody.innerHTML = data.map(u => `
                    <tr>
                        <td>${u.full_name}</td>
                        <td>${u.email}</td>
                        <td>${u.role}</td>
                        <td>
                            <button class="btn btn-del" onclick="deleteUser(${u.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            });
        }

        function createUser() {
            const data = { full_name: new_name.value, email: new_email.value, username: new_un.value, password: new_pw.value, role: 'employee' };
            fetch('/api/admin/user/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(() => { alert("Employee Created!"); loadUsers(); });
        }

        function deleteUser(id) {
            if(confirm("Delete this employee?")) {
                fetch(`/api/admin/user/${id}`, { method: 'DELETE' }).then(() => loadUsers());
            }
        }

        function logout() { localStorage.clear(); location.reload(); }
    </script>
</body>
</html>
