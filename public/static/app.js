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
          <div style="text-align:center;margin-top:12px;">
            <a href="#" onclick="showForgotPassword();return false;" style="font-size:13px;color:#2563eb;text-decoration:none;"><i class="fas fa-key"></i> Forgot Password?</a>
          </div>
          <div style="margin-top:12px;padding:12px;background:#f0f9ff;border-radius:10px;font-size:12px;color:#0369a1;">
            <b>Demo Credentials:</b><br>
            Admin: admin@myplacement.com / admin123<br>
            Employer: hr@techcorp.com / company123<br>
            Employee: rahul@example.com / employee123
          </div>
        </div>

        <div id="forgot-password-form" style="display:none;">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:36px;margin-bottom:8px;">🔑</div>
            <h3 style="font-size:16px;font-weight:700;color:#1e3a5f;margin:0;">Reset Password</h3>
            <p style="font-size:13px;color:#64748b;margin-top:4px;">Enter your email to get a reset token</p>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="forgot-email" class="form-control" placeholder="your@email.com">
          </div>
          <button class="btn btn-primary btn-block" onclick="doForgotPassword()">
            <i class="fas fa-paper-plane"></i> Get Reset Token
          </button>
          <div id="forgot-token-section" style="display:none;margin-top:14px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
              <div style="font-size:12px;color:#16a34a;font-weight:600;"><i class="fas fa-check-circle"></i> Token generated!</div>
              <div style="font-size:12px;color:#374151;margin-top:4px;">Your reset token: <code id="forgot-token-display" style="font-weight:700;background:#dcfce7;padding:2px 6px;border-radius:4px;"></code></div>
              <div style="font-size:11px;color:#64748b;margin-top:4px;">Valid for 1 hour. Enter it below to set new password.</div>
            </div>
            <div class="form-group">
              <label class="form-label">Reset Token</label>
              <input type="text" id="reset-token" class="form-control" placeholder="Paste token here">
            </div>
            <div class="form-group">
              <label class="form-label">New Password</label>
              <input type="password" id="reset-new-password" class="form-control" placeholder="Min 6 characters">
            </div>
            <button class="btn btn-primary btn-block" onclick="doResetPassword()">
              <i class="fas fa-lock"></i> Reset Password
            </button>
          </div>
          <div style="text-align:center;margin-top:12px;">
            <a href="#" onclick="switchAuthTab('login');document.getElementById('forgot-password-form').style.display='none';document.getElementById('login-form').style.display='block';return false;" style="font-size:13px;color:#2563eb;text-decoration:none;">
              <i class="fas fa-arrow-left"></i> Back to Login
            </a>
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
  document.getElementById('forgot-password-form').style.display = 'none';
  document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
  document.getElementById('tab-login').style.background = isLogin ? '#2563eb' : 'transparent';
  document.getElementById('tab-login').style.color = isLogin ? 'white' : '#64748b';
  document.getElementById('tab-register').style.background = !isLogin ? '#2563eb' : 'transparent';
  document.getElementById('tab-register').style.color = !isLogin ? 'white' : '#64748b';
}

function showForgotPassword() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('forgot-password-form').style.display = 'block';
  document.getElementById('forgot-token-section').style.display = 'none';
}

async function doForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return toast('Please enter your email', 'error');
  const res = await api('POST', '/auth/forgot-password', { email }, false);
  if (res.success) {
    if (res.token) {
      document.getElementById('forgot-token-section').style.display = 'block';
      document.getElementById('forgot-token-display').textContent = res.token;
      document.getElementById('reset-token').value = res.token;
      toast('Token generated! Set your new password below.', 'success');
    } else {
      toast(res.message, 'info');
    }
  } else toast(res.message, 'error');
}

async function doResetPassword() {
  const token = document.getElementById('reset-token').value.trim();
  const newPass = document.getElementById('reset-new-password').value;
  if (!token || !newPass) return toast('Token and new password are required', 'error');
  if (newPass.length < 6) return toast('Password must be at least 6 characters', 'error');
  const res = await api('POST', '/auth/reset-password', { token, new_password: newPass }, false);
  if (res.success) {
    toast(res.message, 'success');
    setTimeout(() => {
      document.getElementById('forgot-password-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    }, 1500);
  } else toast(res.message, 'error');
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

function showChangePasswordModal() {
  createModal('change-my-pass', '🔑 Change My Password', `
    <div class="form-group">
      <label class="form-label">Current Password *</label>
      <input type="password" id="cur-pass" class="form-control" placeholder="Enter current password" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">New Password *</label>
      <input type="password" id="my-new-pass" class="form-control" placeholder="Min 6 characters">
    </div>
    <div class="form-group">
      <label class="form-label">Confirm New Password *</label>
      <input type="password" id="my-confirm-pass" class="form-control" placeholder="Repeat new password">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button class="btn btn-primary" onclick="doChangeMyPassword()"><i class="fas fa-save"></i> Update Password</button>
      <button class="btn btn-outline" onclick="hideModal('change-my-pass')">Cancel</button>
    </div>
  `);
}

async function doChangeMyPassword() {
  const cur = document.getElementById('cur-pass').value;
  const np = document.getElementById('my-new-pass').value;
  const cp = document.getElementById('my-confirm-pass').value;
  if (!cur || !np) return toast('Please fill all fields', 'error');
  if (np.length < 6) return toast('New password must be at least 6 characters', 'error');
  if (np !== cp) return toast('New passwords do not match', 'error');
  const res = await api('POST', '/auth/change-password', { current_password: cur, new_password: np });
  if (res.success) { toast(res.message, 'success'); hideModal('change-my-pass'); }
  else toast(res.message, 'error');
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
      { id: 'review-requests', icon: 'fa-trash-alt', label: 'Removal Requests' },
      { id: 'users', icon: 'fa-user-cog', label: 'Users' },
    ],
    employer: [
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'post-job', icon: 'fa-plus-circle', label: 'Post New Job' },
      { id: 'my-jobs', icon: 'fa-briefcase', label: 'My Jobs' },
      { id: 'applications', icon: 'fa-file-alt', label: 'Applications' },
      { id: 'hrms', icon: 'fa-id-badge', label: 'HRMS' },
      { id: 'reviews', icon: 'fa-star', label: 'Employee Reviews' },
      { id: 'company-profile', icon: 'fa-building', label: 'Company Profile' },
    ],
    employee: [
      { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
      { id: 'find-jobs', icon: 'fa-search', label: 'Find Jobs' },
      { id: 'my-applications', icon: 'fa-file-alt', label: 'My Applications' },
      { id: 'saved-jobs', icon: 'fa-bookmark', label: 'Saved Jobs' },
      { id: 'my-reviews', icon: 'fa-star', label: 'My Reviews' },
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
          <button class="logout-btn" onclick="showChangePasswordModal()" title="Change Password" style="margin-right:2px;background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:6px;">
            <i class="fas fa-key"></i>
          </button>
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
  else if (section === 'review-requests') await loadAdminReviewRequests();
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
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="font-size:18px;font-weight:700;color:#1e3a5f;margin:0;"><i class="fas fa-building"></i> All Companies (${(res.companies||[]).length})</h2>
      <button class="btn btn-primary" onclick="showCreateCompanyModal()"><i class="fas fa-plus"></i> Create New Company</button>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
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
                <td>${[c.city,c.state].filter(Boolean).join(', ')||'-'}</td>
                <td><span class="badge badge-primary">${c.active_jobs||0} active</span></td>
                <td>
                  ${c.is_verified ? '<span class="badge badge-success"><i class="fas fa-check"></i> Verified</span>' : '<span class="badge badge-warning">Pending</span>'}
                  ${!c.is_active ? ' <span class="badge badge-danger">Disabled</span>' : ''}
                </td>
                <td>
                  <div style="display:flex;gap:5px;flex-wrap:wrap;">
                    <button class="btn btn-sm ${c.is_verified?'btn-outline':'btn-success'}" onclick="adminVerifyCompany(${c.id},${c.is_verified?0:1})">
                      <i class="fas fa-${c.is_verified?'times':'check'}"></i> ${c.is_verified?'Unverify':'Verify'}
                    </button>
                    <button class="btn btn-sm ${c.is_active?'btn-warning':'btn-success'}" onclick="adminToggleCompany(${c.id})">
                      <i class="fas fa-${c.is_active?'ban':'check-circle'}"></i> ${c.is_active?'Disable':'Enable'}
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="adminChangeCompanyPassword(${c.id},'${(c.company_name||'').replace(/'/g,'')}')">
                      <i class="fas fa-key"></i> Password
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="adminDeleteCompany(${c.id},'${c.company_name}')">
                      <i class="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </td>
              </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No companies found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function showCreateCompanyModal() {
  createModal('create-company-modal', 'Create New Company', `
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Company Name *</label><input type="text" id="cc-name" class="form-control" placeholder="e.g. TechCorp Pvt Ltd"></div>
      <div class="form-group"><label class="form-label">Login Email *</label><input type="email" id="cc-email" class="form-control" placeholder="hr@company.com"></div>
      <div class="form-group"><label class="form-label">Login Password *</label><input type="password" id="cc-pass" class="form-control" placeholder="Min 6 characters"></div>
      <div class="form-group"><label class="form-label">Industry</label><input type="text" id="cc-industry" class="form-control" placeholder="e.g. IT, Finance, Healthcare"></div>
      <div class="form-group"><label class="form-label">City</label><input type="text" id="cc-city" class="form-control" placeholder="Mumbai"></div>
      <div class="form-group"><label class="form-label">State</label><input type="text" id="cc-state" class="form-control" placeholder="Maharashtra"></div>
      <div class="form-group"><label class="form-label">Website</label><input type="url" id="cc-website" class="form-control" placeholder="https://company.com"></div>
      <div class="form-group"><label class="form-label">Contact Phone</label><input type="tel" id="cc-phone" class="form-control" placeholder="+91 9876543210"></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button class="btn btn-primary" onclick="adminCreateCompany()"><i class="fas fa-plus"></i> Create Company</button>
      <button class="btn btn-outline" onclick="hideModal('create-company-modal')">Cancel</button>
    </div>
  `);
}

async function adminCreateCompany() {
  const body = {
    company_name: document.getElementById('cc-name').value.trim(),
    email: document.getElementById('cc-email').value.trim(),
    password: document.getElementById('cc-pass').value,
    industry: document.getElementById('cc-industry').value.trim(),
    city: document.getElementById('cc-city').value.trim(),
    state: document.getElementById('cc-state').value.trim(),
    website: document.getElementById('cc-website').value.trim(),
    contact_phone: document.getElementById('cc-phone').value.trim(),
  };
  if (!body.company_name || !body.email || !body.password) return toast('Company name, email and password are required', 'error');
  if (body.password.length < 6) return toast('Password must be at least 6 characters', 'error');
  const res = await api('POST', '/admin/companies', body);
  if (res.success) { toast(res.message, 'success'); hideModal('create-company-modal'); loadAdminCompanies(); }
  else toast(res.message, 'error');
}

async function adminVerifyCompany(id, status) {
  const res = await api('PUT', `/admin/companies/${id}/verify`, { is_verified: status });
  if (res.success) { toast(res.message, 'success'); loadAdminCompanies(); }
  else toast(res.message, 'error');
}

async function adminToggleCompany(id) {
  const res = await api('PUT', `/admin/companies/${id}/toggle`);
  if (res.success) { toast(res.message, 'success'); loadAdminCompanies(); }
  else toast(res.message, 'error');
}

async function adminDeleteCompany(id, name) {
  createModal('confirm-delete-company', '⚠️ Delete Company', `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:48px;margin-bottom:12px;">🗑️</div>
      <p style="font-size:15px;color:#374151;margin-bottom:6px;">Are you sure you want to delete</p>
      <p style="font-size:18px;font-weight:700;color:#dc2626;">${name}?</p>
      <p style="font-size:13px;color:#64748b;margin-top:8px;">This will permanently delete the company and all associated jobs. This action cannot be undone.</p>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
      <button class="btn btn-danger" onclick="confirmDeleteCompany(${id})"><i class="fas fa-trash"></i> Yes, Delete</button>
      <button class="btn btn-outline" onclick="hideModal('confirm-delete-company')">Cancel</button>
    </div>
  `);
}

async function confirmDeleteCompany(id) {
  const res = await api('DELETE', `/admin/companies/${id}`);
  if (res.success) { toast(res.message, 'success'); hideModal('confirm-delete-company'); loadAdminCompanies(); }
  else toast(res.message, 'error');
}

// ── Admin: Change Company Password ──
function adminChangeCompanyPassword(id, name) {
  createModal('change-comp-pass', `🔑 Change Password — ${name}`, `
    <p style="font-size:13px;color:#64748b;margin-bottom:16px;">Set a new login password for this company account.</p>
    <div class="form-group">
      <label class="form-label">New Password *</label>
      <input type="password" id="new-comp-pass" class="form-control" placeholder="Min 6 characters" autofocus>
    </div>
    <div class="form-group">
      <label class="form-label">Confirm Password *</label>
      <input type="password" id="confirm-comp-pass" class="form-control" placeholder="Repeat password">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button class="btn btn-primary" onclick="confirmChangeCompanyPassword(${id})"><i class="fas fa-save"></i> Update Password</button>
      <button class="btn btn-outline" onclick="hideModal('change-comp-pass')">Cancel</button>
    </div>
  `);
}

async function confirmChangeCompanyPassword(id) {
  const np = document.getElementById('new-comp-pass').value;
  const cp = document.getElementById('confirm-comp-pass').value;
  if (!np || np.length < 6) return toast('Password must be at least 6 characters', 'error');
  if (np !== cp) return toast('Passwords do not match', 'error');
  const res = await api('PUT', `/admin/companies/${id}/password`, { new_password: np });
  if (res.success) { toast(res.message, 'success'); hideModal('change-comp-pass'); }
  else toast(res.message, 'error');
}

let _adminEmpData = [];

async function loadAdminEmployees(q = '', city = '', flag = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (city) params.set('city', city);
  if (flag) params.set('flag', flag);
  const res = await api('GET', `/admin/employees/search?${params.toString()}`);
  _adminEmpData = res.employees || [];
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="font-size:18px;font-weight:700;color:#1e3a5f;margin:0;"><i class="fas fa-users"></i> Employees (${_adminEmpData.length})</h2>
      <button class="btn btn-outline btn-sm" onclick="downloadEmployeesCSV()"><i class="fas fa-download"></i> Download CSV</button>
    </div>
    <div class="card" style="margin-bottom:16px;padding:14px;">
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;align-items:end;flex-wrap:wrap;">
        <div class="form-group" style="margin:0;">
          <label class="form-label">Search (name / email / job title)</label>
          <input type="text" id="emp-search-q" class="form-control" placeholder="Type to search..." value="${q}" oninput="debounceAdminEmpSearch()">
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">City</label>
          <input type="text" id="emp-search-city" class="form-control" placeholder="e.g. Mumbai" value="${city}" oninput="debounceAdminEmpSearch()">
        </div>
        <div class="form-group" style="margin:0;">
          <label class="form-label">Filter</label>
          <select id="emp-search-flag" class="form-control" onchange="debounceAdminEmpSearch()">
            <option value="" ${!flag?'selected':''}>All Employees</option>
            <option value="true" ${flag==='true'?'selected':''}>Flagged Only</option>
          </select>
        </div>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Employee</th><th>Location</th><th>Exp</th><th>Applications</th><th>Rating</th><th>Flags</th><th>Status</th></tr></thead>
          <tbody>
            ${_adminEmpData.map(e => `
              <tr>
                <td>
                  <div style="font-weight:600;">${e.full_name}</div>
                  <div style="font-size:12px;color:#64748b;">${e.email}</div>
                  <div style="font-size:12px;color:#94a3b8;">${e.current_job_title||'-'}</div>
                </td>
                <td>${[e.city,e.state].filter(Boolean).join(', ')||'-'}</td>
                <td>${e.total_experience_years||0} yrs</td>
                <td>${e.total_applications||0}</td>
                <td>${e.avg_rating ? parseFloat(e.avg_rating).toFixed(1)+' ⭐' : '-'}</td>
                <td>${e.flag_count > 0 ? '<span class="badge badge-danger">'+e.flag_count+' flags</span>' : '<span class="badge badge-success">Clean</span>'}</td>
                <td>${e.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
              </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:30px;color:#94a3b8;">No employees found</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

let _adminEmpTimer = null;
function debounceAdminEmpSearch() {
  clearTimeout(_adminEmpTimer);
  _adminEmpTimer = setTimeout(() => {
    const q = document.getElementById('emp-search-q')?.value || '';
    const city = document.getElementById('emp-search-city')?.value || '';
    const flag = document.getElementById('emp-search-flag')?.value || '';
    loadAdminEmployees(q, city, flag);
  }, 400);
}

function downloadEmployeesCSV() {
  if (!_adminEmpData.length) return toast('No data to download', 'error');
  const headers = ['Name','Email','Job Title','City','State','Experience (yrs)','Applications','Avg Rating','Flag Count','Status','Joined'];
  const rows = _adminEmpData.map(e => [
    e.full_name, e.email, e.current_job_title||'',
    e.city||'', e.state||'', e.total_experience_years||0,
    e.total_applications||0,
    e.avg_rating ? parseFloat(e.avg_rating).toFixed(1) : '',
    e.flag_count||0,
    e.is_active ? 'Active' : 'Inactive',
    e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : ''
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('CSV downloaded!', 'success');
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

// ── Admin: Review Removal Requests ──
async function loadAdminReviewRequests() {
  const [pendingRes, allRes] = await Promise.all([
    api('GET', '/admin/review-removal-requests?status=pending'),
    api('GET', '/admin/review-removal-requests'),
  ]);
  const pending = pendingRes.requests || [];
  const all = allRes.requests || [];
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h2 style="font-size:18px;font-weight:700;color:#1e3a5f;margin:0;"><i class="fas fa-trash-alt"></i> Review Removal Requests</h2>
      ${pending.length ? '<span class="badge badge-danger" style="font-size:13px;padding:6px 12px;">'+pending.length+' Pending</span>' : ''}
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="showRRTab('pending',this)">Pending (${pending.length})</button>
      <button class="tab-btn" onclick="showRRTab('all',this)">All Requests (${all.length})</button>
    </div>
    <div id="rr-tab-pending">
      ${pending.length ? pending.map(r => renderRemovalRequestCard(r)).join('') : '<div class="empty-state"><i class="fas fa-check-circle" style="color:#16a34a"></i><h3>No pending requests</h3></div>'}
    </div>
    <div id="rr-tab-all" style="display:none;">
      ${all.length ? all.map(r => renderRemovalRequestCard(r)).join('') : '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No requests yet</h3></div>'}
    </div>`;
}

function showRRTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('rr-tab-pending').style.display = tab === 'pending' ? 'block' : 'none';
  document.getElementById('rr-tab-all').style.display = tab === 'all' ? 'block' : 'none';
}

function renderRemovalRequestCard(r) {
  const statusColor = { pending: '#f59e0b', approved: '#16a34a', rejected: '#dc2626' };
  return `
    <div class="card" style="margin-bottom:14px;border-left:3px solid ${statusColor[r.status]||'#e2e8f0'};">
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <div>
          <div style="font-weight:700;font-size:15px;">${r.employee_name} <span style="font-size:12px;color:#64748b;">(${r.employee_email})</span></div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Review by: <b>${r.company_name}</b> · ${r.rating}★</div>
        </div>
        <span class="badge" style="background:${statusColor[r.status]||'#94a3b8'};color:white;font-size:12px;padding:4px 10px;border-radius:20px;">${r.status.toUpperCase()}</span>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
        <div style="font-size:12px;color:#64748b;font-weight:600;margin-bottom:4px;">Review Text:</div>
        <div style="font-size:13px;color:#374151;">${r.review_text||'-'}</div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="font-size:12px;color:#64748b;font-weight:600;">Employee's Reason:</div>
        <div style="font-size:13px;color:#374151;">${r.reason}</div>
        ${r.payment_ref ? '<div style="font-size:12px;color:#2563eb;margin-top:4px;"><i class="fas fa-credit-card"></i> Payment ref: <b>'+r.payment_ref+'</b></div>' : '<div style="font-size:12px;color:#f59e0b;margin-top:4px;"><i class="fas fa-exclamation-circle"></i> No payment reference provided</div>'}
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;">Requested: ${timeAgo(r.created_at)}</div>
      ${r.status === 'pending' ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-success" onclick="processRemovalRequest(${r.id},'approved')">
            <i class="fas fa-check"></i> Approve & Delete Review
          </button>
          <button class="btn btn-sm btn-danger" onclick="processRemovalRequest(${r.id},'rejected')">
            <i class="fas fa-times"></i> Reject
          </button>
        </div>` : `<div style="font-size:12px;color:#64748b;">${r.admin_notes ? '<i class="fas fa-comment"></i> Admin note: '+r.admin_notes : ''}</div>`}
    </div>`;
}

function processRemovalRequest(reqId, status) {
  const isApprove = status === 'approved';
  createModal('process-rr-modal', isApprove ? '✅ Approve Request' : '❌ Reject Request', `
    <p style="font-size:14px;color:#374151;margin-bottom:14px;">
      ${isApprove ? 'Approve this removal request? The review will be permanently deleted.' : 'Reject this removal request? Employee will be notified.'}
    </p>
    ${isApprove ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;font-size:13px;color:#16a34a;margin-bottom:12px;"><i class="fas fa-info-circle"></i> Ensure payment of ₹499 has been received before approving.</div>' : ''}
    <div class="form-group">
      <label class="form-label">Admin Notes (optional)</label>
      <input type="text" id="rr-admin-notes" class="form-control" placeholder="e.g. Payment verified, review deleted / Reason not sufficient">
    </div>
    <div class="form-group">
      <label class="form-label">Amount Charged (₹)</label>
      <input type="number" id="rr-amount" class="form-control" value="499">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn ${isApprove?'btn-success':'btn-danger'}" onclick="confirmProcessRR(${reqId},'${status}',${isApprove})">
        <i class="fas fa-${isApprove?'check':'times'}"></i> Confirm ${isApprove?'Approve':'Reject'}
      </button>
      <button class="btn btn-outline" onclick="hideModal('process-rr-modal')">Cancel</button>
    </div>
  `);
}

async function confirmProcessRR(reqId, status, deleteReview) {
  const notes = document.getElementById('rr-admin-notes')?.value?.trim();
  const amount = parseFloat(document.getElementById('rr-amount')?.value) || 499;
  const res = await api('PUT', `/admin/review-removal-requests/${reqId}`, {
    status, admin_notes: notes, amount_charged: amount, delete_review: deleteReview
  });
  if (res.success) {
    toast(res.message, 'success');
    hideModal('process-rr-modal');
    loadAdminReviewRequests();
  } else toast(res.message, 'error');
}

function renderAdminReviewCard(r) {
  return `
    <div class="review-card ${r.is_flagged ? 'review-flag' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <div>
          <span style="font-weight:700;">${r.employee_name}</span>
          <span style="color:#64748b;font-size:13px;"> reviewed by </span>
          <span style="font-weight:600;color:#2563eb;">${r.company_name}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <div class="stars">${stars(r.rating)}</div>
          ${r.is_flagged ? '<span class="badge badge-danger"><i class="fas fa-flag"></i> Flagged</span>' : ''}
        </div>
      </div>
      <p style="color:#374151;font-size:14px;margin:8px 0;">${r.review_text||'No review text'}</p>
      ${r.flag_reason ? `<p style="color:#dc2626;font-size:12px;"><i class="fas fa-exclamation-triangle"></i> ${r.flag_reason}</p>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="btn btn-sm ${r.is_flagged?'btn-success':'btn-warning'}" onclick="adminFlagReview(${r.id},${r.is_flagged?0:1})">
          ${r.is_flagged?'<i class="fas fa-check"></i> Remove Flag':'<i class="fas fa-flag"></i> Flag'}
        </button>
        <button class="btn btn-sm btn-danger" onclick="adminDeleteReview(${r.id})">
          <i class="fas fa-trash"></i> Delete Review
        </button>
      </div>
      <div style="font-size:11px;color:#94a3b8;margin-top:8px;">${timeAgo(r.created_at)}</div>
    </div>`;
}

async function adminFlagReview(id, flag) {
  const res = await api('PUT', `/reviews/${id}/flag`, { is_flagged: flag, flag_reason: flag ? 'Flagged by admin' : '' });
  if (res.success) { toast('Review updated', 'success'); loadAdminReviews(); }
}

async function adminDeleteReview(id) {
  createModal('confirm-del-review', '⚠️ Delete Review', `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:48px;margin-bottom:12px;">🗑️</div>
      <p style="font-size:15px;color:#374151;">Are you sure you want to permanently delete this review?</p>
      <p style="font-size:13px;color:#64748b;margin-top:8px;">This action cannot be undone.</p>
    </div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
      <button class="btn btn-danger" onclick="confirmDeleteReview(${id})"><i class="fas fa-trash"></i> Yes, Delete</button>
      <button class="btn btn-outline" onclick="hideModal('confirm-del-review')">Cancel</button>
    </div>
  `);
}

async function confirmDeleteReview(id) {
  const res = await api('DELETE', `/admin/reviews/${id}`);
  if (res.success) { toast('Review deleted', 'success'); hideModal('confirm-del-review'); loadAdminReviews(); }
  else toast(res.message, 'error');
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
    hrms: 'HRMS - HR Management', reviews: 'Employee Reviews',
    'company-profile': 'Company Profile'
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
  else if (section === 'hrms') await loadHRMS();
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

// =============================================
// HRMS - HR MANAGEMENT SYSTEM
// =============================================
let hrmsEmployees = [];
let hrmsAttendanceMonth = new Date().getMonth() + 1;
let hrmsAttendanceYear = new Date().getFullYear();
let hrmsSalaryMonth = new Date().getMonth() + 1;
let hrmsSalaryYear = new Date().getFullYear();

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function loadHRMS() {
  const empRes = await api('GET', '/company/hrms/employees');
  hrmsEmployees = empRes.employees || [];
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="tabs" id="hrms-tabs">
      <button class="tab-btn active" onclick="showHRMSTab('employees',this)"><i class="fas fa-users"></i> Employees</button>
      <button class="tab-btn" onclick="showHRMSTab('attendance',this)"><i class="fas fa-calendar-check"></i> Attendance</button>
      <button class="tab-btn" onclick="showHRMSTab('salary',this)"><i class="fas fa-money-bill-wave"></i> Salary Slips</button>
    </div>
    <div id="hrms-employees-tab"></div>
    <div id="hrms-attendance-tab" style="display:none;"></div>
    <div id="hrms-salary-tab" style="display:none;"></div>`;
  renderHRMSEmployees();
}

function showHRMSTab(tab, btn) {
  document.querySelectorAll('#hrms-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['employees','attendance','salary'].forEach(t => {
    const el = document.getElementById(`hrms-${t}-tab`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
  if (tab === 'attendance') renderHRMSAttendance();
  if (tab === 'salary') renderHRMSSalary();
}

function renderHRMSEmployees() {
  const el = document.getElementById('hrms-employees-tab');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <h3 style="margin:0;font-size:16px;font-weight:700;color:#1e3a5f;">Team Members (${hrmsEmployees.length})</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" onclick="showAddHRMSEmployeeModal()"><i class="fas fa-user-plus"></i> Add Employee</button>
        <button class="btn btn-outline btn-sm" onclick="showBulkImportModal()"><i class="fas fa-file-upload"></i> Bulk Import</button>
      </div>
    </div>
    ${hrmsEmployees.length ? hrmsEmployees.map(e => `
      <div class="card" style="margin-bottom:12px;padding:16px;${!e.is_active?'opacity:0.65;border-left:3px solid #f59e0b;':''}">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <div class="sidebar-avatar" style="background:${e.is_active?'linear-gradient(135deg,#2563eb,#7c3aed)':'#94a3b8'};width:46px;height:46px;font-size:17px;flex-shrink:0;">
            ${(e.full_name||'?')[0].toUpperCase()}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:15px;">${e.full_name||'-'} ${!e.is_active?'<span class="badge badge-warning" style="font-size:10px;">Discontinued</span>':''}</div>
            <div style="font-size:13px;color:#2563eb;">${e.designation||e.current_job_title||'Employee'}</div>
            <div style="font-size:12px;color:#64748b;">${e.department||''} ${e.email ? '· '+e.email : ''} ${e.employee_code ? '· #'+e.employee_code : ''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            ${e.basic_salary ? '<div style="font-weight:700;color:#16a34a;font-size:14px;">₹'+Number(e.basic_salary).toLocaleString('en-IN')+'/mo</div>' : '<div style="color:#94a3b8;font-size:12px;">Salary not set</div>'}
            <div style="font-size:11px;color:#64748b;">${e.join_date ? 'Joined: '+e.join_date : ''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-sm ${e.is_active?'btn-warning':'btn-success'}" onclick="toggleHRMSEmployee(${e.id},'${(e.full_name||'').replace(/'/g,'')}',${e.is_active})">
              <i class="fas fa-${e.is_active?'user-slash':'user-check'}"></i> ${e.is_active?'Discontinue':'Reactivate'}
            </button>
            <button class="btn btn-sm btn-outline" onclick="showEditHRMSEmployee(${JSON.stringify(e).replace(/"/g,'&quot;')})"><i class="fas fa-edit"></i> Edit</button>
          </div>
        </div>
      </div>`).join('') : `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No employees in HRMS yet</h3>
        <p style="font-size:13px;margin-bottom:16px;">Add employees directly — no portal registration needed!</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="showAddHRMSEmployeeModal()"><i class="fas fa-user-plus"></i> Add Employee</button>
          <button class="btn btn-outline" onclick="showBulkImportModal()"><i class="fas fa-file-upload"></i> Bulk Import (CSV)</button>
        </div>
      </div>`}`;
}

// ── ADD EMPLOYEE MODAL (Manual entry - no portal dependency) ──
function showAddHRMSEmployeeModal() {
  const today = new Date().toISOString().split('T')[0];
  createModal('add-hrms-emp', 'Add Employee to HRMS', `
    <div style="background:#f0f9ff;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#1e40af;border-left:3px solid #2563eb;">
      <i class="fas fa-info-circle"></i> Enter employee details directly — no portal registration required.
      <a href="#" onclick="showBulkImportModal();return false;" style="color:#2563eb;font-weight:600;margin-left:8px;"><i class="fas fa-file-upload"></i> Bulk Import</a>
    </div>
    <div class="grid-2">
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Full Name *</label>
        <input type="text" id="hrms-name" class="form-control" placeholder="e.g. Rahul Sharma" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="hrms-email" class="form-control" placeholder="employee@example.com">
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input type="tel" id="hrms-phone" class="form-control" placeholder="+91 98765 43210">
      </div>
      <div class="form-group">
        <label class="form-label">Employee Code</label>
        <input type="text" id="hrms-code" class="form-control" placeholder="e.g. EMP001">
      </div>
      <div class="form-group">
        <label class="form-label">Designation</label>
        <input type="text" id="hrms-desig" class="form-control" placeholder="e.g. Software Engineer">
      </div>
      <div class="form-group">
        <label class="form-label">Department</label>
        <input type="text" id="hrms-dept" class="form-control" placeholder="e.g. Engineering, HR">
      </div>
      <div class="form-group">
        <label class="form-label">Join Date</label>
        <input type="date" id="hrms-jdate" class="form-control" value="${today}">
      </div>
      <div class="form-group">
        <label class="form-label">Basic Monthly Salary (₹)</label>
        <input type="number" id="hrms-sal" class="form-control" placeholder="e.g. 50000">
      </div>
      <div class="form-group">
        <label class="form-label">Employment Type</label>
        <select id="hrms-etype" class="form-control">
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="intern">Intern</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input type="text" id="hrms-notes" class="form-control" placeholder="Optional">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="saveHRMSEmployee()"><i class="fas fa-save"></i> Add Employee</button>
      <button class="btn btn-outline" onclick="hideModal('add-hrms-emp')">Cancel</button>
    </div>
  `);
}

// ── BULK IMPORT MODAL ──
function showBulkImportModal() {
  hideModal('add-hrms-emp');
  createModal('bulk-import-modal', 'Bulk Import Employees', `
    <div style="margin-bottom:14px;">
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn btn-sm ${true?'btn-primary':'btn-outline'}" id="bulk-tab-csv" onclick="switchBulkTab('csv')">CSV Import</button>
        <button class="btn btn-sm btn-outline" id="bulk-tab-form" onclick="switchBulkTab('form')">Multi-Row Form</button>
      </div>

      <div id="bulk-csv-section">
        <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px;">
          <p style="font-size:13px;color:#64748b;margin-bottom:8px;"><b>CSV Format</b> (first row = header, comma separated):</p>
          <code style="font-size:11px;color:#374151;display:block;background:#f1f5f9;padding:8px;border-radius:6px;">full_name,email,phone,designation,department,join_date,basic_salary,employment_type,employee_code<br>Rahul Sharma,rahul@ex.com,9876543210,Engineer,Tech,2024-01-15,50000,full_time,EMP001<br>Priya Patel,priya@ex.com,,HR Manager,HR,2024-02-01,45000,full_time,EMP002</code>
        </div>
        <div class="form-group">
          <label class="form-label">Upload CSV File</label>
          <input type="file" id="bulk-csv-file" class="form-control" accept=".csv,.txt" onchange="parseBulkCSV()">
        </div>
        <div id="bulk-csv-preview" style="max-height:200px;overflow-y:auto;"></div>
      </div>

      <div id="bulk-form-section" style="display:none;">
        <div id="bulk-rows-container">
          <div class="bulk-row" style="display:grid;grid-template-columns:2fr 1.5fr 1fr 1fr 1fr;gap:6px;margin-bottom:6px;">
            <input type="text" class="form-control" placeholder="Full Name *" style="font-size:12px;" data-field="full_name">
            <input type="email" class="form-control" placeholder="Email" style="font-size:12px;" data-field="email">
            <input type="text" class="form-control" placeholder="Designation" style="font-size:12px;" data-field="designation">
            <input type="text" class="form-control" placeholder="Dept" style="font-size:12px;" data-field="department">
            <input type="number" class="form-control" placeholder="Salary" style="font-size:12px;" data-field="basic_salary">
          </div>
        </div>
        <button class="btn btn-sm btn-outline" onclick="addBulkRow()" style="margin-top:4px;"><i class="fas fa-plus"></i> Add Row</button>
        <p style="font-size:12px;color:#64748b;margin-top:6px;">Each row = 1 employee. Fill Name at minimum.</p>
      </div>
    </div>

    <div id="bulk-status" style="display:none;"></div>
    <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="submitBulkImport()"><i class="fas fa-upload"></i> Import All</button>
      <button class="btn btn-outline" onclick="hideModal('bulk-import-modal')">Cancel</button>
    </div>
  `);
}

let _bulkCSVData = [];
function switchBulkTab(tab) {
  document.getElementById('bulk-csv-section').style.display = tab === 'csv' ? '' : 'none';
  document.getElementById('bulk-form-section').style.display = tab === 'form' ? '' : 'none';
  document.getElementById('bulk-tab-csv').className = 'btn btn-sm ' + (tab === 'csv' ? 'btn-primary' : 'btn-outline');
  document.getElementById('bulk-tab-form').className = 'btn btn-sm ' + (tab === 'form' ? 'btn-primary' : 'btn-outline');
}

function addBulkRow() {
  const row = document.createElement('div');
  row.className = 'bulk-row';
  row.style.cssText = 'display:grid;grid-template-columns:2fr 1.5fr 1fr 1fr 1fr;gap:6px;margin-bottom:6px;';
  row.innerHTML = `
    <input type="text" class="form-control" placeholder="Full Name *" style="font-size:12px;" data-field="full_name">
    <input type="email" class="form-control" placeholder="Email" style="font-size:12px;" data-field="email">
    <input type="text" class="form-control" placeholder="Designation" style="font-size:12px;" data-field="designation">
    <input type="text" class="form-control" placeholder="Dept" style="font-size:12px;" data-field="department">
    <input type="number" class="form-control" placeholder="Salary" style="font-size:12px;" data-field="basic_salary">`;
  document.getElementById('bulk-rows-container').appendChild(row);
}

function parseBulkCSV() {
  const file = document.getElementById('bulk-csv-file').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { toast('CSV must have header + at least 1 data row', 'error'); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g,'_'));
    _bulkCSVData = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
      const row = {};
      headers.forEach((h,i) => { if (vals[i]) row[h] = vals[i]; });
      return row;
    }).filter(r => r.full_name);
    const preview = document.getElementById('bulk-csv-preview');
    if (!_bulkCSVData.length) { preview.innerHTML = '<p style="color:#dc2626;font-size:13px;">No valid rows found. Check CSV format.</p>'; return; }
    preview.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;margin-top:8px;">
        <div style="font-weight:700;color:#16a34a;font-size:13px;"><i class="fas fa-check-circle"></i> ${_bulkCSVData.length} employees ready to import</div>
        <div style="margin-top:6px;font-size:12px;color:#374151;">${_bulkCSVData.slice(0,5).map(r => r.full_name + (r.email?' ('+r.email+')':'')).join(', ')}${_bulkCSVData.length > 5 ? '...' : ''}</div>
      </div>`;
  };
  reader.readAsText(file);
}

async function submitBulkImport() {
  const csvVisible = document.getElementById('bulk-csv-section').style.display !== 'none';
  let employees = [];
  if (csvVisible) {
    if (!_bulkCSVData.length) return toast('Please upload a CSV file first', 'error');
    employees = _bulkCSVData;
  } else {
    const rows = document.querySelectorAll('.bulk-row');
    rows.forEach(row => {
      const emp = {};
      row.querySelectorAll('[data-field]').forEach(inp => { if (inp.value.trim()) emp[inp.dataset.field] = inp.value.trim(); });
      if (emp.full_name) employees.push(emp);
    });
    if (!employees.length) return toast('Add at least one employee with a name', 'error');
  }

  const statusEl = document.getElementById('bulk-status');
  statusEl.style.display = 'block';
  statusEl.innerHTML = '<div style="color:#2563eb;font-size:13px;"><i class="fas fa-spinner fa-spin"></i> Importing '+employees.length+' employees...</div>';

  const res = await api('POST', '/company/hrms/employees/bulk', { employees });
  if (res.success) {
    statusEl.innerHTML = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;color:#16a34a;font-weight:600;font-size:13px;"><i class="fas fa-check-circle"></i> ${res.message}</div>`;
    toast(res.message, 'success');
    setTimeout(async () => {
      hideModal('bulk-import-modal');
      const empRes = await api('GET', '/company/hrms/employees');
      hrmsEmployees = empRes.employees || [];
      renderHRMSEmployees();
    }, 1500);
  } else {
    statusEl.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;color:#dc2626;font-size:13px;">${res.message}</div>`;
    toast(res.message, 'error');
  }
}

// ── EDIT EMPLOYEE ──
function showEditHRMSEmployee(e) {
  createModal('edit-hrms-emp', 'Edit Employee — ' + e.full_name, `
    <div class="grid-2">
      <div class="form-group" style="grid-column:1/-1">
        <label class="form-label">Full Name *</label>
        <input type="text" id="edit-hrms-name" class="form-control" value="${e.full_name||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" id="edit-hrms-email" class="form-control" value="${e.email||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input type="tel" id="edit-hrms-phone" class="form-control" value="${e.phone||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Employee Code</label>
        <input type="text" id="edit-hrms-code" class="form-control" value="${e.employee_code||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Designation</label>
        <input type="text" id="edit-hrms-desig" class="form-control" value="${e.designation||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Department</label>
        <input type="text" id="edit-hrms-dept" class="form-control" value="${e.department||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Join Date</label>
        <input type="date" id="edit-hrms-jdate" class="form-control" value="${e.join_date||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Basic Salary (₹)</label>
        <input type="number" id="edit-hrms-sal" class="form-control" value="${e.basic_salary||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Employment Type</label>
        <select id="edit-hrms-etype" class="form-control">
          <option value="full_time" ${e.employment_type==='full_time'?'selected':''}>Full Time</option>
          <option value="part_time" ${e.employment_type==='part_time'?'selected':''}>Part Time</option>
          <option value="contract" ${e.employment_type==='contract'?'selected':''}>Contract</option>
          <option value="intern" ${e.employment_type==='intern'?'selected':''}>Intern</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="updateHRMSEmployee(${e.id})"><i class="fas fa-save"></i> Update</button>
      <button class="btn btn-danger btn-outline" onclick="removeHRMSEmployee(${e.id}, '${e.full_name.replace(/'/g, '')}')"><i class="fas fa-trash"></i> Remove</button>
      <button class="btn btn-outline" onclick="hideModal('edit-hrms-emp')">Cancel</button>
    </div>
  `);
}

async function updateHRMSEmployee(staffId) {
  const body = {
    full_name: document.getElementById('edit-hrms-name').value.trim(),
    email: document.getElementById('edit-hrms-email').value.trim(),
    phone: document.getElementById('edit-hrms-phone').value.trim(),
    employee_code: document.getElementById('edit-hrms-code').value.trim(),
    designation: document.getElementById('edit-hrms-desig').value.trim(),
    department: document.getElementById('edit-hrms-dept').value.trim(),
    join_date: document.getElementById('edit-hrms-jdate').value,
    basic_salary: parseFloat(document.getElementById('edit-hrms-sal').value) || 0,
    employment_type: document.getElementById('edit-hrms-etype').value,
  };
  if (!body.full_name) return toast('Name is required', 'error');
  const res = await api('PUT', `/company/hrms/employees/${staffId}`, body);
  if (res.success) {
    toast('Employee updated!', 'success');
    hideModal('edit-hrms-emp');
    const empRes = await api('GET', '/company/hrms/employees');
    hrmsEmployees = empRes.employees || [];
    renderHRMSEmployees();
  } else toast(res.message, 'error');
}

async function removeHRMSEmployee(staffId, name) {
  if (!confirm(`Remove "${name}" from HRMS? Their attendance and salary history will be preserved.`)) return;
  const res = await api('DELETE', `/company/hrms/employees/${staffId}`);
  if (res.success) {
    toast('Employee removed from HRMS', 'success');
    hideModal('edit-hrms-emp');
    const empRes = await api('GET', '/company/hrms/employees');
    hrmsEmployees = empRes.employees || [];
    renderHRMSEmployees();
  } else toast(res.message, 'error');
}

async function toggleHRMSEmployee(staffId, name, isActive) {
  const action = isActive ? 'discontinue' : 'reactivate';
  const msg = isActive
    ? `Discontinue "${name}"? They will be marked as inactive and won't appear in active attendance/salary lists.`
    : `Reactivate "${name}"? They will be marked as active again.`;
  if (!confirm(msg)) return;
  const res = await api('PUT', `/company/hrms/employees/${staffId}/toggle`);
  if (res.success) {
    toast(res.message, 'success');
    const empRes = await api('GET', '/company/hrms/employees');
    hrmsEmployees = empRes.employees || [];
    renderHRMSEmployees();
  } else toast(res.message, 'error');
}

async function saveHRMSEmployee() {
  const name = document.getElementById('hrms-name')?.value?.trim();
  if (!name) return toast('Employee name is required', 'error');
  const body = {
    full_name: name,
    email: document.getElementById('hrms-email')?.value?.trim() || null,
    phone: document.getElementById('hrms-phone')?.value?.trim() || null,
    employee_code: document.getElementById('hrms-code')?.value?.trim() || null,
    designation: document.getElementById('hrms-desig')?.value?.trim() || null,
    department: document.getElementById('hrms-dept')?.value?.trim() || null,
    join_date: document.getElementById('hrms-jdate')?.value || null,
    basic_salary: parseFloat(document.getElementById('hrms-sal')?.value) || 0,
    employment_type: document.getElementById('hrms-etype')?.value || 'full_time',
    notes: document.getElementById('hrms-notes')?.value?.trim() || null,
  };
  const res = await api('POST', '/company/hrms/employees', body);
  if (res.success) {
    toast(res.message, 'success');
    hideModal('add-hrms-emp');
    const empRes = await api('GET', '/company/hrms/employees');
    hrmsEmployees = empRes.employees || [];
    renderHRMSEmployees();
  } else toast(res.message, 'error');
}

// ── ATTENDANCE ──
async function renderHRMSAttendance() {
  const el = document.getElementById('hrms-attendance-tab');
  if (!el) return;

  const res = await api('GET', `/company/hrms/attendance?month=${hrmsAttendanceMonth}&year=${hrmsAttendanceYear}`);
  const records = res.attendance || [];

  // Group by date
  const byDate = {};
  records.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r);
  });

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="btn btn-sm btn-outline" onclick="hrmsChangeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
          <span style="font-size:16px;font-weight:700;color:#1e3a5f;">${MONTHS[hrmsAttendanceMonth-1]} ${hrmsAttendanceYear}</span>
          <button class="btn btn-sm btn-outline" onclick="hrmsChangeMonth(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="showMarkAttendanceModal()"><i class="fas fa-calendar-plus"></i> Mark Attendance</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;padding:14px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <span style="font-size:13px;"><span style="display:inline-block;width:12px;height:12px;background:#16a34a;border-radius:3px;margin-right:4px;"></span>Present</span>
        <span style="font-size:13px;"><span style="display:inline-block;width:12px;height:12px;background:#dc2626;border-radius:3px;margin-right:4px;"></span>Absent</span>
        <span style="font-size:13px;"><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:3px;margin-right:4px;"></span>Half Day</span>
        <span style="font-size:13px;"><span style="display:inline-block;width:12px;height:12px;background:#2563eb;border-radius:3px;margin-right:4px;"></span>WFH</span>
        <span style="font-size:13px;"><span style="display:inline-block;width:12px;height:12px;background:#7c3aed;border-radius:3px;margin-right:4px;"></span>Leave</span>
      </div>
    </div>

    ${records.length ? `
      <div class="card" style="padding:0;overflow:hidden;">
        <div class="table-responsive">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Employee</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Notes</th></tr></thead>
            <tbody>
              ${records.map(r => `
                <tr>
                  <td style="font-weight:600;">${r.date}</td>
                  <td>${r.full_name}<br><span style="font-size:11px;color:#64748b;">${r.current_job_title||''}</span></td>
                  <td>${attendanceBadge(r.status)}</td>
                  <td style="font-size:13px;">${r.check_in||'-'}</td>
                  <td style="font-size:13px;">${r.check_out||'-'}</td>
                  <td style="font-size:12px;color:#64748b;">${r.notes||''}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : `
      <div class="empty-state">
        <i class="fas fa-calendar-check"></i>
        <h3>No attendance records for ${MONTHS[hrmsAttendanceMonth-1]} ${hrmsAttendanceYear}</h3>
        <button class="btn btn-primary" onclick="showMarkAttendanceModal()"><i class="fas fa-calendar-plus"></i> Mark Attendance</button>
      </div>`}`;
}

function attendanceBadge(status) {
  const cfg = {
    present: ['#dcfce7','#16a34a','Present'],
    absent: ['#fee2e2','#dc2626','Absent'],
    half_day: ['#fef3c7','#d97706','Half Day'],
    leave: ['#ede9fe','#7c3aed','Leave'],
    holiday: ['#f1f5f9','#64748b','Holiday'],
    wfh: ['#dbeafe','#2563eb','WFH'],
  };
  const [bg, color, label] = cfg[status] || ['#f1f5f9','#374151', status];
  return `<span style="background:${bg};color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${label}</span>`;
}

function hrmsChangeMonth(dir) {
  hrmsAttendanceMonth += dir;
  if (hrmsAttendanceMonth > 12) { hrmsAttendanceMonth = 1; hrmsAttendanceYear++; }
  if (hrmsAttendanceMonth < 1) { hrmsAttendanceMonth = 12; hrmsAttendanceYear--; }
  renderHRMSAttendance();
}

function showMarkAttendanceModal() {
  const today = new Date().toISOString().split('T')[0];
  const empOptions = hrmsEmployees.map(e => `<option value="${e.id}">${e.full_name}</option>`).join('');
  createModal('mark-att-modal', 'Mark Attendance', `
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Date *</label><input type="date" id="att-date" class="form-control" value="${today}"></div>
      <div class="form-group"><label class="form-label">Employee *</label>
        <select id="att-emp" class="form-control"><option value="">All Employees</option>${empOptions}</select>
      </div>
      <div class="form-group"><label class="form-label">Status *</label>
        <select id="att-status" class="form-control">
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="half_day">Half Day</option>
          <option value="wfh">Work From Home</option>
          <option value="leave">On Leave</option>
          <option value="holiday">Holiday</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Check In</label><input type="time" id="att-in" class="form-control" value="09:00"></div>
      <div class="form-group"><label class="form-label">Check Out</label><input type="time" id="att-out" class="form-control" value="18:00"></div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label><input type="text" id="att-notes" class="form-control" placeholder="Optional note"></div>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button class="btn btn-primary" onclick="submitAttendance()"><i class="fas fa-save"></i> Mark Attendance</button>
      <button class="btn btn-outline" onclick="hideModal('mark-att-modal')">Cancel</button>
    </div>
  `);
}

async function submitAttendance() {
  const empId = document.getElementById('att-emp').value;
  const date = document.getElementById('att-date').value;
  const status = document.getElementById('att-status').value;
  const check_in = document.getElementById('att-in').value;
  const check_out = document.getElementById('att-out').value;
  const notes = document.getElementById('att-notes').value;

  if (!date) return toast('Please select a date', 'error');

  if (!empId) {
    // Bulk mark for all employees
    if (!hrmsEmployees.length) return toast('No employees in HRMS', 'error');
    const records = hrmsEmployees.map(e => ({ staff_id: e.id, status, check_in, check_out }));
    const res = await api('POST', '/company/hrms/attendance/bulk', { date, records });
    if (res.success) { toast(res.message, 'success'); hideModal('mark-att-modal'); renderHRMSAttendance(); }
    else toast(res.message, 'error');
  } else {
    const res = await api('POST', '/company/hrms/attendance', { staff_id: parseInt(empId), date, status, check_in, check_out, notes });
    if (res.success) { toast('Attendance marked!', 'success'); hideModal('mark-att-modal'); renderHRMSAttendance(); }
    else toast(res.message, 'error');
  }
}

// ── SALARY SLIPS ──
async function renderHRMSSalary() {
  const el = document.getElementById('hrms-salary-tab');
  if (!el) return;

  const res = await api('GET', `/company/hrms/salary?month=${hrmsSalaryMonth}&year=${hrmsSalaryYear}`);
  const slips = res.slips || [];

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="btn btn-sm btn-outline" onclick="hrmsSalaryChangeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
          <span style="font-size:16px;font-weight:700;color:#1e3a5f;">${MONTHS[hrmsSalaryMonth-1]} ${hrmsSalaryYear}</span>
          <button class="btn btn-sm btn-outline" onclick="hrmsSalaryChangeMonth(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="showGenerateSalaryModal()"><i class="fas fa-file-invoice-dollar"></i> Generate Slip</button>
      </div>
    </div>

    ${slips.length ? slips.map(s => `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:10px;">
          <div>
            <div style="font-weight:700;font-size:15px;">${s.full_name}</div>
            <div style="font-size:13px;color:#2563eb;">${s.designation||s.current_job_title||''}</div>
            <div style="font-size:12px;color:#64748b;">${s.department||''} ${s.email ? '· '+s.email : ''}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:800;color:#16a34a;">₹${Number(s.net_salary).toLocaleString('en-IN')}</div>
            <div style="font-size:12px;color:#64748b;">Net Salary</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0;padding:12px;background:#f8fafc;border-radius:10px;">
          <div style="text-align:center;">
            <div style="font-size:13px;font-weight:700;color:#374151;">₹${Number(s.gross_salary).toLocaleString('en-IN')}</div>
            <div style="font-size:11px;color:#64748b;">Gross</div>
          </div>
          <div style="text-align:center;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <div style="font-size:13px;font-weight:700;color:#dc2626;">-₹${Number(s.total_deductions).toLocaleString('en-IN')}</div>
            <div style="font-size:11px;color:#64748b;">Deductions</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:13px;font-weight:700;color:#16a34a;">₹${Number(s.net_salary).toLocaleString('en-IN')}</div>
            <div style="font-size:11px;color:#64748b;">Net Pay</div>
          </div>
        </div>
        <div style="font-size:12px;color:#64748b;">${s.present_days}/${s.working_days} days present</div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-primary" onclick="downloadSalarySlipPDF(${JSON.stringify(s).replace(/"/g,'&quot;')})">
            <i class="fas fa-download"></i> Download PDF
          </button>
          <button class="btn btn-sm btn-outline" onclick="showGenerateSalaryModal(${JSON.stringify(s).replace(/"/g,'&quot;')})">
            <i class="fas fa-edit"></i> Edit
          </button>
        </div>
      </div>`).join('') : `
      <div class="empty-state">
        <i class="fas fa-file-invoice-dollar"></i>
        <h3>No salary slips for ${MONTHS[hrmsSalaryMonth-1]} ${hrmsSalaryYear}</h3>
        <button class="btn btn-primary" onclick="showGenerateSalaryModal()"><i class="fas fa-plus"></i> Generate Salary Slip</button>
      </div>`}`;
}

function hrmsSalaryChangeMonth(dir) {
  hrmsSalaryMonth += dir;
  if (hrmsSalaryMonth > 12) { hrmsSalaryMonth = 1; hrmsSalaryYear++; }
  if (hrmsSalaryMonth < 1) { hrmsSalaryMonth = 12; hrmsSalaryYear--; }
  renderHRMSSalary();
}

function showGenerateSalaryModal(existing = null) {
  const empOptions = hrmsEmployees.map(e =>
    `<option value="${e.id}" ${existing && existing.staff_id === e.id ? 'selected' : ''}>${e.full_name} ${e.basic_salary ? '(₹'+Number(e.basic_salary).toLocaleString('en-IN')+'/mo)' : ''}</option>`
  ).join('');
  const e = existing || {};
  createModal('gen-salary-modal', 'Generate / Edit Salary Slip', `
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Employee *</label>
        <select id="sal-emp" class="form-control" onchange="autoFillSalary(this)">
          <option value="">-- Select Employee --</option>${empOptions}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Month *</label>
        <select id="sal-month" class="form-control">
          ${MONTHS.map((m,i) => `<option value="${i+1}" ${(i+1) === (e.month||hrmsSalaryMonth) ? 'selected':''}>${m}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Year *</label>
        <input type="number" id="sal-year" class="form-control" value="${e.year||hrmsSalaryYear}" min="2020" max="2099">
      </div>
      <div class="form-group"><label class="form-label">Basic Salary (₹) *</label>
        <input type="number" id="sal-basic" class="form-control" value="${e.basic_salary||''}" placeholder="e.g. 50000">
      </div>
      <div class="form-group"><label class="form-label">HRA (₹) <span style="font-size:11px;color:#64748b;">auto: 40%</span></label>
        <input type="number" id="sal-hra" class="form-control" value="${e.hra||''}" placeholder="auto">
      </div>
      <div class="form-group"><label class="form-label">TA (₹) <span style="font-size:11px;color:#64748b;">auto: 10%</span></label>
        <input type="number" id="sal-ta" class="form-control" value="${e.ta||''}" placeholder="auto">
      </div>
      <div class="form-group"><label class="form-label">Other Allowances (₹)</label>
        <input type="number" id="sal-other-allow" class="form-control" value="${e.other_allowances||0}">
      </div>
      <div class="form-group"><label class="form-label">PF Deduction (₹) <span style="font-size:11px;color:#64748b;">auto: 12%</span></label>
        <input type="number" id="sal-pf" class="form-control" value="${e.pf_deduction||''}" placeholder="auto">
      </div>
      <div class="form-group"><label class="form-label">Tax Deduction (₹)</label>
        <input type="number" id="sal-tax" class="form-control" value="${e.tax_deduction||0}">
      </div>
      <div class="form-group"><label class="form-label">Other Deductions (₹)</label>
        <input type="number" id="sal-other-ded" class="form-control" value="${e.other_deductions||0}">
      </div>
      <div class="form-group"><label class="form-label">Working Days</label>
        <input type="number" id="sal-wdays" class="form-control" value="${e.working_days||26}">
      </div>
      <div class="form-group"><label class="form-label">Present Days</label>
        <input type="number" id="sal-pdays" class="form-control" value="${e.present_days||26}">
      </div>
    </div>
    <div class="form-group"><label class="form-label">Notes</label>
      <input type="text" id="sal-notes" class="form-control" value="${e.notes||''}" placeholder="Optional notes">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="submitSalarySlip()"><i class="fas fa-file-invoice-dollar"></i> Generate Slip</button>
      <button class="btn btn-outline" onclick="hideModal('gen-salary-modal')">Cancel</button>
    </div>
  `);
}

function autoFillSalary(sel) {
  const emp = hrmsEmployees.find(e => e.id === parseInt(sel.value));
  if (emp && emp.basic_salary) {
    document.getElementById('sal-basic').value = emp.basic_salary;
  }
}

async function submitSalarySlip() {
  const body = {
    staff_id: parseInt(document.getElementById('sal-emp').value),
    month: parseInt(document.getElementById('sal-month').value),
    year: parseInt(document.getElementById('sal-year').value),
    basic_salary: parseFloat(document.getElementById('sal-basic').value),
    hra: parseFloat(document.getElementById('sal-hra').value) || null,
    ta: parseFloat(document.getElementById('sal-ta').value) || null,
    other_allowances: parseFloat(document.getElementById('sal-other-allow').value) || 0,
    pf_deduction: parseFloat(document.getElementById('sal-pf').value) || null,
    tax_deduction: parseFloat(document.getElementById('sal-tax').value) || 0,
    other_deductions: parseFloat(document.getElementById('sal-other-ded').value) || 0,
    working_days: parseInt(document.getElementById('sal-wdays').value) || 26,
    present_days: parseInt(document.getElementById('sal-pdays').value) || 26,
    notes: document.getElementById('sal-notes').value,
  };
  if (!body.staff_id || !body.basic_salary) return toast('Employee and basic salary are required', 'error');
  const res = await api('POST', '/company/hrms/salary', body);
  if (res.success) {
    toast(`Salary slip generated! Net: ₹${Number(res.data.netSalary).toLocaleString('en-IN')}`, 'success');
    hideModal('gen-salary-modal');
    hrmsSalaryMonth = body.month;
    hrmsSalaryYear = body.year;
    renderHRMSSalary();
  } else toast(res.message, 'error');
}

function downloadSalarySlipPDF(s) {
  const companyName = currentUser?.profileData?.company_name || 'Company';
  const monthName = MONTHS[(s.month||1)-1];
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Salary Slip - ${s.full_name}</title>
<style>
  @page { margin: 15mm 20mm; size: A4; }
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: white; font-size: 13px; }
  .header { background: linear-gradient(135deg, #1e3a5f, #2563eb); color: white; padding: 24px 28px; display:flex; justify-content:space-between; align-items:center; }
  .company-name { font-size: 22px; font-weight: 800; }
  .slip-title { font-size: 14px; opacity:0.85; }
  .slip-period { font-size:16px; font-weight:700; }
  .body { padding: 24px 28px; }
  .emp-box { background:#f8fafc; border-radius:10px; padding:16px; margin-bottom:20px; display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .emp-row { font-size:13px; } .emp-row span:first-child { color:#64748b; font-size:11px; display:block; font-weight:600; text-transform:uppercase; }
  .pay-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
  .pay-section h4 { font-size:13px; font-weight:700; color:#1e3a5f; border-bottom:2px solid #2563eb; padding-bottom:6px; margin-bottom:10px; }
  .pay-row { display:flex; justify-content:space-between; font-size:13px; padding:4px 0; border-bottom:1px solid #f1f5f9; }
  .pay-row.total { font-weight:700; border-top:2px solid #e2e8f0; padding-top:8px; margin-top:4px; }
  .net-box { background:linear-gradient(135deg,#16a34a,#22c55e); color:white; border-radius:10px; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; }
  .net-label { font-size:14px; font-weight:600; opacity:0.9; }
  .net-amount { font-size:28px; font-weight:800; }
  .footer { margin-top:30px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:12px; color:#64748b; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head>
<body>
  <div class="header">
    <div>
      <div class="company-name"><i>🏢</i> ${companyName}</div>
      <div class="slip-title">Salary Slip / Pay Stub</div>
    </div>
    <div style="text-align:right;">
      <div class="slip-period">${monthName} ${s.year}</div>
      <div style="font-size:12px;opacity:0.8;">Generated: ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
  </div>
  <div class="body">
    <div class="emp-box">
      <div class="emp-row"><span>Employee Name</span>${s.full_name}</div>
      <div class="emp-row"><span>Email</span>${s.email||'-'}</div>
      <div class="emp-row"><span>Designation</span>${s.designation||s.current_job_title||'-'}</div>
      <div class="emp-row"><span>Department</span>${s.department||'-'}</div>
      <div class="emp-row"><span>Working Days</span>${s.working_days} days</div>
      <div class="emp-row"><span>Present Days</span>${s.present_days} days</div>
      <div class="emp-row"><span>Pay Period</span>${monthName} ${s.year}</div>
      <div class="emp-row"><span>Loss of Pay</span>₹${Number(s.loss_of_pay||0).toLocaleString('en-IN')}</div>
    </div>

    <div class="pay-grid">
      <div class="pay-section">
        <h4>💰 Earnings</h4>
        <div class="pay-row"><span>Basic Salary</span><span>₹${Number(s.basic_salary).toLocaleString('en-IN')}</span></div>
        <div class="pay-row"><span>HRA</span><span>₹${Number(s.hra||0).toLocaleString('en-IN')}</span></div>
        <div class="pay-row"><span>Travel Allowance</span><span>₹${Number(s.ta||0).toLocaleString('en-IN')}</span></div>
        <div class="pay-row"><span>Other Allowances</span><span>₹${Number(s.other_allowances||0).toLocaleString('en-IN')}</span></div>
        <div class="pay-row total"><span>Gross Salary</span><span>₹${Number(s.gross_salary).toLocaleString('en-IN')}</span></div>
      </div>
      <div class="pay-section">
        <h4>📉 Deductions</h4>
        <div class="pay-row"><span>Provident Fund (PF)</span><span>₹${Number(s.pf_deduction||0).toLocaleString('en-IN')}</span></div>
        <div class="pay-row"><span>Income Tax (TDS)</span><span>₹${Number(s.tax_deduction||0).toLocaleString('en-IN')}</span></div>
        <div class="pay-row"><span>Loss of Pay</span><span>₹${Number(s.loss_of_pay||0).toLocaleString('en-IN')}</span></div>
        <div class="pay-row"><span>Other Deductions</span><span>₹${Number(s.other_deductions||0).toLocaleString('en-IN')}</span></div>
        <div class="pay-row total"><span>Total Deductions</span><span>₹${Number(s.total_deductions).toLocaleString('en-IN')}</span></div>
      </div>
    </div>

    <div class="net-box">
      <div><div class="net-label">Net Salary (Take Home)</div><div style="font-size:12px;opacity:0.8;">${monthName} ${s.year}</div></div>
      <div class="net-amount">₹${Number(s.net_salary).toLocaleString('en-IN')}</div>
    </div>

    ${s.notes ? `<div style="margin-top:16px;padding:10px 14px;background:#f0f9ff;border-radius:8px;border-left:3px solid #2563eb;font-size:13px;color:#374151;"><b>Notes:</b> ${s.notes}</div>` : ''}

    <div class="footer">
      <div>This is a computer generated salary slip and does not require a signature.</div>
      <div>${companyName} · ${monthName} ${s.year}</div>
    </div>
  </div>
</body></html>`;

  const w = window.open('', '_blank', 'width=850,height=1100');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
  toast('Salary slip ready! Use "Save as PDF" in print dialog.', 'success');
}

// =============================================
// EMPLOYER REVIEWS
// =============================================
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
    'my-applications': 'My Applications', 'saved-jobs': 'Saved Jobs', 'my-profile': 'My Profile',
    'my-reviews': 'My Reviews'
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
  else if (section === 'my-reviews') await loadMyReviews();
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

// ── EMPLOYEE: My Reviews (with removal request) ──
async function loadMyReviews() {
  const res = await api('GET', '/reviews/my');
  const reviewsList = res.reviews || [];
  const content = document.getElementById('content-area');

  const statusBadge = (s) => {
    if (!s) return '';
    const map = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
    return `<span class="badge ${map[s]||'badge-primary'}" style="font-size:10px;margin-left:6px;"><i class="fas fa-${s==='pending'?'clock':s==='approved'?'check':'times'}"></i> Removal ${s}</span>`;
  };

  content.innerHTML = `
    <div style="margin-bottom:16px;">
      <h2 style="font-size:18px;font-weight:700;color:#1e3a5f;margin:0 0 6px;"><i class="fas fa-star"></i> My Reviews (${reviewsList.length})</h2>
      <p style="font-size:13px;color:#64748b;margin:0;">Reviews given by employers. If you believe a review is unfair, you can request its removal.</p>
    </div>
    ${reviewsList.length ? reviewsList.map(r => `
      <div class="review-card ${r.is_flagged?'review-flag':''}" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <div>
            <div style="font-weight:700;font-size:15px;">${r.company_name}</div>
            <div style="font-size:12px;color:#64748b;">${r.job_title||''} ${r.worked_from?'· '+r.worked_from+(r.worked_to?' to '+r.worked_to:''):''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <div class="stars">${stars(r.rating)}</div>
            ${r.is_flagged?'<span class="badge badge-danger"><i class="fas fa-flag"></i> Flagged</span>':''}
            ${statusBadge(r.removal_status)}
          </div>
        </div>
        <p style="color:#374151;font-size:14px;margin:0 0 10px;">${r.review_text||'No review text'}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="font-size:11px;color:#94a3b8;">${timeAgo(r.created_at)}</div>
          ${!r.removal_status || r.removal_status === 'rejected' ? `
            <button class="btn btn-sm btn-outline" style="border-color:#dc2626;color:#dc2626;" onclick="showReviewRemovalModal(${r.id},'${r.company_name.replace(/'/g,'')}')">
              <i class="fas fa-trash-alt"></i> Request Removal
            </button>` : `<span style="font-size:12px;color:#64748b;font-style:italic;">${r.removal_status==='pending'?'⏳ Removal request under review':'✅ Approved — review will be removed'}</span>`}
        </div>
      </div>`).join('') : `
      <div class="empty-state">
        <i class="fas fa-star"></i>
        <h3>No reviews yet</h3>
        <p>Employer reviews will appear here once you complete work engagements.</p>
      </div>`}`;
}

function showReviewRemovalModal(reviewId, companyName) {
  createModal('review-removal-modal', '🗑️ Request Review Removal', `
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:#92400e;">
      <i class="fas fa-info-circle"></i> <b>Review by: ${companyName}</b><br>
      Removal requests are reviewed by admin. A nominal fee of <b>₹499</b> is charged upon approval.<br>
      Please provide your payment reference (UPI/bank transfer) below after payment.
    </div>
    <div class="form-group">
      <label class="form-label">Reason for Removal *</label>
      <textarea id="removal-reason" class="form-control" rows="3" placeholder="Explain why this review should be removed (e.g. false information, harassment, etc.)"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Payment Reference (UPI / UTR)</label>
      <input type="text" id="removal-payment-ref" class="form-control" placeholder="e.g. UPI ref: 4251XXXXXXXX (pay ₹499 to admin@upi)">
      <div style="font-size:11px;color:#64748b;margin-top:4px;">Pay ₹499 to <b>admin@myplacement.upi</b> and enter reference here. Admin will verify before processing.</div>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn btn-danger" onclick="submitReviewRemovalRequest(${reviewId})"><i class="fas fa-paper-plane"></i> Submit Request</button>
      <button class="btn btn-outline" onclick="hideModal('review-removal-modal')">Cancel</button>
    </div>
  `);
}

async function submitReviewRemovalRequest(reviewId) {
  const reason = document.getElementById('removal-reason')?.value?.trim();
  const paymentRef = document.getElementById('removal-payment-ref')?.value?.trim();
  if (!reason) return toast('Please provide a reason', 'error');
  const res = await api('POST', `/reviews/${reviewId}/request-removal`, { reason, payment_ref: paymentRef });
  if (res.success) {
    toast(res.message, 'success');
    hideModal('review-removal-modal');
    loadMyReviews();
  } else toast(res.message, 'error');
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

