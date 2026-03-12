// navbar.js — unify navbar behaviour across pages
document.addEventListener('DOMContentLoaded', () => {
  initNavbarToggle();
  renderNavAuthArea();
  setActiveNavLink();
  initGlobalListeners();
});

function initNavbarToggle() {
  const toggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (!toggle || !navMenu) return;

  toggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('is-open');
    toggle.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // close nav when clicking outside (on mobile)
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !toggle.contains(e.target)) {
      if (navMenu.classList.contains('is-open')) {
        navMenu.classList.remove('is-open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
}

function renderNavAuthArea() {
  const navAuthContainer = document.getElementById('nav-auth');
  if (!navAuthContainer) return;

  if (isAuthenticated()) {
    const user = getUserData() || tryDecodeTokenUser();
    const dashboardUrl = getDashboardUrl(user);
    if (user && user.role === 'admin') {
      navAuthContainer.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="statistics.html">Statistics</a></li>
        <li class="nav-item"><a class="nav-link" href="admin-users.html">Users</a></li>
        <li class="nav-item"><a class="nav-link" href="admin-chefs.html">Chefs</a></li>
        <li class="nav-item"><a class="nav-link" href="admin-dishes.html">Dishes</a></li>
        <li class="nav-item"><button class="nav-link nav-button" id="nav-logout" type="button">Logout</button></li>
      `;
    } else if (user && user.role === 'chef') {
      navAuthContainer.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="statistics.html">Statistics</a></li>
        <li class="nav-item"><a class="nav-link" href="dishes.html">My Dishes</a></li>
        <li class="nav-item"><a class="nav-link" href="orders.html">Orders</a></li>
        <li class="nav-item"><a class="nav-link" href="notifications">Notifications <span data-notification-badge></span></a></li>
        <li class="nav-item"><a class="nav-link" href="${dashboardUrl}">Profile</a></li>
        <li class="nav-item"><button class="nav-link nav-button" id="nav-logout" type="button">Logout</button></li>
      `;
    } else {
      navAuthContainer.innerHTML = `
        <li class="nav-item"><a class="nav-link" href="orders.html">Orders</a></li>
        <li class="nav-item"><a class="nav-link" href="favorites">Favorites</a></li>
        <li class="nav-item"><a class="nav-link" href="notifications">Notifications <span data-notification-badge></span></a></li>
        <li class="nav-item"><a class="nav-link" href="${dashboardUrl}">Profile</a></li>
        <li class="nav-item"><button class="nav-link nav-button" id="nav-logout" type="button">Logout</button></li>
      `;
    }
  } else {
    navAuthContainer.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="login.html">Login</a></li>
      <li class="nav-item"><a class="nav-link nav-cta" href="register.html">Register</a></li>
    `;
  }
  setActiveNavLink();

  if (window.HomeyChefNotifications && typeof window.HomeyChefNotifications.init === 'function') {
    window.HomeyChefNotifications.init();
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

function setActiveNavLink() {
  const navMenu = document.getElementById('nav-menu');
  if (!navMenu) return;

  const current = window.location.pathname.split('/').pop() || 'index.html';
  const links = navMenu.querySelectorAll('a.nav-link');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
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
