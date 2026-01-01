// navbar.js — unify navbar behaviour across pages
document.addEventListener('DOMContentLoaded', () => {
  initNavbarToggle();
  renderNavAuthArea();   // update nav links based on auth
  initGlobalListeners(); // attach logout listener if rendered later
});

function initNavbarToggle() {
  const toggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    toggle.classList.toggle('open');
  });

  // close nav when clicking outside (on mobile)
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !toggle.contains(e.target)) {
      if (navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        toggle.classList.remove('open');
      }
    }
  });
}

function renderNavAuthArea() {
  // Find the container where we inject auth links (must exist in HTML)
  const navAuthContainer = document.getElementById('nav-auth');
  if (!navAuthContainer) {
    // For backward compat: try querySelector by class or fallback
    
    return;
  }

  if (isAuthenticated()) {
    const user = getUserData() || tryDecodeTokenUser();

    // Always render Dashboard + Logout + optional greeting
    const dashboardUrl = getDashboardUrl(user);
    const displayName = (user && user.name) ? escapeHtml(user.name.split(' ')[0]) : 'Account';

    navAuthContainer.innerHTML = `
  <div class="nav-user-wrapper">
    <a href="${dashboardUrl}" class="nav-link nav-dashboard active">
      <i class="fas fa-tachometer-alt"></i> Dashboard
    </a>
    
    <div class="nav-user-dropdown">
      <button class="nav-user-btn">
        <img src="${user.picture || 'https://via.placeholder.com/32'}" 
             alt="${displayName}" class="nav-user-avatar">
        <span class="nav-username-text">Hi, ${displayName}</span>
        <i class="fas fa-caret-down"></i>
      </button>
      <div class="nav-user-menu">
        <a href="${dashboardUrl}"><i class="fas fa-user"></i> Profile</a>
        <a href="#" id="nav-logout"><i class="fas fa-sign-out-alt"></i> Logout</a>
      </div>
    </div>
  </div>
`;


  } else {
    // Not authenticated: show Login / Register
    navAuthContainer.innerHTML = `
      <a href="login.html">Login</a>
      <a href="register.html" class="btn-primary">Sign Up</a>
    `;
  }
}

function initGlobalListeners() {
  // Delegate logout click (works if injected later)
  document.body.addEventListener('click', (e) => {
    if (e.target && (e.target.id === 'nav-logout' || e.target.id === 'logout-btn-mobile')) {
      e.preventDefault();
      logout();
      // re-render nav to show login/register
      renderNavAuthArea();
    }
  });
}

// Helpers (use existing utils functions)
function isAuthenticated() {
  // rely on existing util
  return !!getAuthToken();
}

function getDashboardUrl(user) {
  user = user || getUserData();
  if (!user) return 'login.html';
  if (user.role === 'admin') return 'dashboard-admin.html';
  if (user.role === 'chef') return 'dashboard-chef.html';
  return 'dashboard-user.html';
}

// Try decode JWT token payload to extract user info if userData missing
function tryDecodeTokenUser() {
  try {
    const token = getAuthToken();
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    // payload fields vary; try common ones
    return {
      id: json.sub || json.id,
      name: json.name || `${json.firstName || ''} ${json.lastName || ''}`.trim(),
      role: json.role || json.roles || (json.isAdmin ? 'admin' : undefined)
    };
  } catch (err) {
    return null;
  }
}

// small sanitiser
function escapeHtml(str) {
  return String(str || '').replace(/[&<>"'/]/g, (s) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;'
  })[s]);
}
