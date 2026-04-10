// =============================================
// MY PLACEMENT - Main Application
// =============================================
const API = '/api';
let currentUser = null;

// ---- UTILITIES ----
function toast(msg, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function api(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('mp_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: 'Network error' };
  }
}

function formatSalary(min, max, currency = 'INR') {
  if (!min && !max) return 'Not disclosed';
  const fmt = n => n >= 100000 ? (n / 100000).toFixed(1) + 'L' : (n / 1000).toFixed(0) + 'K';
  if (min && max) return `₹${fmt(min)} - ₹${fmt(max)}`;
  if (min) return `₹${fmt(min)}+`;
  return `Upto ₹${fmt(max)}`;
}

function timeAgo(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function stars(n, max = 5) {
  let s = '';
  for (let i = 1; i <= max; i++) {
    s += `<i class="fas fa-star ${i <= n ? 'text-yellow-400' : 'text-gray-200'}"></i>`;
  }
  return s;
}

function getMatchClass(score) {
  if (score >= 80) return 'match-90';
  if (score >= 50) return 'match-70';
  return 'match-low';
}

function renderSkillTags(skills, removable = false) {
  if (!skills || !skills.length) return '<span class="text-gray-400 text-sm">No skills added</span>';
  return skills.map(s =>
    `<span class="skill-chip">${s}${removable ? `<span class="remove-skill" onclick="removeSkill('${s}')">✕</span>` : ''}</span>`
  ).join('');
}

function statusBadge(status) {
  const labels = {
    applied: 'Applied', shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview', interviewed: 'Interviewed',
    offered: 'Offered', hired: 'Hired', rejected: 'Rejected', withdrawn: 'Withdrawn'
  };
  return `<span class="badge status-${status}">${labels[status] || status}</span>`;
}

function jobTypeBadge(type) {
  const labels = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship', freelance: 'Freelance' };
  return `<span class="job-tag"><i class="fas fa-briefcase"></i>${labels[type] || type}</span>`;
}

function workModeBadge(mode) {
  const labels = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' };
  const icons = { onsite: 'fa-building', remote: 'fa-home', hybrid: 'fa-code-branch' };
  return `<span class="job-tag"><i class="fas ${icons[mode]}"></i>${labels[mode] || mode}</span>`;
}

// ---- MODAL SYSTEM ----
function showModal(id) { document.getElementById(id)?.classList.add('show'); }
function hideModal(id) { document.getElementById(id)?.classList.remove('show'); }
function createModal(id, title, content, size = '') {
  let m = document.getElementById(id);
  if (!m) {
    m = document.createElement('div');
    m.className = 'modal-overlay';
    m.id = id;
    m.onclick = (e) => { if (e.target === m) hideModal(id); };
    document.body.appendChild(m);
  }
  m.innerHTML = `
    <div class="modal-box ${size}">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="hideModal('${id}')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">${content}</div>
    </div>`;
  showModal(id);
}

// ---- LINK CSS ----
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/static/style.css';
document.head.appendChild(link);

// =============================================
// AUTH PAGES
// =============================================
function renderLogin(role = null) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-logo">
          <h1><i class="fas fa-briefcase" style="color:#2563eb"></i> My Placement</h1>
          <p>Smart Job Matching Platform</p>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:24px;background:#f1f5f9;border-radius:12px;padding:4px;">
          <button onclick="switchAuthTab('login')" id="tab-login" class="btn" style="flex:1;font-size:13px;padding:8px;border-radius:8px;background:#2563eb;color:white;">Login</button>
          <button onclick="switchAuthTab('register')" id="tab-register" class="btn" style="flex:1;font-size:13px;padding:8px;border-radius:8px;background:transparent;color:#64748b;">Register</button>
        </div>

        <div id="login-form">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="login-email" class="form-control" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-control" placeholder="Enter password">
          </div>
          <button class="btn btn-primary btn-block" onclick="doLogin()" id="login-btn">
            <i class="fas fa-sign-in-alt"></i> Login
          </button>
          <div style="margin-top:16px;padding:12px;background:#f0f9ff;border-radius:10px;font-size:12px;color:#0369a1;">
            <b>Demo Credentials:</b><br>
            Admin: admin@myplacement.com / admin123<br>
            Employer: hr@techcorp.com / company123<br>
            Employee: rahul@example.com / employee123
          </div>
        </div>

        <div id="register-form" style="display:none">
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button onclick="setRegRole('employer')" id="reg-employer" class="btn btn-outline" style="flex:1;font-size:13px;padding:8px;">
              <i class="fas fa-building"></i> Employer
            </button>
            <button onclick="setRegRole('employee')" id="reg-employee" class="btn btn-outline" style="flex:1;font-size:13px;padding:8px;">
              <i class="fas fa-user"></i> Job Seeker
            </button>
          </div>
          <div class="form-group" id="reg-name-group">
            <label class="form-label" id="reg-name-label">Full Name</label>
            <input type="text" id="reg-name" class="form-control" placeholder="Enter name">
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="reg-email" class="form-control" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="reg-password" class="form-control" placeholder="Min 6 characters">
          </div>
          <input type="hidden" id="reg-role" value="employee">
          <button class="btn btn-primary btn-block" onclick="doRegister()" id="reg-btn">
            <i class="fas fa-user-plus"></i> Create Account
          </button>
        </div>
      </div>
    </div>`;
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
  document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tab-login').style.background = isLogin ? '#2563eb' : 'transparent';
  document.getElementById('tab-login').style.color = isLogin ? 'white' : '#64748b';
  document.getElementById('tab-register').style.background = !isLogin ? '#2563eb' : 'transparent';
  document.getElementById('tab-register').style.color = !isLogin ? 'white' : '#64748b';
}

function setRegRole(role) {
  document.getElementById('reg-role').value = role;
  const isEmployer = role === 'employer';
  document.getElementById('reg-name-label').textContent = isEmployer ? 'Company Name' : 'Full Name';
  document.getElementById('reg-name').placeholder = isEmployer ? 'Company name' : 'Your full name';
  document.getElementById('reg-employer').className = `btn ${isEmployer ? 'btn-primary' : 'btn-outline'} flex-1`;
  document.getElementById('reg-employee').className = `btn ${!isEmployer ? 'btn-primary' : 'btn-outline'} flex-1`;
  document.getElementById('reg-employer').style.flex = '1';
  document.getElementById('reg-employer').style.fontSize = '13px';
  document.getElementById('reg-employer').style.padding = '8px';
  document.getElementById('reg-employee').style.flex = '1';
  document.getElementById('reg-employee').style.fontSize = '13px';
  document.getElementById('reg-employee').style.padding = '8px';
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) return toast('Please fill all fields', 'error');

  const btn = document.getElementById('login-btn');
  btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
  btn.disabled = true;

  const res = await api('POST', '/auth/login', { email, password }, false);
  if (res.success) {
    localStorage.setItem('mp_token', res.token);
    localStorage.setItem('mp_user', JSON.stringify(res.user));
    currentUser = res.user;
    toast('Welcome back!', 'success');
    routeByRole(res.user.role);
  } else {
    toast(res.message || 'Login failed', 'error');
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    btn.disabled = false;
  }
}

async function doRegister() {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  if (!name || !email || !password) return toast('Please fill all fields', 'error');
  if (password.length < 6) return toast('Password must be at least 6 characters', 'error');

  const btn = document.getElementById('reg-btn');
  btn.innerHTML = '<span class="loading-spinner"></span> Creating...';
  btn.disabled = true;

  const body = { email, password, role };
  if (role === 'employee') body.fullName = name;
  if (role === 'employer') body.companyName = name;

  const res = await api('POST', '/auth/register', body, false);
  if (res.success) {
    localStorage.setItem('mp_token', res.token);
    localStorage.setItem('mp_user', JSON.stringify(res.user));
    currentUser = res.user;
    toast('Account created successfully!', 'success');
    routeByRole(res.user.role);
  } else {
    toast(res.message || 'Registration failed', 'error');
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    btn.disabled = false;
  }
}

function doLogout() {
  localStorage.removeItem('mp_token');
  localStorage.removeItem('mp_user');
  currentUser = null;
  renderLogin();
  toast('Logged out successfully', 'info');
}

function routeByRole(role) {
  if (role === 'super_admin') renderAdminDashboard();
  else if (role === 'employer') renderEmployerDashboard();
  else if (role === 'employee') renderEmployeeDashboard();
  else renderLogin();
}

// =============================================
// SHARED LAYOUT
// =============================================
function renderLayout(role, activeSection, contentHtml, pageTitle) {
  const navLinks = {
    super_admin: [
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'companies', icon: 'fa-building', label: 'Companies' },
      { id: 'employees', icon: 'fa-users', label: 'Employees' },
      { id: 'jobs', icon: 'fa-briefcase', label: 'All Jobs' },
      { id: 'reviews', icon: 'fa-star', label: 'Reviews' },
      { id: 'users', icon: 'fa-user-cog', label: 'Users' },
    ],
    employer: [
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'post-job', icon: 'fa-plus-circle', label: 'Post New Job' },
      { id: 'my-jobs', icon: 'fa-briefcase', label: 'My Jobs' },
      { id: 'applications', icon: 'fa-file-alt', label: 'Applications' },
      { id: 'reviews', icon: 'fa-star', label: 'Employee Reviews' },
      { id: 'company-profile', icon: 'fa-building', label: 'Company Profile' },
    ],
    employee: [
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'find-jobs', icon: 'fa-search', label: 'Find Jobs' },
      { id: 'my-applications', icon: 'fa-file-alt', label: 'My Applications' },
      { id: 'saved-jobs', icon: 'fa-bookmark', label: 'Saved Jobs' },
      { id: 'my-profile', icon: 'fa-user', label: 'My Profile' },
    ]
  };

  const roleLabels = { super_admin: 'Super Admin', employer: 'Employer', employee: 'Job Seeker' };
  const userName = currentUser?.profileData?.full_name || currentUser?.profileData?.company_name || currentUser?.email?.split('@')[0] || 'User';
  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const navHtml = (navLinks[role] || []).map(l =>
    `<button class="nav-link ${l.id === activeSection ? 'active' : ''}" onclick="navigateTo('${l.id}')">
      <i class="fas ${l.icon}"></i><span>${l.label}</span>
    </button>`
  ).join('');

  return `
    <div class="dashboard-layout">
      <!-- Sidebar overlay (mobile tap-outside to close) -->
      <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>

      <aside class="sidebar" id="main-sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-inner">
            <h2><i class="fas fa-briefcase"></i> My Placement</h2>
            <p>${roleLabels[role] || role} Panel</p>
          </div>
          <button class="sidebar-close-btn" onclick="closeSidebar()" title="Close menu">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <nav class="sidebar-nav">
          ${navHtml}
        </nav>
        <div class="sidebar-user">
          <div class="sidebar-avatar">${initials}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${userName}</div>
            <div class="sidebar-user-role">${roleLabels[role]}</div>
          </div>
          <button class="logout-btn" onclick="doLogout()" title="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </aside>

      <main class="main-content">
        <header class="top-header">
          <!-- Hamburger: only visible on mobile -->
          <button class="hamburger-btn" id="hamburger-btn" onclick="openSidebar()" title="Menu">
            <i class="fas fa-bars"></i>
          </button>
          <h1 class="page-title" id="page-title">${pageTitle}</h1>
          <div class="header-right">
            <span class="header-email">${currentUser?.email || ''}</span>
            <div class="sidebar-avatar header-avatar-circle" style="width:34px;height:34px;background:linear-gradient(135deg,#2563eb,#7c3aed);flex-shrink:0;">${initials}</div>
            <!-- Mobile logout button — always visible on small screens -->
            <button class="header-logout-btn" onclick="doLogout()" title="Logout">
              <i class="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </header>
        <div class="content-area" id="content-area">
          ${contentHtml}
        </div>
      </main>
    </div>`;
}

let currentRole = null;

// ── Sidebar mobile open/close ──
function openSidebar() {
  const sb = document.getElementById('main-sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  const sb = document.getElementById('main-sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('active');
  document.body.style.overflow = '';
}

function navigateTo(section) {
  closeSidebar();
  if (currentRole === 'super_admin') loadAdminSection(section);
  else if (currentRole === 'employer') loadEmployerSection(section);
  else if (currentRole === 'employee') loadEmployeeSection(section);
}


// =============================================
// SUPER ADMIN DASHBOARD
// =============================================
async function renderAdminDashboard() {
  currentRole = 'super_admin';
  const app = document.getElementById('app');
  app.innerHTML = renderLayout('super_admin', 'dashboard', '<div class="page-loader"><div class="page-loader-inner"></div></div>', 'Dashboard');
  await loadAdminSection('dashboard');
}

async function loadAdminSection(section) {
  currentRole = 'super_admin';
  const titles = {
    dashboard: 'Admin Dashboard', companies: 'Manage Companies',
    employees: 'All Employees', jobs: 'All Jobs',
    reviews: 'Employee Reviews', users: 'Manage Users'
  };
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.textContent.trim().toLowerCase().includes(section.replace('-', ' ')));
  });
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(l => l.classList.remove('active'));
  const activeLink = [...navLinks].find(l => l.getAttribute('onclick')?.includes(`'${section}'`));
  if (activeLink) activeLink.classList.add('active');

  const content = document.getElementById('content-area');
  const header = document.querySelector('.page-title');
  if (header) header.textContent = titles[section] || section;
  if (content) content.innerHTML = '<div class="page-loader"><div class="page-loader-inner"></div></div>';

  if (section === 'dashboard') await loadAdminDashboard();
  else if (section === 'companies') await loadAdminCompanies();
  else if (section === 'employees') await loadAdminEmployees();
  else if (section === 'jobs') await loadAdminJobs();
  else if (section === 'reviews') await loadAdminReviews();
  else if (section === 'users') await loadAdminUsers();
}

async function loadAdminDashboard() {
  const res = await api('GET', '/admin/stats');
  const s = res.stats || {};
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="border-left-color:#2563eb;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.totalUsers||0}</div><div class="stat-label">Total Users</div></div>
          <div class="stat-icon" style="background:#dbeafe;color:#2563eb;"><i class="fas fa-users"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#7c3aed;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.totalCompanies||0}</div><div class="stat-label">Companies</div></div>
          <div class="stat-icon" style="background:#ede9fe;color:#7c3aed;"><i class="fas fa-building"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#16a34a;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.totalJobs||0}</div><div class="stat-label">Active Jobs</div></div>
          <div class="stat-icon" style="background:#dcfce7;color:#16a34a;"><i class="fas fa-briefcase"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#d97706;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.totalApplications||0}</div><div class="stat-label">Applications</div></div>
          <div class="stat-icon" style="background:#fef3c7;color:#d97706;"><i class="fas fa-file-alt"></i></div>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title"><i class="fas fa-clock text-blue-500"></i> Recent Jobs Posted</div>
        ${(res.recentJobs||[]).map(j => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div><div style="font-weight:600;font-size:14px;">${j.title}</div><div style="color:#64748b;font-size:12px;">${j.company_name}</div></div>
            <div style="font-size:11px;color:#94a3b8;">${timeAgo(j.created_at)}</div>
          </div>`).join('') || '<div class="empty-state"><i class="fas fa-briefcase"></i><p>No jobs yet</p></div>'}
      </div>
      <div class="card">
        <div class="card-title"><i class="fas fa-user-plus text-purple-500"></i> Recent Registrations</div>
        ${(res.recentUsers||[]).map(u => `
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;">
            <div><div style="font-weight:600;font-size:14px;">${u.email}</div><span class="badge badge-primary">${u.role}</span></div>
            <div style="font-size:11px;color:#94a3b8;">${timeAgo(u.created_at)}</div>
          </div>`).join('') || '<div class="empty-state"><i class="fas fa-users"></i><p>No users yet</p></div>'}
      </div>
    </div>
    <div class="grid-2" style="margin-top:0;">
      <div class="stat-card" style="border-left-color:#dc2626;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><div class="stat-number" style="font-size:24px;">${s.pendingVerification||0}</div><div class="stat-label">Pending Verification</div></div>
          <button class="btn btn-warning btn-sm" onclick="loadAdminSection('companies')">Review</button>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#ef4444;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><div class="stat-number" style="font-size:24px;">${s.flaggedReviews||0}</div><div class="stat-label">Flagged Reviews</div></div>
          <button class="btn btn-danger btn-sm" onclick="loadAdminSection('reviews')">Review</button>
        </div>
      </div>
    </div>`;
}

async function loadAdminCompanies() {
  const res = await api('GET', '/admin/companies');
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fas fa-building"></i> All Companies (${(res.companies||[]).length})</div>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Company</th><th>Industry</th><th>Location</th><th>Jobs</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${(res.companies||[]).map(c => `
              <tr>
                <td>
                  <div style="font-weight:600;">${c.company_name}</div>
                  <div style="font-size:12px;color:#64748b;">${c.email}</div>
                </td>
                <td>${c.industry||'-'}</td>
                <td>${c.city||'-'}, ${c.state||''}</td>
                <td><span class="badge badge-primary">${c.active_jobs||0} active</span></td>
                <td>
                  ${c.is_verified ? '<span class="badge badge-success"><i class="fas fa-check"></i> Verified</span>' : '<span class="badge badge-warning">Pending</span>'}
                  ${!c.is_active ? '<span class="badge badge-danger">Inactive</span>' : ''}
                </td>
                <td style="display:flex;gap:6px;">
                  <button class="btn btn-sm ${c.is_verified?'btn-outline':'btn-success'}" onclick="adminVerifyCompany(${c.id},${c.is_verified?0:1})">
                    ${c.is_verified?'Unverify':'Verify'}
                  </button>
                </td>
              </tr>`).join('') || '<tr><td colspan="6" class="text-center">No companies</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function adminVerifyCompany(id, status) {
  const res = await api('PUT', `/admin/companies/${id}/verify`, { is_verified: status });
  if (res.success) { toast(res.message, 'success'); loadAdminCompanies(); }
  else toast(res.message, 'error');
}

async function loadAdminEmployees() {
  const res = await api('GET', '/admin/employees');
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fas fa-users"></i> All Employees (${(res.employees||[]).length})</div>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>Location</th><th>Experience</th><th>Applications</th><th>Rating</th><th>Flags</th><th>Status</th></tr></thead>
          <tbody>
            ${(res.employees||[]).map(e => `
              <tr>
                <td>
                  <div style="font-weight:600;">${e.full_name}</div>
                  <div style="font-size:12px;color:#64748b;">${e.email}</div>
                  <div style="font-size:12px;color:#94a3b8;">${e.current_job_title||'-'}</div>
                </td>
                <td>${e.city||'-'}</td>
                <td>${e.total_experience_years||0} yrs</td>
                <td>${e.total_applications||0}</td>
                <td>${e.avg_rating ? `${parseFloat(e.avg_rating).toFixed(1)} ⭐` : '-'}</td>
                <td>${e.flag_count > 0 ? `<span class="badge badge-danger">${e.flag_count} flags</span>` : '<span class="badge badge-success">Clean</span>'}</td>
                <td>${e.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
              </tr>`).join('') || '<tr><td colspan="7">No employees found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function loadAdminJobs() {
  const res = await api('GET', '/admin/jobs');
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fas fa-briefcase"></i> All Jobs (${(res.jobs||[]).length})</div>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Job Title</th><th>Company</th><th>Location</th><th>Type</th><th>Applications</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${(res.jobs||[]).map(j => `
              <tr>
                <td style="font-weight:600;">${j.title}</td>
                <td>${j.company_name}</td>
                <td>${j.city||'-'}</td>
                <td>${jobTypeBadge(j.job_type)}</td>
                <td>${j.applications_count||0}</td>
                <td>${j.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
                <td>
                  <button class="btn btn-sm ${j.is_active?'btn-danger':'btn-success'}" onclick="adminToggleJob(${j.id})">
                    ${j.is_active?'Deactivate':'Activate'}
                  </button>
                </td>
              </tr>`).join('') || '<tr><td colspan="7">No jobs found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function adminToggleJob(id) {
  const res = await api('PUT', `/admin/jobs/${id}/toggle`);
  if (res.success) { toast(res.message, 'success'); loadAdminJobs(); }
}

async function loadAdminReviews() {
  const res = await api('GET', '/admin/reviews?flagged=true');
  const allRes = await api('GET', '/admin/reviews');
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" onclick="showAdminReviewTab('flagged',this)">Flagged Reviews (${(res.reviews||[]).length})</button>
      <button class="tab-btn" onclick="showAdminReviewTab('all',this)">All Reviews (${(allRes.reviews||[]).length})</button>
    </div>
    <div id="review-tab-flagged">
      ${(res.reviews||[]).length ? (res.reviews||[]).map(r => renderAdminReviewCard(r)).join('') : '<div class="empty-state"><i class="fas fa-check-circle" style="color:#16a34a"></i><h3>No flagged reviews!</h3></div>'}
    </div>
    <div id="review-tab-all" style="display:none">
      ${(allRes.reviews||[]).map(r => renderAdminReviewCard(r)).join('') || '<div class="empty-state"><i class="fas fa-star"></i><h3>No reviews yet</h3></div>'}
    </div>`;
}

function showAdminReviewTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('review-tab-flagged').style.display = tab === 'flagged' ? 'block' : 'none';
  document.getElementById('review-tab-all').style.display = tab === 'all' ? 'block' : 'none';
}

function renderAdminReviewCard(r) {
  return `
    <div class="review-card ${r.is_flagged ? 'review-flag' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;">
        <div>
          <span style="font-weight:700;">${r.employee_name}</span>
          <span style="color:#64748b;font-size:13px;"> reviewed by </span>
          <span style="font-weight:600;color:#2563eb;">${r.company_name}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div class="stars">${stars(r.rating)}</div>
          ${r.is_flagged ? '<span class="badge badge-danger"><i class="fas fa-flag"></i> Flagged</span>' : ''}
        </div>
      </div>
      <p style="color:#374151;font-size:14px;margin:8px 0;">${r.review_text||'No review text'}</p>
      ${r.flag_reason ? `<p style="color:#dc2626;font-size:12px;"><i class="fas fa-exclamation-triangle"></i> ${r.flag_reason}</p>` : ''}
      <div style="margin-top:10px;">
        <button class="btn btn-sm ${r.is_flagged?'btn-success':'btn-danger'}" onclick="adminFlagReview(${r.id},${r.is_flagged?0:1})">
          ${r.is_flagged?'<i class="fas fa-check"></i> Remove Flag':'<i class="fas fa-flag"></i> Flag'}
        </button>
      </div>
    </div>`;
}

async function adminFlagReview(id, flag) {
  const res = await api('PUT', `/reviews/${id}/flag`, { is_flagged: flag, flag_reason: flag ? 'Flagged by admin' : '' });
  if (res.success) { toast('Review updated', 'success'); loadAdminReviews(); }
}

async function loadAdminUsers() {
  const res = await api('GET', '/admin/users');
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fas fa-user-cog"></i> All Users (${(res.users||[]).length})</div>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${(res.users||[]).map(u => `
              <tr>
                <td style="font-weight:600;">${u.email}</td>
                <td><span class="badge badge-primary">${u.role}</span></td>
                <td style="font-size:13px;">${new Date(u.created_at).toLocaleDateString()}</td>
                <td>${u.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
                <td>
                  <button class="btn btn-sm ${u.is_active?'btn-danger':'btn-success'}" onclick="adminToggleUser(${u.id})">
                    ${u.is_active?'Deactivate':'Activate'}
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function adminToggleUser(id) {
  const res = await api('PUT', `/admin/users/${id}/toggle`);
  if (res.success) { toast(res.message, 'success'); loadAdminUsers(); }
}


// =============================================
// EMPLOYER DASHBOARD
// =============================================
async function renderEmployerDashboard() {
  currentRole = 'employer';
  const app = document.getElementById('app');
  app.innerHTML = renderLayout('employer', 'dashboard', '<div class="page-loader"><div class="page-loader-inner"></div></div>', 'Dashboard');
  await loadEmployerSection('dashboard');
}

async function loadEmployerSection(section) {
  currentRole = 'employer';
  const titles = {
    dashboard: 'Employer Dashboard', 'post-job': 'Post New Job',
    'my-jobs': 'My Job Listings', applications: 'Applications',
    reviews: 'Employee Reviews', 'company-profile': 'Company Profile'
  };
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(l => l.classList.remove('active'));
  const activeLink = [...navLinks].find(l => l.getAttribute('onclick')?.includes(`'${section}'`));
  if (activeLink) activeLink.classList.add('active');
  const content = document.getElementById('content-area');
  const header = document.querySelector('.page-title');
  if (header) header.textContent = titles[section] || section;
  if (content) content.innerHTML = '<div class="page-loader"><div class="page-loader-inner"></div></div>';

  if (section === 'dashboard') await loadEmployerHome();
  else if (section === 'post-job') renderPostJobForm();
  else if (section === 'my-jobs') await loadMyJobs();
  else if (section === 'applications') await loadAllApplications();
  else if (section === 'reviews') await loadEmployerReviews();
  else if (section === 'company-profile') await loadCompanyProfile();
}

async function loadEmployerHome() {
  const [statsRes, jobsRes] = await Promise.all([
    api('GET', '/company/stats'),
    api('GET', '/company/jobs')
  ]);
  const s = statsRes.stats || {};
  const recentJobs = (jobsRes.jobs || []).slice(0, 3);
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="border-left-color:#2563eb;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.totalJobs||0}</div><div class="stat-label">Active Jobs</div></div>
          <div class="stat-icon" style="background:#dbeafe;color:#2563eb;"><i class="fas fa-briefcase"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#7c3aed;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.totalApplications||0}</div><div class="stat-label">Total Applications</div></div>
          <div class="stat-icon" style="background:#ede9fe;color:#7c3aed;"><i class="fas fa-file-alt"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#d97706;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.newApplications||0}</div><div class="stat-label">New Applications</div></div>
          <div class="stat-icon" style="background:#fef3c7;color:#d97706;"><i class="fas fa-bell"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#16a34a;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${s.shortlisted||0}</div><div class="stat-label">Shortlisted</div></div>
          <div class="stat-icon" style="background:#dcfce7;color:#16a34a;"><i class="fas fa-user-check"></i></div>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title" style="justify-content:space-between;">
          <span><i class="fas fa-briefcase" style="color:#2563eb"></i> Recent Job Posts</span>
          <button class="btn btn-primary btn-sm" onclick="loadEmployerSection('post-job')"><i class="fas fa-plus"></i> Post Job</button>
        </div>
        ${recentJobs.map(j => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9;">
            <div>
              <div style="font-weight:600;font-size:14px;">${j.title}</div>
              <div style="display:flex;gap:6px;margin-top:4px;">
                ${jobTypeBadge(j.job_type)}
                <span class="badge badge-primary">${j.applications_count||0} applied</span>
                ${j.new_applications > 0 ? `<span class="badge badge-warning">${j.new_applications} new</span>` : ''}
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="viewJobApplications(${j.id},'${j.title}')">View</button>
          </div>`).join('') || '<div class="empty-state"><i class="fas fa-briefcase"></i><h3>No jobs posted yet</h3><button class="btn btn-primary btn-sm" onclick="loadEmployerSection(\'post-job\')">Post First Job</button></div>'}
      </div>
      <div class="card">
        <div class="card-title"><i class="fas fa-lightbulb" style="color:#d97706"></i> Quick Actions</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn btn-primary" onclick="loadEmployerSection('post-job')"><i class="fas fa-plus-circle"></i> Post New Job</button>
          <button class="btn btn-outline" onclick="loadEmployerSection('applications')"><i class="fas fa-file-alt"></i> Review Applications</button>
          <button class="btn btn-outline" onclick="loadEmployerSection('reviews')"><i class="fas fa-star"></i> Employee Reviews</button>
          <button class="btn btn-outline" onclick="loadEmployerSection('company-profile')"><i class="fas fa-edit"></i> Update Company Profile</button>
        </div>
      </div>
    </div>`;
}

function renderPostJobForm(job = null) {
  const isEdit = !!job;
  const content = document.getElementById('content-area');
  const skillsArr = job ? JSON.parse(job.skills_required || '[]') : [];
  content.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fas fa-${isEdit?'edit':'plus-circle'}" style="color:#2563eb"></i> ${isEdit?'Edit Job':'Post New Job'}</div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Job Title *</label>
          <input type="text" id="jb-title" class="form-control" placeholder="e.g. Senior React Developer" value="${job?.title||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <input type="text" id="jb-dept" class="form-control" placeholder="e.g. Engineering" value="${job?.department||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Job Type</label>
          <select id="jb-type" class="form-control">
            ${['full_time','part_time','contract','internship','freelance'].map(t => `<option value="${t}" ${job?.job_type===t?'selected':''}>${t.replace('_',' ').toUpperCase()}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Work Mode</label>
          <select id="jb-mode" class="form-control">
            ${['onsite','remote','hybrid'].map(m => `<option value="${m}" ${job?.work_mode===m?'selected':''}>${m.toUpperCase()}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">City *</label>
          <input type="text" id="jb-city" class="form-control" placeholder="e.g. Pune" value="${job?.city||''}">
        </div>
        <div class="form-group">
          <label class="form-label">State</label>
          <input type="text" id="jb-state" class="form-control" placeholder="e.g. Maharashtra" value="${job?.state||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Min Experience (years)</label>
          <input type="number" id="jb-exp-min" class="form-control" placeholder="0" value="${job?.experience_min||0}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Max Experience (years)</label>
          <input type="number" id="jb-exp-max" class="form-control" placeholder="10" value="${job?.experience_max||10}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">Min Salary (INR/year)</label>
          <input type="number" id="jb-sal-min" class="form-control" placeholder="500000" value="${job?.salary_min||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Max Salary (INR/year)</label>
          <input type="number" id="jb-sal-max" class="form-control" placeholder="1500000" value="${job?.salary_max||''}">
        </div>
        <div class="form-group">
          <label class="form-label">Number of Openings</label>
          <input type="number" id="jb-openings" class="form-control" placeholder="1" value="${job?.no_of_openings||1}" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Application Deadline</label>
          <input type="date" id="jb-deadline" class="form-control" value="${job?.application_deadline||''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Required Skills (Press Enter or comma to add)</label>
        <input type="text" id="jb-skill-input" class="form-control" placeholder="Type skill and press Enter..." onkeydown="addJobSkill(event)">
        <div id="jb-skills-container" style="margin-top:10px;">
          ${skillsArr.map(s => `<span class="skill-chip">${s}<span class="remove-skill" onclick="removeJobSkill('${s}')">✕</span></span>`).join('')}
        </div>
        <input type="hidden" id="jb-skills" value='${JSON.stringify(skillsArr)}'>
      </div>
      <div class="form-group">
        <label class="form-label">Job Description * (Full JD - This is used for smart matching)</label>
        <textarea id="jb-desc" class="form-control" rows="6" placeholder="Detailed job description...">${job?.description||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Requirements *</label>
        <textarea id="jb-req" class="form-control" rows="4" placeholder="Must have qualifications, experience...">${job?.requirements||''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Responsibilities</label>
        <textarea id="jb-resp" class="form-control" rows="4" placeholder="Key responsibilities...">${job?.responsibilities||''}</textarea>
      </div>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-primary" onclick="${isEdit?`saveEditJob(${job.id})`:'submitPostJob()'}">
          <i class="fas fa-${isEdit?'save':'paper-plane'}"></i> ${isEdit?'Save Changes':'Post Job'}
        </button>
        <button class="btn btn-outline" onclick="loadEmployerSection('my-jobs')">Cancel</button>
      </div>
    </div>`;
}

let jobSkills = [];
function addJobSkill(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const input = document.getElementById('jb-skill-input');
    const skill = input.value.replace(',','').trim();
    if (!skill) return;
    const current = JSON.parse(document.getElementById('jb-skills').value || '[]');
    if (!current.includes(skill)) {
      current.push(skill);
      document.getElementById('jb-skills').value = JSON.stringify(current);
      const cont = document.getElementById('jb-skills-container');
      cont.innerHTML = current.map(s => `<span class="skill-chip">${s}<span class="remove-skill" onclick="removeJobSkill('${s}')">✕</span></span>`).join('');
    }
    input.value = '';
  }
}

function removeJobSkill(skill) {
  const current = JSON.parse(document.getElementById('jb-skills').value || '[]');
  const updated = current.filter(s => s !== skill);
  document.getElementById('jb-skills').value = JSON.stringify(updated);
  document.getElementById('jb-skills-container').innerHTML = updated.map(s => `<span class="skill-chip">${s}<span class="remove-skill" onclick="removeJobSkill('${s}')">✕</span></span>`).join('');
}

async function submitPostJob() {
  const body = {
    title: document.getElementById('jb-title').value,
    department: document.getElementById('jb-dept').value,
    job_type: document.getElementById('jb-type').value,
    work_mode: document.getElementById('jb-mode').value,
    city: document.getElementById('jb-city').value,
    state: document.getElementById('jb-state').value,
    description: document.getElementById('jb-desc').value,
    requirements: document.getElementById('jb-req').value,
    responsibilities: document.getElementById('jb-resp').value,
    skills_required: JSON.parse(document.getElementById('jb-skills').value || '[]'),
    experience_min: parseFloat(document.getElementById('jb-exp-min').value) || 0,
    experience_max: parseFloat(document.getElementById('jb-exp-max').value) || 10,
    salary_min: parseInt(document.getElementById('jb-sal-min').value) || null,
    salary_max: parseInt(document.getElementById('jb-sal-max').value) || null,
    no_of_openings: parseInt(document.getElementById('jb-openings').value) || 1,
    application_deadline: document.getElementById('jb-deadline').value || null
  };
  if (!body.title || !body.description || !body.requirements) return toast('Please fill required fields', 'error');
  const res = await api('POST', '/company/jobs', body);
  if (res.success) { toast('Job posted successfully!', 'success'); loadEmployerSection('my-jobs'); }
  else toast(res.message, 'error');
}

async function saveEditJob(id) {
  const body = {
    title: document.getElementById('jb-title').value,
    department: document.getElementById('jb-dept').value,
    job_type: document.getElementById('jb-type').value,
    work_mode: document.getElementById('jb-mode').value,
    city: document.getElementById('jb-city').value,
    state: document.getElementById('jb-state').value,
    description: document.getElementById('jb-desc').value,
    requirements: document.getElementById('jb-req').value,
    responsibilities: document.getElementById('jb-resp').value,
    skills_required: JSON.parse(document.getElementById('jb-skills').value || '[]'),
    experience_min: parseFloat(document.getElementById('jb-exp-min').value) || 0,
    experience_max: parseFloat(document.getElementById('jb-exp-max').value) || 10,
    salary_min: parseInt(document.getElementById('jb-sal-min').value) || null,
    salary_max: parseInt(document.getElementById('jb-sal-max').value) || null,
  };
  const res = await api('PUT', `/company/jobs/${id}`, body);
  if (res.success) { toast('Job updated!', 'success'); loadEmployerSection('my-jobs'); }
  else toast(res.message, 'error');
}

async function loadMyJobs() {
  const res = await api('GET', '/company/jobs');
  const content = document.getElementById('content-area');
  const jobs = res.jobs || [];
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <div style="font-size:14px;color:#64748b;">${jobs.length} jobs posted</div>
      <button class="btn btn-primary" onclick="loadEmployerSection('post-job')"><i class="fas fa-plus"></i> Post New Job</button>
    </div>
    ${jobs.map(j => `
      <div class="job-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div style="flex:1;">
            <div class="job-title">${j.title}</div>
            <div class="job-meta">
              ${jobTypeBadge(j.job_type)} ${workModeBadge(j.work_mode)}
              <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${j.city||'Any'}</span>
              <span class="job-tag"><i class="fas fa-users"></i>${j.applications_count||0} applied</span>
              ${j.new_applications > 0 ? `<span class="badge badge-warning">${j.new_applications} new</span>` : ''}
            </div>
            <div style="font-size:12px;color:#94a3b8;">Posted ${timeAgo(j.created_at)} • ${j.no_of_openings} opening(s)</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
            ${j.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Closed</span>'}
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="viewJobApplications(${j.id},'${j.title.replace(/'/g,'')}')"><i class="fas fa-users"></i> Applications (${j.applications_count||0})</button>
          <button class="btn btn-outline btn-sm" onclick="editJob(${j.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-${j.is_active?'danger':'success'} btn-sm" onclick="toggleJob(${j.id},${j.is_active?0:1})">
            ${j.is_active?'<i class="fas fa-pause"></i> Close':'<i class="fas fa-play"></i> Reopen'}
          </button>
        </div>
      </div>`).join('') || '<div class="empty-state"><i class="fas fa-briefcase"></i><h3>No jobs posted yet</h3><button class="btn btn-primary" onclick="loadEmployerSection(\'post-job\')">Post Your First Job</button></div>'}`;
}

async function editJob(id) {
  const res = await api('GET', `/jobs/${id}`);
  if (res.success) renderPostJobForm(res.job);
}

async function toggleJob(id, status) {
  const res = await api('PUT', `/company/jobs/${id}`, { is_active: status });
  if (res.success) { toast('Job updated!', 'success'); loadMyJobs(); }
}

async function viewJobApplications(jobId, jobTitle) {
  const header = document.querySelector('.page-title');
  if (header) header.textContent = `Applications: ${jobTitle}`;
  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="page-loader"><div class="page-loader-inner"></div></div>';
  const res = await api('GET', `/jobs/${jobId}/applications`);
  const apps = res.applications || [];
  content.innerHTML = `
    <div style="margin-bottom:16px;">
      <button class="btn btn-outline btn-sm" onclick="loadEmployerSection('my-jobs')"><i class="fas fa-arrow-left"></i> Back to Jobs</button>
    </div>
    <div style="font-size:14px;color:#64748b;margin-bottom:16px;">${apps.length} application(s) • Sorted by Match Score</div>
    ${apps.map(a => `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:16px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div class="profile-avatar" style="width:44px;height:44px;font-size:16px;background:linear-gradient(135deg,#2563eb,#7c3aed);">${(a.full_name||'?')[0].toUpperCase()}</div>
              <div>
                <div style="font-weight:700;font-size:16px;">${a.full_name}</div>
                <div style="color:#2563eb;font-size:13px;">${a.current_job_title||'Job Seeker'} • ${a.total_experience_years||0} yrs exp</div>
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${a.city||'N/A'}</span>
              <span class="job-tag"><i class="fas fa-money-bill-wave"></i>Expected: ${a.expected_salary ? '₹'+(a.expected_salary/100000).toFixed(1)+'L' : 'N/A'}</span>
              ${a.avg_rating ? `<span class="job-tag"><i class="fas fa-star" style="color:#fbbf24"></i>${parseFloat(a.avg_rating).toFixed(1)}/5</span>` : ''}
              ${a.flag_count > 0 ? `<span class="badge badge-danger"><i class="fas fa-flag"></i> ${a.flag_count} flags</span>` : '<span class="badge badge-success"><i class="fas fa-shield-alt"></i> Clean record</span>'}
            </div>
            <div style="margin-bottom:10px;">${renderSkillTags(JSON.parse(a.skills||'[]').slice(0,6))}</div>
            ${a.cover_letter ? `<div style="background:#f8fafc;border-radius:8px;padding:10px;font-size:13px;color:#374151;"><i class="fas fa-quote-left" style="color:#94a3b8"></i> ${a.cover_letter}</div>` : ''}
          </div>
          <div style="text-align:center;flex-shrink:0;">
            <div class="match-score-badge ${getMatchClass(a.match_score||0)}" style="position:relative;top:0;right:0;margin-bottom:10px;">
              ${a.match_score||0}%<div style="font-size:9px;font-weight:500;">match</div>
            </div>
            ${statusBadge(a.status)}
            <div style="font-size:11px;color:#94a3b8;margin-top:6px;">${timeAgo(a.applied_at)}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <select class="form-control" style="width:auto;padding:6px 10px;font-size:13px;" onchange="updateAppStatus(${a.id},this.value)">
            ${['applied','shortlisted','interview_scheduled','interviewed','offered','hired','rejected'].map(s => `<option value="${s}" ${a.status===s?'selected':''}>${s.replace(/_/g,' ').toUpperCase()}</option>`).join('')}
          </select>
          <button class="btn btn-outline btn-sm" onclick="viewEmployeeProfile(${a.employee_id})"><i class="fas fa-user"></i> Full Profile</button>
          <button class="btn btn-outline btn-sm" onclick="addReviewModal(${a.employee_id},'${(a.full_name||'').replace(/'/g,'')}')"><i class="fas fa-star"></i> Add Review</button>
        </div>
      </div>`).join('') || '<div class="empty-state"><i class="fas fa-users"></i><h3>No applications yet</h3><p>Share the job link to get applications</p></div>'}`;
}

async function updateAppStatus(appId, status) {
  const res = await api('PUT', `/jobs/applications/${appId}/status`, { status });
  if (res.success) toast('Status updated', 'success');
  else toast(res.message, 'error');
}

async function loadAllApplications() {
  const jobsRes = await api('GET', '/company/jobs');
  const jobs = jobsRes.jobs || [];
  const content = document.getElementById('content-area');
  if (!jobs.length) {
    content.innerHTML = '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No jobs posted yet</h3></div>';
    return;
  }
  content.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fas fa-briefcase"></i> Select a job to view applications</div>
      ${jobs.map(j => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;cursor:pointer;" onclick="viewJobApplications(${j.id},'${j.title.replace(/'/g,'')}')">
          <div>
            <div style="font-weight:600;">${j.title}</div>
            <div style="font-size:13px;color:#64748b;">${j.city} • ${j.applications_count||0} applications</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            ${j.new_applications > 0 ? `<span class="badge badge-warning">${j.new_applications} new</span>` : ''}
            <i class="fas fa-chevron-right" style="color:#94a3b8;"></i>
          </div>
        </div>`).join('')}
    </div>`;
}

async function viewEmployeeProfile(empId) {
  const res = await api('GET', `/profile/${empId}`);
  if (!res.success) return toast('Could not load profile', 'error');
  const p = res.profile;
  const skills = JSON.parse(p.skills || '[]');
  const reviews = res.reviews || [];
  createModal('emp-profile-modal', `${p.full_name}'s Profile`, `
    <div class="profile-header" style="border-radius:12px;padding:20px;margin-bottom:16px;">
      <div class="profile-avatar">${(p.full_name||'?')[0].toUpperCase()}</div>
      <div>
        <div style="font-size:20px;font-weight:800;">${p.full_name}</div>
        <div style="opacity:0.8;">${p.current_job_title||'Job Seeker'}</div>
        <div style="opacity:0.7;font-size:13px;"><i class="fas fa-map-marker-alt"></i> ${p.city||'N/A'}, ${p.state||''}</div>
      </div>
    </div>
    <div class="grid-2" style="margin-bottom:16px;">
      <div><b>Experience:</b> ${p.total_experience_years||0} years</div>
      <div><b>Notice Period:</b> ${p.notice_period||0} days</div>
      <div><b>Expected:</b> ${p.expected_salary?'₹'+(p.expected_salary/100000).toFixed(1)+'L':'N/A'}</div>
      <div><b>Current:</b> ${p.current_company||'N/A'}</div>
    </div>
    <div style="margin-bottom:16px;">
      <b>Skills:</b><br><div style="margin-top:8px;">${renderSkillTags(skills)}</div>
    </div>
    ${p.bio ? `<div style="margin-bottom:16px;"><b>About:</b><p style="color:#374151;margin:8px 0;">${p.bio}</p></div>` : ''}
    <div>
      <b>Reviews (${reviews.length}):</b>
      ${reviews.slice(0,3).map(r => `
        <div class="review-card ${r.is_flagged?'review-flag':''}" style="margin-top:8px;">
          <div style="display:flex;justify-content:space-between;">
            <b>${r.company_name}</b>
            <div class="stars">${stars(r.rating)}</div>
          </div>
          <p style="font-size:13px;margin:6px 0;">${r.review_text||''}</p>
          ${r.is_flagged ? '<span class="badge badge-danger"><i class="fas fa-flag"></i> Flagged</span>' : ''}
        </div>`).join('') || '<p style="color:#94a3b8;">No reviews yet</p>'}
    </div>
    <div style="margin-top:16px;">
      <button class="btn btn-primary" onclick="addReviewModal(${p.id},'${(p.full_name||'').replace(/'/g,'')}')"><i class="fas fa-star"></i> Add Review</button>
    </div>`, 'modal-lg');
}

function addReviewModal(empId, empName) {
  hideModal('emp-profile-modal');
  createModal('add-review-modal', `Add Review: ${empName}`, `
    <div class="form-group">
      <label class="form-label">Overall Rating</label>
      <div style="display:flex;gap:8px;">
        ${[1,2,3,4,5].map(n => `<button class="btn btn-sm" id="star-${n}" onclick="setRating(${n})" style="font-size:20px;padding:4px 8px;background:none;border:1px solid #e2e8f0;border-radius:8px;">⭐</button>`).join('')}
      </div>
      <input type="hidden" id="rev-rating" value="3">
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">Punctuality (1-5)</label>
        <input type="number" id="rev-punc" class="form-control" value="3" min="1" max="5">
      </div>
      <div class="form-group">
        <label class="form-label">Work Quality (1-5)</label>
        <input type="number" id="rev-wq" class="form-control" value="3" min="1" max="5">
      </div>
      <div class="form-group">
        <label class="form-label">Communication (1-5)</label>
        <input type="number" id="rev-comm" class="form-control" value="3" min="1" max="5">
      </div>
      <div class="form-group">
        <label class="form-label">Teamwork (1-5)</label>
        <input type="number" id="rev-team" class="form-control" value="3" min="1" max="5">
      </div>
      <div class="form-group">
        <label class="form-label">Job Title at Company</label>
        <input type="text" id="rev-jobtitle" class="form-control" placeholder="e.g. React Developer">
      </div>
      <div class="form-group">
        <label class="form-label">Worked From - To</label>
        <input type="text" id="rev-period" class="form-control" placeholder="e.g. Jan 2023 - Dec 2023">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Review</label>
      <textarea id="rev-text" class="form-control" rows="3" placeholder="Share your experience working with this employee..."></textarea>
    </div>
    <div class="form-group" style="display:flex;align-items:center;gap:10px;">
      <input type="checkbox" id="rev-flag" style="width:16px;height:16px;">
      <label for="rev-flag" style="color:#dc2626;font-weight:600;"><i class="fas fa-flag"></i> Flag as concerning / criminal behavior</label>
    </div>
    <div class="form-group" id="flag-reason-group" style="display:none;">
      <label class="form-label">Flag Reason (Important for other companies)</label>
      <textarea id="rev-flagreason" class="form-control" rows="2" placeholder="Describe the concerning behavior..."></textarea>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-primary" onclick="submitReview(${empId})"><i class="fas fa-paper-plane"></i> Submit Review</button>
      <button class="btn btn-outline" onclick="hideModal('add-review-modal')">Cancel</button>
    </div>
  `);
  document.getElementById('rev-flag').addEventListener('change', function() {
    document.getElementById('flag-reason-group').style.display = this.checked ? 'block' : 'none';
  });
}

function setRating(n) {
  document.getElementById('rev-rating').value = n;
  for(let i=1;i<=5;i++) {
    const btn = document.getElementById(`star-${i}`);
    if(btn) btn.style.background = i <= n ? '#fef3c7' : 'none';
  }
}

async function submitReview(empId) {
  const body = {
    employee_id: empId,
    rating: parseInt(document.getElementById('rev-rating').value),
    punctuality: parseInt(document.getElementById('rev-punc').value),
    work_quality: parseInt(document.getElementById('rev-wq').value),
    communication: parseInt(document.getElementById('rev-comm').value),
    teamwork: parseInt(document.getElementById('rev-team').value),
    review_text: document.getElementById('rev-text').value,
    job_title: document.getElementById('rev-jobtitle').value,
    is_flagged: document.getElementById('rev-flag').checked,
    flag_reason: document.getElementById('rev-flagreason')?.value || ''
  };
  const res = await api('POST', '/reviews', body);
  if (res.success) { toast('Review submitted!', 'success'); hideModal('add-review-modal'); }
  else toast(res.message, 'error');
}

async function loadEmployerReviews() {
  const res = await api('GET', '/reviews/company/given');
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div style="margin-bottom:16px;font-size:14px;color:#64748b;">${(res.reviews||[]).length} reviews given</div>
    ${(res.reviews||[]).map(r => `
      <div class="review-card ${r.is_flagged?'review-flag':''}">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div class="profile-avatar" style="width:40px;height:40px;font-size:16px;background:linear-gradient(135deg,#2563eb,#7c3aed);">${(r.full_name||'?')[0].toUpperCase()}</div>
          <div style="flex:1;">
            <div style="font-weight:700;">${r.full_name}</div>
            <div style="font-size:13px;color:#64748b;">${r.current_job_title||'Employee'}</div>
          </div>
          <div style="text-align:right;">
            <div class="stars">${stars(r.rating)}</div>
            ${r.is_flagged ? '<span class="badge badge-danger"><i class="fas fa-flag"></i> Flagged</span>' : '<span class="badge badge-success">Clean</span>'}
          </div>
        </div>
        <p style="color:#374151;font-size:14px;">${r.review_text||'-'}</p>
        ${r.flag_reason ? `<p style="color:#dc2626;font-size:12px;margin-top:6px;"><i class="fas fa-exclamation-triangle"></i> ${r.flag_reason}</p>` : ''}
        <div style="font-size:11px;color:#94a3b8;margin-top:8px;">${timeAgo(r.created_at)}</div>
      </div>`).join('') || '<div class="empty-state"><i class="fas fa-star"></i><h3>No reviews given yet</h3><p>Review employees from the Applications section</p></div>'}`;
}

async function loadCompanyProfile() {
  const res = await api('GET', '/company/profile');
  const c = res.company || {};
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="card">
      <div class="card-title"><i class="fas fa-building"></i> Company Profile</div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Company Name *</label><input type="text" id="cp-name" class="form-control" value="${c.company_name||''}"></div>
        <div class="form-group"><label class="form-label">Industry</label><input type="text" id="cp-industry" class="form-control" value="${c.industry||''}" placeholder="e.g. Information Technology"></div>
        <div class="form-group"><label class="form-label">City</label><input type="text" id="cp-city" class="form-control" value="${c.city||''}"></div>
        <div class="form-group"><label class="form-label">State</label><input type="text" id="cp-state" class="form-control" value="${c.state||''}"></div>
        <div class="form-group"><label class="form-label">Website</label><input type="url" id="cp-website" class="form-control" value="${c.website||''}" placeholder="https://company.com"></div>
        <div class="form-group"><label class="form-label">Company Size</label>
          <select id="cp-size" class="form-control">
            ${['1-10','11-50','51-200','201-500','500-1000','1000+'].map(s => `<option ${c.company_size===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Contact Phone</label><input type="tel" id="cp-phone" class="form-control" value="${c.contact_phone||''}"></div>
        <div class="form-group"><label class="form-label">Contact Email</label><input type="email" id="cp-cemail" class="form-control" value="${c.contact_email||''}"></div>
      </div>
      <div class="form-group"><label class="form-label">Company Description</label><textarea id="cp-desc" class="form-control" rows="4" placeholder="About your company...">${c.description||''}</textarea></div>
      <button class="btn btn-primary" onclick="saveCompanyProfile()"><i class="fas fa-save"></i> Save Profile</button>
    </div>`;
}

async function saveCompanyProfile() {
  const body = {
    company_name: document.getElementById('cp-name').value,
    industry: document.getElementById('cp-industry').value,
    city: document.getElementById('cp-city').value,
    state: document.getElementById('cp-state').value,
    website: document.getElementById('cp-website').value,
    company_size: document.getElementById('cp-size').value,
    contact_phone: document.getElementById('cp-phone').value,
    contact_email: document.getElementById('cp-cemail').value,
    description: document.getElementById('cp-desc').value
  };
  const res = await api('PUT', '/company/profile', body);
  if (res.success) toast('Company profile updated!', 'success');
  else toast(res.message, 'error');
}


// =============================================
// EMPLOYEE DASHBOARD
// =============================================
async function renderEmployeeDashboard() {
  currentRole = 'employee';
  const app = document.getElementById('app');
  app.innerHTML = renderLayout('employee', 'dashboard', '<div class="page-loader"><div class="page-loader-inner"></div></div>', 'Dashboard');
  await loadEmployeeSection('dashboard');
}

async function loadEmployeeSection(section) {
  currentRole = 'employee';
  const titles = {
    dashboard: 'My Dashboard', 'find-jobs': 'Find Jobs',
    'my-applications': 'My Applications', 'saved-jobs': 'Saved Jobs', 'my-profile': 'My Profile'
  };
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(l => l.classList.remove('active'));
  const activeLink = [...navLinks].find(l => l.getAttribute('onclick')?.includes(`'${section}'`));
  if (activeLink) activeLink.classList.add('active');
  const content = document.getElementById('content-area');
  const header = document.querySelector('.page-title');
  if (header) header.textContent = titles[section] || section;
  if (content) content.innerHTML = '<div class="page-loader"><div class="page-loader-inner"></div></div>';

  if (section === 'dashboard') await loadEmployeeDashboard();
  else if (section === 'find-jobs') await loadFindJobs();
  else if (section === 'my-applications') await loadMyApplications();
  else if (section === 'saved-jobs') await loadSavedJobs();
  else if (section === 'my-profile') await loadMyProfile();
}

async function loadEmployeeDashboard() {
  const [profileRes, jobsRes] = await Promise.all([
    api('GET', '/profile'),
    api('GET', '/jobs?limit=5')
  ]);
  const p = profileRes.profile || {};
  const applications = profileRes.applications || [];
  const topJobs = jobsRes.jobs || [];
  const skills = JSON.parse(p.skills || '[]');
  const content = document.getElementById('content-area');
  const profileComplete = [p.full_name, p.city, p.current_job_title, skills.length > 0].filter(Boolean).length;
  const profilePercent = Math.round((profileComplete / 4) * 100);
  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" style="border-left-color:#2563eb;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${applications.length}</div><div class="stat-label">Applications</div></div>
          <div class="stat-icon" style="background:#dbeafe;color:#2563eb;"><i class="fas fa-file-alt"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#16a34a;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${applications.filter(a=>a.status==='shortlisted').length}</div><div class="stat-label">Shortlisted</div></div>
          <div class="stat-icon" style="background:#dcfce7;color:#16a34a;"><i class="fas fa-star"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#7c3aed;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${(profileRes.savedJobs||[]).length}</div><div class="stat-label">Saved Jobs</div></div>
          <div class="stat-icon" style="background:#ede9fe;color:#7c3aed;"><i class="fas fa-bookmark"></i></div>
        </div>
      </div>
      <div class="stat-card" style="border-left-color:#d97706;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div class="stat-number">${profilePercent}%</div><div class="stat-label">Profile Complete</div></div>
          <div class="stat-icon" style="background:#fef3c7;color:#d97706;"><i class="fas fa-user-circle"></i></div>
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div class="card-title"><i class="fas fa-user-circle" style="color:#2563eb"></i> Profile Summary</div>
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
            <div class="profile-avatar" style="width:56px;height:56px;font-size:22px;background:linear-gradient(135deg,#2563eb,#7c3aed);">${(p.full_name||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-size:18px;font-weight:700;">${p.full_name||'Complete your profile'}</div>
              <div style="color:#64748b;">${p.current_job_title||'Job Seeker'} ${p.city?'• '+p.city:''}</div>
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
              <span>Profile Completion</span><span>${profilePercent}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${profilePercent}%"></div></div>
          </div>
          <div style="margin-bottom:12px;">${renderSkillTags(skills.slice(0,5))}</div>
          <button class="btn btn-primary btn-sm" onclick="loadEmployeeSection('my-profile')"><i class="fas fa-edit"></i> Update Profile</button>
        </div>
        <div class="card">
          <div class="card-title"><i class="fas fa-file-alt" style="color:#7c3aed"></i> Recent Applications</div>
          ${applications.slice(0,3).map(a => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
              <div>
                <div style="font-weight:600;font-size:14px;">${a.title}</div>
                <div style="font-size:12px;color:#64748b;">${a.company_name}</div>
              </div>
              ${statusBadge(a.status)}
            </div>`).join('') || '<div style="text-align:center;color:#94a3b8;padding:20px;">No applications yet</div>'}
          ${applications.length > 3 ? `<button class="btn btn-outline btn-sm" style="margin-top:10px;" onclick="loadEmployeeSection('my-applications')">View all ${applications.length} applications</button>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-title" style="justify-content:space-between;">
          <span><i class="fas fa-fire" style="color:#ef4444"></i> Top Job Matches ${p.city?`in ${p.city}`:''}</span>
          <button class="btn btn-primary btn-sm" onclick="loadEmployeeSection('find-jobs')">View All</button>
        </div>
        ${topJobs.map(j => `
          <div class="job-card" style="margin-bottom:12px;" onclick="showJobDetail(${j.id})">
            <div style="display:flex;justify-content:space-between;align-items:start;">
              <div style="flex:1;padding-right:60px;">
                <div class="job-title" style="font-size:15px;">${j.title}</div>
                <div class="job-company">${j.company_name} ${j.is_verified?'<i class="fas fa-check-circle verified-badge"></i>':''}</div>
                <div class="job-meta" style="margin:6px 0;">
                  <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${j.city||'Any'}</span>
                  <span class="job-tag"><i class="fas fa-money-bill-wave"></i>${formatSalary(j.salary_min,j.salary_max)}</span>
                </div>
              </div>
              ${j.match_score !== undefined ? `
              <div class="match-score-badge ${getMatchClass(j.match_score)}">
                ${j.match_score}%<div style="font-size:9px;">match</div>
              </div>` : ''}
            </div>
          </div>`).join('') || '<div class="empty-state"><i class="fas fa-search"></i><h3>Complete your profile to see matches</h3></div>'}
      </div>
    </div>`;
}

async function loadFindJobs() {
  const profileRes = await api('GET', '/profile');
  const p = profileRes.profile || {};
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <div style="flex:2;min-width:200px;">
          <label class="form-label">Search Jobs</label>
          <input type="text" id="job-search" class="form-control" placeholder="Job title, skills, company..." onkeydown="if(event.key==='Enter')searchJobs()">
        </div>
        <div style="flex:1;min-width:140px;">
          <label class="form-label">City</label>
          <input type="text" id="job-city" class="form-control" placeholder="e.g. Pune" value="${p.city||''}">
        </div>
        <div style="flex:1;min-width:130px;">
          <label class="form-label">Job Type</label>
          <select id="job-type-filter" class="form-control">
            <option value="">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </div>
        <div style="flex:1;min-width:120px;">
          <label class="form-label">Work Mode</label>
          <select id="job-mode-filter" class="form-control">
            <option value="">All Modes</option>
            <option value="onsite">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="searchJobs()"><i class="fas fa-search"></i> Search</button>
        <button class="btn btn-outline" onclick="clearJobSearch()"><i class="fas fa-times"></i> Clear</button>
      </div>
    </div>
    <div id="jobs-results"><div class="page-loader"><div class="page-loader-inner"></div></div></div>`;
  searchJobs();
}

async function searchJobs(page = 1) {
  const search = document.getElementById('job-search')?.value || '';
  const city = document.getElementById('job-city')?.value || '';
  const job_type = document.getElementById('job-type-filter')?.value || '';
  const work_mode = document.getElementById('job-mode-filter')?.value || '';

  let url = `/jobs?page=${page}&limit=10`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (city) url += `&city=${encodeURIComponent(city)}`;
  if (job_type) url += `&job_type=${job_type}`;
  if (work_mode) url += `&work_mode=${work_mode}`;

  const res = await api('GET', url);
  const jobs = res.jobs || [];
  const container = document.getElementById('jobs-results');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:14px;color:#64748b;">${res.total||0} jobs found ${city?`in "${city}"`:''}</div>
      ${res.total > 0 ? '<span class="badge badge-primary"><i class="fas fa-magic"></i> Sorted by JD Match Score</span>' : ''}
    </div>
    ${jobs.map(j => `
      <div class="job-card" style="margin-bottom:14px;cursor:pointer;" onclick="showJobDetail(${j.id})">
        <div style="display:flex;gap:14px;align-items:start;">
          <div class="company-logo">${(j.company_name||'C')[0].toUpperCase()}</div>
          <div style="flex:1;padding-right:${j.match_score!==undefined?'70px':'0'};">
            <div class="job-title">${j.title}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              <span class="job-company">${j.company_name}</span>
              ${j.is_verified ? '<i class="fas fa-check-circle verified-badge" title="Verified Company"></i>' : ''}
            </div>
            <div class="job-meta">
              ${jobTypeBadge(j.job_type)} ${workModeBadge(j.work_mode)}
              <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${j.city||'Any location'}</span>
              <span class="job-tag"><i class="fas fa-money-bill-wave"></i>${formatSalary(j.salary_min,j.salary_max)}</span>
              <span class="job-tag"><i class="fas fa-briefcase"></i>${j.experience_min||0}-${j.experience_max||'N'} yrs</span>
            </div>
            <div style="margin-top:8px;">${renderSkillTags(JSON.parse(j.skills_required||'[]').slice(0,5))}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:6px;">${timeAgo(j.created_at)} • ${j.applications_count||0} applicants</div>
          </div>
          ${j.match_score !== undefined ? `
          <div class="match-score-badge ${getMatchClass(j.match_score)}" style="flex-shrink:0;">
            ${j.match_score}%<div style="font-size:9px;font-weight:500;">match</div>
          </div>` : ''}
        </div>
      </div>`).join('') || '<div class="empty-state"><i class="fas fa-search"></i><h3>No jobs found</h3><p>Try different search terms or location</p></div>'}
    ${res.totalPages > 1 ? `
      <div style="display:flex;justify-content:center;gap:8px;margin-top:20px;">
        ${Array.from({length:Math.min(res.totalPages,5)}, (_,i) => i+1).map(p => `
          <button class="btn ${p===res.page?'btn-primary':'btn-outline'} btn-sm" onclick="searchJobs(${p})">${p}</button>`).join('')}
      </div>` : ''}`;
}

function clearJobSearch() {
  document.getElementById('job-search').value = '';
  document.getElementById('job-city').value = '';
  document.getElementById('job-type-filter').value = '';
  document.getElementById('job-mode-filter').value = '';
  searchJobs();
}

async function showJobDetail(jobId) {
  const res = await api('GET', `/jobs/${jobId}`);
  if (!res.success) return toast('Could not load job', 'error');
  const j = res.job;
  const skills = JSON.parse(j.skills_required || '[]');
  createModal('job-detail-modal', j.title, `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:16px;background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;color:white;">
      <div class="company-logo" style="width:56px;height:56px;font-size:22px;">${(j.company_name||'C')[0].toUpperCase()}</div>
      <div style="flex:1;">
        <div style="font-size:20px;font-weight:800;">${j.title}</div>
        <div style="opacity:0.85;">${j.company_name} ${j.is_verified?'✓':''}</div>
        <div style="opacity:0.7;font-size:13px;">${j.company_city||j.city||''} • ${j.industry||''}</div>
      </div>
      ${j.match_score > 0 ? `
      <div class="match-score-badge ${getMatchClass(j.match_score)}" style="position:static;">
        ${j.match_score}%<div style="font-size:9px;">match</div>
      </div>` : ''}
    </div>
    <div class="grid-2" style="margin-bottom:16px;">
      <div>${jobTypeBadge(j.job_type)}</div>
      <div>${workModeBadge(j.work_mode)}</div>
      <div><i class="fas fa-map-marker-alt" style="color:#2563eb"></i> ${j.city||'Any'}, ${j.state||''}</div>
      <div><i class="fas fa-money-bill-wave" style="color:#16a34a"></i> ${formatSalary(j.salary_min,j.salary_max)}</div>
      <div><i class="fas fa-briefcase" style="color:#7c3aed"></i> ${j.experience_min||0}-${j.experience_max||'N'} years exp</div>
      <div><i class="fas fa-users" style="color:#d97706"></i> ${j.no_of_openings||1} opening(s)</div>
    </div>
    <div style="margin-bottom:16px;"><b>Required Skills:</b><br><div style="margin-top:8px;">${renderSkillTags(skills)}</div></div>
    <div style="margin-bottom:16px;"><b>Job Description:</b><div style="margin-top:8px;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${j.description}</div></div>
    <div style="margin-bottom:16px;"><b>Requirements:</b><div style="margin-top:8px;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${j.requirements}</div></div>
    ${j.responsibilities ? `<div style="margin-bottom:16px;"><b>Responsibilities:</b><div style="margin-top:8px;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${j.responsibilities}</div></div>` : ''}
    <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
      ${j.hasApplied ?
        '<button class="btn btn-success" disabled><i class="fas fa-check"></i> Already Applied</button>' :
        `<button class="btn btn-primary" onclick="applyJobModal(${j.id},'${j.title.replace(/'/g,'')}')"><i class="fas fa-paper-plane"></i> Apply Now</button>`}
      <button class="btn ${j.isSaved?'btn-warning':'btn-outline'}" onclick="saveJob(${j.id},this)">
        <i class="fas fa-bookmark"></i> ${j.isSaved?'Saved':'Save Job'}
      </button>
    </div>`, 'modal-lg');
}

function applyJobModal(jobId, jobTitle) {
  hideModal('job-detail-modal');
  createModal('apply-modal', `Apply: ${jobTitle}`, `
    <p style="color:#64748b;font-size:14px;margin-bottom:16px;">Your profile will be shared with the employer. Write a cover letter to stand out!</p>
    <div class="form-group">
      <label class="form-label">Cover Letter (optional)</label>
      <textarea id="apply-cover" class="form-control" rows="5" placeholder="Dear Hiring Manager,\n\nI am writing to express my interest in this position..."></textarea>
    </div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-primary" onclick="submitApplication(${jobId})"><i class="fas fa-paper-plane"></i> Submit Application</button>
      <button class="btn btn-outline" onclick="hideModal('apply-modal')">Cancel</button>
    </div>
  `);
}

async function submitApplication(jobId) {
  const cover_letter = document.getElementById('apply-cover')?.value || '';
  const res = await api('POST', `/jobs/${jobId}/apply`, { cover_letter });
  if (res.success) {
    toast(`Applied! Match score: ${res.matchScore}%`, 'success');
    hideModal('apply-modal');
    searchJobs();
  } else toast(res.message, 'error');
}

async function saveJob(jobId, btn) {
  const res = await api('POST', `/jobs/${jobId}/save`);
  if (res.success) {
    btn.innerHTML = `<i class="fas fa-bookmark"></i> ${res.saved ? 'Saved' : 'Save Job'}`;
    btn.className = `btn ${res.saved ? 'btn-warning' : 'btn-outline'}`;
    toast(res.message, 'success');
  }
}

async function loadMyApplications() {
  const res = await api('GET', '/profile/applications/list');
  const apps = res.applications || [];
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div style="margin-bottom:16px;font-size:14px;color:#64748b;">${apps.length} total applications</div>
    ${apps.map(a => `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div class="company-logo">${(a.company_name||'C')[0].toUpperCase()}</div>
              <div>
                <div style="font-weight:700;font-size:16px;">${a.title}</div>
                <div style="color:#2563eb;font-size:14px;">${a.company_name}</div>
              </div>
            </div>
            <div class="job-meta">
              ${jobTypeBadge(a.job_type)} ${workModeBadge(a.work_mode)}
              <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${a.city||'Any'}</span>
              <span class="job-tag"><i class="fas fa-money-bill-wave"></i>${formatSalary(a.salary_min,a.salary_max)}</span>
            </div>
          </div>
          <div style="text-align:right;">
            ${statusBadge(a.status)}
            <div style="margin-top:6px;">
              <span style="font-size:12px;color:#64748b;">Match: </span>
              <span class="badge ${getMatchClass(a.match_score||0)}" style="padding:3px 8px;">${a.match_score||0}%</span>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${timeAgo(a.applied_at)}</div>
          </div>
        </div>
      </div>`).join('') || '<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No applications yet</h3><button class="btn btn-primary" onclick="loadEmployeeSection(\'find-jobs\')">Find Jobs</button></div>'}`;
}

async function loadSavedJobs() {
  const res = await api('GET', '/profile');
  const savedJobs = res.savedJobs || [];
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div style="margin-bottom:16px;font-size:14px;color:#64748b;">${savedJobs.length} saved jobs</div>
    ${savedJobs.map(j => `
      <div class="job-card" style="margin-bottom:14px;">
        <div style="display:flex;gap:14px;align-items:start;">
          <div class="company-logo">${(j.company_name||'C')[0].toUpperCase()}</div>
          <div style="flex:1;">
            <div class="job-title">${j.title}</div>
            <div class="job-company">${j.company_name}</div>
            <div class="job-meta">
              ${jobTypeBadge(j.job_type)}
              <span class="job-tag"><i class="fas fa-map-marker-alt"></i>${j.city||'Any'}</span>
              <span class="job-tag"><i class="fas fa-money-bill-wave"></i>${formatSalary(j.salary_min,j.salary_max)}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-direction:column;align-items:flex-end;">
            <button class="btn btn-primary btn-sm" onclick="showJobDetail(${j.job_id})"><i class="fas fa-eye"></i> View</button>
            <button class="btn btn-outline btn-sm" onclick="unsaveJob(${j.job_id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>`).join('') || '<div class="empty-state"><i class="fas fa-bookmark"></i><h3>No saved jobs</h3><button class="btn btn-primary" onclick="loadEmployeeSection(\'find-jobs\')">Browse Jobs</button></div>'}`;
}

async function unsaveJob(jobId) {
  const res = await api('POST', `/jobs/${jobId}/save`);
  if (res.success) { toast('Job removed from saved', 'info'); loadSavedJobs(); }
}

async function loadMyProfile() {
  const res = await api('GET', '/profile');
  const p = res.profile || {};
  const skills = JSON.parse(p.skills || '[]');
  const education = JSON.parse(p.education || '[]');
  const workExp = JSON.parse(p.work_experience || '[]');
  const reviews = res.reviews || [];
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" onclick="showProfileTab('basic',this)">Basic Info</button>
      <button class="tab-btn" onclick="showProfileTab('skills',this)">Skills & Experience</button>
      <button class="tab-btn" onclick="showProfileTab('reviews',this)">My Reviews (${reviews.length})</button>
    </div>
    <div id="profile-tab-basic">
      <div class="card">
        <div class="card-title"><i class="fas fa-user" style="color:#2563eb"></i> Personal Information</div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Full Name *</label><input type="text" id="p-name" class="form-control" value="${p.full_name||''}"></div>
          <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="p-phone" class="form-control" value="${p.phone||''}"></div>
          <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" id="p-dob" class="form-control" value="${p.date_of_birth||''}"></div>
          <div class="form-group"><label class="form-label">Gender</label>
            <select id="p-gender" class="form-control">
              <option value="">Select</option>
              <option value="male" ${p.gender==='male'?'selected':''}>Male</option>
              <option value="female" ${p.gender==='female'?'selected':''}>Female</option>
              <option value="other" ${p.gender==='other'?'selected':''}>Other</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">City *</label><input type="text" id="p-city" class="form-control" value="${p.city||''}" placeholder="Your city"></div>
          <div class="form-group"><label class="form-label">State</label><input type="text" id="p-state" class="form-control" value="${p.state||''}"></div>
          <div class="form-group"><label class="form-label">Current Job Title</label><input type="text" id="p-jobtitle" class="form-control" value="${p.current_job_title||''}"></div>
          <div class="form-group"><label class="form-label">Current Company</label><input type="text" id="p-company" class="form-control" value="${p.current_company||''}"></div>
          <div class="form-group"><label class="form-label">Total Experience (years)</label><input type="number" id="p-exp" class="form-control" value="${p.total_experience_years||0}" step="0.5" min="0"></div>
          <div class="form-group"><label class="form-label">Expected Salary (INR/yr)</label><input type="number" id="p-expected-sal" class="form-control" value="${p.expected_salary||''}"></div>
          <div class="form-group"><label class="form-label">Notice Period (days)</label><input type="number" id="p-notice" class="form-control" value="${p.notice_period||0}"></div>
          <div class="form-group"><label class="form-label">LinkedIn URL</label><input type="url" id="p-linkedin" class="form-control" value="${p.linkedin_url||''}" placeholder="https://linkedin.com/in/..."></div>
          <div class="form-group"><label class="form-label">GitHub URL</label><input type="url" id="p-github" class="form-control" value="${p.github_url||''}"></div>
          <div class="form-group"><label class="form-label">Portfolio URL</label><input type="url" id="p-portfolio" class="form-control" value="${p.portfolio_url||''}"></div>
        </div>
        <div class="form-group">
          <label class="form-label" style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="p-actively" ${p.is_actively_looking?'checked':''} style="width:16px;height:16px;">
            I am actively looking for jobs
          </label>
        </div>
        <div class="form-group"><label class="form-label">Bio / Summary</label>
          <div style="position:relative;">
            <textarea id="p-bio" class="form-control" rows="4" placeholder="Tell employers about yourself...">${p.bio||''}</textarea>
            <button type="button" class="btn btn-outline btn-sm" id="ai-gen-btn" onclick="generateAISummary()" style="position:absolute;top:8px;right:8px;font-size:11px;padding:4px 8px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;border:none;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:4px;">
              <i class="fas fa-magic"></i> AI Generate
            </button>
          </div>
          <div id="ai-summary-status" style="font-size:12px;color:#7c3aed;margin-top:4px;display:none;"></div>
        </div>
        <div class="btn-row" style="margin-top:4px;">
          <button class="btn btn-primary" onclick="saveBasicProfile()"><i class="fas fa-save"></i> Save Profile</button>
          <button class="btn btn-outline" onclick="generateAISummary()" style="background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;border:none;">
            <i class="fas fa-magic"></i> Auto-Generate Summary
          </button>
          <button class="btn btn-outline" onclick="downloadResumeAsPDF()" style="background:linear-gradient(135deg,#16a34a,#15803d);color:white;border:none;">
            <i class="fas fa-file-pdf"></i> Download as PDF
          </button>
        </div>
      </div>
    </div>
    <div id="profile-tab-skills" style="display:none;">
      <div class="card" style="margin-bottom:16px;">
        <div class="card-title"><i class="fas fa-code" style="color:#7c3aed"></i> Skills (Used for Job Matching)</div>
        <div class="form-group">
          <input type="text" id="skill-input-profile" class="form-control" placeholder="Type skill and press Enter (e.g. React, Python, Node.js)..." onkeydown="addProfileSkill(event)">
        </div>
        <div id="profile-skills-display">${renderSkillTags(skills, true)}</div>
        <input type="hidden" id="profile-skills-data" value='${JSON.stringify(skills)}'>
        <button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="saveSkills()"><i class="fas fa-save"></i> Save Skills</button>
      </div>
      <div class="card">
        <div class="card-title"><i class="fas fa-graduation-cap" style="color:#d97706"></i> Education</div>
        <div id="edu-list">
          ${education.map((e,i) => `
            <div style="padding:12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:start;">
              <div><b>${e.degree}</b> - ${e.institution}<br><span style="color:#64748b;font-size:13px;">${e.year||''} ${e.grade?'• Grade: '+e.grade:''}</span></div>
              <button class="btn btn-danger btn-sm" onclick="removeEducation(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join('') || '<p style="color:#94a3b8;">No education added</p>'}
        </div>
        <button class="btn btn-outline btn-sm" onclick="addEducation()"><i class="fas fa-plus"></i> Add Education</button>
      </div>
    </div>
    <div id="profile-tab-reviews" style="display:none;">
      ${reviews.map(r => `
        <div class="review-card ${r.is_flagged?'review-flag':''}">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div><b>${r.company_name}</b> ${r.is_flagged?'<span class="badge badge-danger"><i class="fas fa-flag"></i> Flagged</span>':''}</div>
            <div class="stars">${stars(r.rating)}</div>
          </div>
          <p style="color:#374151;font-size:14px;margin:10px 0;">${r.review_text||'No comment'}</p>
          ${r.job_title ? `<div style="font-size:12px;color:#64748b;">As: ${r.job_title}</div>` : ''}
          ${r.is_flagged && r.flag_reason ? `<div style="color:#dc2626;font-size:13px;margin-top:8px;"><i class="fas fa-exclamation-triangle"></i> ${r.flag_reason}</div>` : ''}
          <div style="font-size:11px;color:#94a3b8;margin-top:8px;">${timeAgo(r.created_at)}</div>
        </div>`).join('') || '<div class="empty-state"><i class="fas fa-star"></i><h3>No reviews yet</h3></div>'}
    </div>`;

  // Init removable skills
  window._profileSkills = [...skills];
}

function showProfileTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['basic','skills','reviews'].forEach(t => {
    const el = document.getElementById(`profile-tab-${t}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
}

window.removeSkill = function(skill) {
  const current = JSON.parse(document.getElementById('profile-skills-data').value || '[]');
  const updated = current.filter(s => s !== skill);
  document.getElementById('profile-skills-data').value = JSON.stringify(updated);
  document.getElementById('profile-skills-display').innerHTML = renderSkillTags(updated, true);
};

function addProfileSkill(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const input = document.getElementById('skill-input-profile');
    const skill = input.value.replace(',','').trim();
    if (!skill) return;
    const current = JSON.parse(document.getElementById('profile-skills-data').value || '[]');
    if (!current.includes(skill)) {
      current.push(skill);
      document.getElementById('profile-skills-data').value = JSON.stringify(current);
      document.getElementById('profile-skills-display').innerHTML = renderSkillTags(current, true);
    }
    input.value = '';
  }
}

async function saveSkills() {
  const skills = JSON.parse(document.getElementById('profile-skills-data').value || '[]');
  const res = await api('PUT', '/profile', { skills });
  if (res.success) toast('Skills saved!', 'success');
  else toast(res.message, 'error');
}

async function saveBasicProfile() {
  const body = {
    full_name: document.getElementById('p-name').value,
    phone: document.getElementById('p-phone').value,
    date_of_birth: document.getElementById('p-dob').value,
    gender: document.getElementById('p-gender').value,
    city: document.getElementById('p-city').value,
    state: document.getElementById('p-state').value,
    current_job_title: document.getElementById('p-jobtitle').value,
    current_company: document.getElementById('p-company').value,
    total_experience_years: parseFloat(document.getElementById('p-exp').value) || 0,
    expected_salary: parseInt(document.getElementById('p-expected-sal').value) || null,
    notice_period: parseInt(document.getElementById('p-notice').value) || 0,
    linkedin_url: document.getElementById('p-linkedin').value,
    github_url: document.getElementById('p-github').value,
    portfolio_url: document.getElementById('p-portfolio').value,
    is_actively_looking: document.getElementById('p-actively').checked ? 1 : 0,
    bio: document.getElementById('p-bio').value
  };
  const res = await api('PUT', '/profile', body);
  if (res.success) {
    toast('Profile updated!', 'success');
    const stored = JSON.parse(localStorage.getItem('mp_user') || '{}');
    if (stored.profileData) {
      stored.profileData.full_name = body.full_name;
      stored.profileData.city = body.city;
      localStorage.setItem('mp_user', JSON.stringify(stored));
      currentUser = stored;
    }
    // Auto-generate AI summary after profile save if bio is empty
    if (!body.bio || body.bio.trim() === '') {
      setTimeout(() => generateAISummary(true), 500);
    }
  } else toast(res.message, 'error');
}

async function generateAISummary(auto = false) {
  const btn = document.getElementById('ai-gen-btn');
  const statusEl = document.getElementById('ai-summary-status');
  const bioEl = document.getElementById('p-bio');

  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    btn.disabled = true;
  }
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = '<i class="fas fa-magic"></i> AI is generating your professional summary...';
  }

  try {
    const res = await api('POST', '/profile/generate-summary', {});
    if (res.success) {
      if (bioEl) bioEl.value = res.summary;
      if (statusEl) {
        statusEl.innerHTML = '<i class="fas fa-check-circle" style="color:#16a34a"></i> Summary generated and saved automatically!';
        setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
      }
      if (!auto) toast('AI summary generated!', 'success');
    } else {
      if (statusEl) {
        statusEl.innerHTML = `<i class="fas fa-times-circle" style="color:#dc2626"></i> ${res.message}`;
        setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
      }
      if (!auto) toast(res.message, 'error');
    }
  } catch (e) {
    if (statusEl) { statusEl.style.display = 'none'; }
    if (!auto) toast('Failed to generate summary', 'error');
  } finally {
    if (btn) {
      btn.innerHTML = '<i class="fas fa-magic"></i> AI Generate';
      btn.disabled = false;
    }
  }
}

function addEducation() {
  createModal('edu-modal', 'Add Education', `
    <div class="form-group"><label class="form-label">Degree/Qualification *</label><input type="text" id="edu-degree" class="form-control" placeholder="e.g. B.E. Computer Science"></div>
    <div class="form-group"><label class="form-label">Institution *</label><input type="text" id="edu-inst" class="form-control" placeholder="e.g. Pune University"></div>
    <div class="form-group"><label class="form-label">Year</label><input type="text" id="edu-year" class="form-control" placeholder="e.g. 2020"></div>
    <div class="form-group"><label class="form-label">Grade/CGPA</label><input type="text" id="edu-grade" class="form-control" placeholder="e.g. 8.5 CGPA"></div>
    <div style="display:flex;gap:10px;">
      <button class="btn btn-primary" onclick="saveEducation()"><i class="fas fa-save"></i> Add</button>
      <button class="btn btn-outline" onclick="hideModal('edu-modal')">Cancel</button>
    </div>`);
}

async function saveEducation() {
  const edu = {
    degree: document.getElementById('edu-degree').value,
    institution: document.getElementById('edu-inst').value,
    year: document.getElementById('edu-year').value,
    grade: document.getElementById('edu-grade').value
  };
  if (!edu.degree || !edu.institution) return toast('Please fill required fields', 'error');
  const res1 = await api('GET', '/profile');
  const current = JSON.parse(res1.profile?.education || '[]');
  current.push(edu);
  const res = await api('PUT', '/profile', { education: current });
  if (res.success) { toast('Education added!', 'success'); hideModal('edu-modal'); loadMyProfile(); }
}

async function removeEducation(idx) {
  const res1 = await api('GET', '/profile');
  const current = JSON.parse(res1.profile?.education || '[]');
  current.splice(idx, 1);
  const res = await api('PUT', '/profile', { education: current });
  if (res.success) { toast('Removed', 'info'); loadMyProfile(); }
}

// =============================================
// RESUME PDF DOWNLOAD
// =============================================
async function downloadResumeAsPDF() {
  toast('Preparing your resume...', 'info');

  // Fetch latest profile data
  const res = await api('GET', '/profile');
  if (!res.success) { toast('Failed to load profile', 'error'); return; }

  const p = res.profile || {};
  const skills     = JSON.parse(p.skills || '[]');
  const education  = JSON.parse(p.education || '[]');
  const workExp    = JSON.parse(p.work_experience || '[]');
  const certs      = JSON.parse(p.certifications || '[]');
  const langs      = JSON.parse(p.languages || '[]');

  const name    = p.full_name || 'Your Name';
  const title   = p.current_job_title || '';
  const email   = res.profile?.email || currentUser?.email || '';
  const phone   = p.phone || '';
  const city    = [p.city, p.state, p.country].filter(Boolean).join(', ');
  const exp     = p.total_experience_years ? `${p.total_experience_years} Years Experience` : '';
  const bio     = p.bio || '';
  const linkedin = p.linkedin_url || '';
  const github   = p.github_url || '';
  const portfolio = p.portfolio_url || '';

  const sectionTitle = (icon, text) =>
    `<div style="display:flex;align-items:center;gap:8px;margin:22px 0 10px;border-bottom:2px solid #2563eb;padding-bottom:5px;">
       <span style="color:#2563eb;font-size:16px;">${icon}</span>
       <span style="font-size:15px;font-weight:700;color:#1e3a5f;letter-spacing:0.5px;">${text}</span>
     </div>`;

  const contactLine = (icon, val, href = '') => val
    ? `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:16px;font-size:12px;color:#374151;">
         <span style="color:#2563eb;">${icon}</span>
         ${href ? `<a href="${href}" style="color:#374151;text-decoration:none;">${val}</a>` : val}
       </span>`
    : '';

  const skillsHtml = skills.length
    ? skills.map(s => `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border-radius:20px;padding:3px 12px;margin:3px;font-size:12px;font-weight:500;">${s}</span>`).join('')
    : '<span style="color:#94a3b8;font-size:13px;">No skills added</span>';

  const eduHtml = education.length
    ? education.map(e => `
        <div style="margin-bottom:10px;">
          <div style="font-weight:600;font-size:13px;color:#1e3a5f;">${e.degree || ''}</div>
          <div style="font-size:12px;color:#374151;">${e.institution || ''}</div>
          <div style="font-size:11px;color:#64748b;">${[e.year, e.grade ? 'Grade: '+e.grade : ''].filter(Boolean).join(' · ')}</div>
        </div>`).join('')
    : '<p style="color:#94a3b8;font-size:13px;">No education added</p>';

  const workHtml = workExp.length
    ? workExp.map(w => `
        <div style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <div style="font-weight:600;font-size:13px;color:#1e3a5f;">${w.title || w.role || 'Role'}</div>
              <div style="font-size:12px;color:#374151;">${w.company || ''} ${w.location ? '· '+w.location : ''}</div>
            </div>
            <div style="font-size:11px;color:#64748b;white-space:nowrap;">${w.duration || w.years || ''}</div>
          </div>
          ${w.description ? `<div style="font-size:12px;color:#475569;margin-top:4px;line-height:1.5;">${w.description}</div>` : ''}
        </div>`).join('')
    : '<p style="color:#94a3b8;font-size:13px;">No work experience added</p>';

  const certsHtml = certs.length
    ? certs.map(c => `<div style="font-size:12px;color:#374151;margin-bottom:4px;">✔ ${c}</div>`).join('')
    : '';

  const langsHtml = langs.length
    ? langs.map(l => `<span style="display:inline-block;background:#f0fdf4;color:#166534;border-radius:20px;padding:3px 12px;margin:3px;font-size:12px;border:1px solid #86efac;">${l}</span>`).join('')
    : '';

  const linksHtml = [
    linkedin ? `<div style="font-size:12px;margin-bottom:3px;">🔗 LinkedIn: <a href="${linkedin}" style="color:#2563eb;">${linkedin}</a></div>` : '',
    github ? `<div style="font-size:12px;margin-bottom:3px;">💻 GitHub: <a href="${github}" style="color:#2563eb;">${github}</a></div>` : '',
    portfolio ? `<div style="font-size:12px;margin-bottom:3px;">🌐 Portfolio: <a href="${portfolio}" style="color:#2563eb;">${portfolio}</a></div>` : '',
  ].filter(Boolean).join('');

  const salaryLine = p.expected_salary
    ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">Expected Salary: <b>₹${(p.expected_salary/100000).toFixed(1)}L/yr</b> · Notice: <b>${p.notice_period || 0} days</b></div>` : '';

  const resumeHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resume - ${name}</title>
  <style>
    @page { margin: 15mm 18mm; size: A4; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: white; font-size: 13px; line-height: 1.6; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 28px 32px 22px; }
    .name { font-size: 28px; font-weight: 800; letter-spacing: 0.5px; }
    .job-title { font-size: 15px; opacity: 0.9; margin-top: 4px; font-weight: 400; }
    .contact-bar { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 4px; }
    .contact-item { display: inline-flex; align-items: center; gap: 5px; margin-right: 14px; font-size: 12px; opacity: 0.92; }
    .body { padding: 0 32px 24px; }
    .two-col { display: grid; grid-template-columns: 1fr 260px; gap: 28px; margin-top: 6px; }
    .left { }
    .right { border-left: 1px solid #e2e8f0; padding-left: 20px; }
    a { color: #2563eb; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${name}</div>
    ${title ? `<div class="job-title">${title}${exp ? ' · ' + exp : ''}</div>` : (exp ? `<div class="job-title">${exp}</div>` : '')}
    <div class="contact-bar">
      ${email ? `<span class="contact-item">✉ ${email}</span>` : ''}
      ${phone ? `<span class="contact-item">📞 ${phone}</span>` : ''}
      ${city ? `<span class="contact-item">📍 ${city}</span>` : ''}
      ${p.is_actively_looking ? `<span class="contact-item">🟢 Actively Looking</span>` : ''}
    </div>
    ${salaryLine ? `<div style="margin-top:8px;font-size:12px;opacity:0.88;">${salaryLine.replace(/<[^>]*>/g,'').trim()}</div>` : ''}
  </div>

  <div class="body">
    <div class="two-col">
      <div class="left">
        ${bio ? `
          ${sectionTitle('👤', 'Professional Summary')}
          <p style="font-size:13px;color:#374151;line-height:1.7;">${bio}</p>` : ''}

        ${workExp.length ? `
          ${sectionTitle('💼', 'Work Experience')}
          ${workHtml}` : ''}

        ${education.length ? `
          ${sectionTitle('🎓', 'Education')}
          ${eduHtml}` : ''}

        ${certs.length ? `
          ${sectionTitle('🏆', 'Certifications')}
          ${certsHtml}` : ''}
      </div>

      <div class="right">
        ${skills.length ? `
          ${sectionTitle('⚡', 'Skills')}
          <div>${skillsHtml}</div>` : ''}

        ${langs.length ? `
          ${sectionTitle('🌐', 'Languages')}
          <div>${langsHtml}</div>` : ''}

        ${(linkedin || github || portfolio) ? `
          ${sectionTitle('🔗', 'Links')}
          ${linksHtml}` : ''}

        ${p.expected_salary ? `
          ${sectionTitle('💰', 'Preferences')}
          <div style="font-size:12px;color:#374151;">Expected: <b>₹${(p.expected_salary/100000).toFixed(1)}L/yr</b></div>
          <div style="font-size:12px;color:#374151;">Notice Period: <b>${p.notice_period || 0} days</b></div>` : ''}
      </div>
    </div>
  </div>
</body>
</html>`;

  // Open in new tab and trigger print dialog (browser saves as PDF)
  const printWin = window.open('', '_blank', 'width=850,height=1100');
  printWin.document.write(resumeHTML);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 600);

  toast('Resume ready! Use "Save as PDF" in the print dialog.', 'success');
}

// Make functions globally accessible
window.generateAISummary = generateAISummary;
window.saveBasicProfile = saveBasicProfile;
window.downloadResumeAsPDF = downloadResumeAsPDF;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;

// =============================================
// APP INITIALIZATION
// =============================================
async function initApp() {
  const token = localStorage.getItem('mp_token');
  const storedUser = localStorage.getItem('mp_user');
  if (token && storedUser) {
    currentUser = JSON.parse(storedUser);
    // Verify token
    const res = await api('GET', '/auth/me');
    if (res.success) {
      currentUser = { ...currentUser, ...res.user };
      localStorage.setItem('mp_user', JSON.stringify(currentUser));
      routeByRole(currentUser.role);
    } else {
      localStorage.removeItem('mp_token');
      localStorage.removeItem('mp_user');
      renderLogin();
    }
  } else {
    renderLogin();
  }
}

// Start app
document.addEventListener('DOMContentLoaded', initApp);

