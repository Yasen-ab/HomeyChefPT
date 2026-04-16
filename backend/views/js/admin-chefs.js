let currentChefs = [];
let currentPage = 1;
const itemsPerPage = 10;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initLogoutButton();
  initializePage();
});

function checkAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  if (!isAdmin()) {
    redirectToDashboard();
  }
}

async function initializePage() {
  setupEventListeners();
  await loadChefs();
}

function setupEventListeners() {
  let searchTimeout;
  const searchInput = document.getElementById('chefs-search');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadChefs();
      }, 300);
    });
  }

  ['status-filter', 'sort-by'].forEach((id) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.addEventListener('change', () => {
      currentPage = 1;
      loadChefs();
    });
  });
}

async function loadChefs() {
  showLoading();

  try {
    const params = new URLSearchParams();
    const searchQuery = document.getElementById('chefs-search')?.value?.trim() || '';
    const statusFilter = document.getElementById('status-filter')?.value || '';
    const sortBy = document.getElementById('sort-by')?.value || 'newest';

    if (searchQuery) params.append('search', searchQuery);
    if (statusFilter) params.append('status', statusFilter);
    if (sortBy) params.append('sort', sortBy);
    params.append('page', currentPage);
    params.append('limit', itemsPerPage);

    const response = await apiRequest(`/admin/chefs?${params.toString()}`);
    currentChefs = Array.isArray(response.chefs) ? response.chefs : [];

    updateStatistics(response);
    renderChefsTable();
    updatePagination(response.totalCount || 0);
  } catch (error) {
    console.error('Failed to load chefs:', error);
    showNotification(error.message || 'Unable to load chef registrations', 'error');
    showEmptyState();
  } finally {
    hideLoading();
  }
}

function updateStatistics(response) {
  const total = response?.summary?.totalChefs ?? response?.totalCount ?? currentChefs.length;
  const active = response?.summary?.activeChefs ?? currentChefs.filter((chef) => chef.isActive).length;
  const pending =
    response?.summary?.pendingChefs ??
    currentChefs.filter((chef) => chef.approvalStatus === 'pending').length;

  document.getElementById('total-chefs').textContent = total;
  document.getElementById('active-chefs').textContent = active;
  document.getElementById('pending-chefs').textContent = pending;
}

function renderChefsTable() {
  const tbody = document.getElementById('chefs-tbody');
  tbody.innerHTML = '';

  if (!currentChefs.length) {
    showEmptyState();
    return;
  }

  currentChefs.forEach((chef) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="chef-card">
          <div class="avatar-circle ${chef.isActive ? 'active' : 'inactive'}">
            ${getInitials(chef.name)}
          </div>
          <div class="chef-meta">
            <span class="chef-name">${escapeHtml(chef.name || 'N/A')}</span>
            <span class="chef-id">#${chef.id}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="contact-stack">
          <span>${escapeHtml(chef.email || 'N/A')}</span>
          <span>${escapeHtml(chef.phone || 'N/A')}</span>
        </div>
      </td>
      <td>
        <div class="badge-stack">
          <span class="status-pill ${getApprovalStatusClass(chef.approvalStatus)}">
            ${getApprovalStatusText(chef.approvalStatus)}
          </span>
          <span class="status-pill ${chef.isActive ? 'status-active' : 'status-inactive'}">
            ${chef.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </td>
      <td>
        <div class="time-stack">
          <span>${formatDate(chef.createdAt)}</span>
          <small>${formatTimeAgo(chef.createdAt)}</small>
        </div>
      </td>
      <td>
        <div class="action-cluster">
          <button class="icon-btn info" onclick="viewChef(${chef.id})" title="View chef details">
            <i class="fas fa-eye"></i>
          </button>
          ${buildApprovalAction(chef)}
          ${buildActivationAction(chef)}
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById('table-container').style.display = 'block';
  document.getElementById('empty-state').style.display = 'none';
}

function buildApprovalAction(chef) {
  if (chef.approvalStatus === 'pending') {
    return `
      <button class="icon-btn success" onclick="reviewChef(${chef.id}, 'approve')" title="Approve chef">
        <i class="fas fa-check"></i>
      </button>
      <button class="icon-btn danger" onclick="reviewChef(${chef.id}, 'reject')" title="Reject chef">
        <i class="fas fa-times"></i>
      </button>
    `;
  }

  if (chef.approvalStatus === 'rejected') {
    return `
      <button class="icon-btn success" onclick="reviewChef(${chef.id}, 'approve')" title="Approve rejected chef">
        <i class="fas fa-user-check"></i>
      </button>
    `;
  }

  return '';
}

function buildActivationAction(chef) {
  if (chef.approvalStatus !== 'approved') {
    return '';
  }

  return chef.isActive
    ? `
      <button class="icon-btn warning" onclick="toggleChefActivation(${chef.id}, false)" title="Deactivate chef">
        <i class="fas fa-user-slash"></i>
      </button>
    `
    : `
      <button class="icon-btn success" onclick="toggleChefActivation(${chef.id}, true)" title="Reactivate chef">
        <i class="fas fa-power-off"></i>
      </button>
    `;
}

async function viewChef(id) {
  try {
    const chef = await apiRequest(`/admin/chefs/${id}`);
    showChefModal(chef);
  } catch (error) {
    console.error('Failed to load chef details:', error);
    showNotification(error.message || 'Failed to load chef details', 'error');
  }
}

function showChefModal(chef) {
  const modal = document.getElementById('chef-modal');
  const details = document.getElementById('chef-details');

  details.innerHTML = `
    <div class="chef-profile-card">
      <div class="chef-header">
        <div class="avatar-xl ${chef.isActive ? 'active' : 'inactive'}">
          ${getInitials(chef.name)}
        </div>
        <div class="chef-header-info">
          <h2 class="chef-name">${escapeHtml(chef.name || 'Unknown Chef')}</h2>
          <span class="chef-role">Professional Chef Application</span>
          <div class="badge-stack">
            <span class="status-pill ${getApprovalStatusClass(chef.approvalStatus)}">
              ${getApprovalStatusText(chef.approvalStatus)}
            </span>
            <span class="status-pill ${chef.isActive ? 'status-active' : 'status-inactive'}">
              ${chef.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div class="chef-info-grid">
        <div class="info-item">
          <label>Email</label>
          <span>${escapeHtml(chef.email || 'N/A')}</span>
        </div>
        <div class="info-item">
          <label>Phone</label>
          <span>${escapeHtml(chef.phone || 'N/A')}</span>
        </div>
        <div class="info-item">
          <label>Address</label>
          <span>${escapeHtml(chef.address || 'N/A')}</span>
        </div>
        <div class="info-item">
          <label>Specialties</label>
          <span>${escapeHtml(chef.specialties || 'N/A')}</span>
        </div>
        <div class="info-item">
          <label>Registered</label>
          <span>${formatDate(chef.createdAt)}</span>
        </div>
        <div class="info-item">
          <label>Orders</label>
          <span>${chef.ordersCount ?? 0}</span>
        </div>
        <div class="info-item">
          <label>Dishes</label>
          <span>${chef.dishesCount ?? 0}</span>
        </div>
        <div class="info-item">
          <label>Rating</label>
          <span>${Number(chef.rating || 0).toFixed(1)}</span>
        </div>
      </div>

      ${chef.bio ? `
        <div class="chef-bio-section">
          <h4>Bio</h4>
          <p>${escapeHtml(chef.bio)}</p>
        </div>
      ` : ''}
    </div>
  `;

  modal.style.display = 'flex';
}

async function reviewChef(id, decision) {
  const actionText = decision === 'approve' ? 'approve' : 'reject';
  if (!confirm(`Are you sure you want to ${actionText} this chef registration?`)) {
    return;
  }

  try {
    await apiRequest(`/admin/chefs/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ decision })
    });

    showNotification(
      decision === 'approve' ? 'Chef approved successfully' : 'Chef rejected successfully',
      'success'
    );
    await loadChefs();
  } catch (error) {
    console.error('Failed to review chef:', error);
    showNotification(error.message || 'Failed to update chef approval', 'error');
  }
}

async function toggleChefActivation(id, shouldActivate) {
  const action = shouldActivate ? 'reactivate' : 'deactivate';
  if (!confirm(`Are you sure you want to ${action} this chef account?`)) {
    return;
  }

  try {
    await apiRequest(`/admin/chefs/${id}/${action}`, {
      method: 'PATCH'
    });

    showNotification(
      shouldActivate ? 'Chef reactivated successfully' : 'Chef deactivated successfully',
      'success'
    );
    await loadChefs();
  } catch (error) {
    console.error('Failed to update chef activation:', error);
    showNotification(error.message || 'Failed to update chef status', 'error');
  }
}

function changePage(direction) {
  const nextPage = currentPage + direction;
  if (nextPage < 1 || nextPage > totalPages) {
    return;
  }

  currentPage = nextPage;
  loadChefs();
}

function updatePagination(totalCount) {
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  totalPages = Math.max(Math.ceil(totalCount / itemsPerPage), 1);

  if (totalCount <= itemsPerPage) {
    pagination.style.display = 'none';
    return;
  }

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  pagination.style.display = 'flex';
}

function showLoading() {
  document.getElementById('loading-state').style.display = 'grid';
  document.getElementById('table-container').style.display = 'none';
  document.getElementById('empty-state').style.display = 'none';
}

function hideLoading() {
  document.getElementById('loading-state').style.display = 'none';
}

function showEmptyState() {
  document.getElementById('table-container').style.display = 'none';
  document.getElementById('empty-state').style.display = 'block';
  document.getElementById('pagination').style.display = 'none';
}

function clearFilters() {
  document.getElementById('chefs-search').value = '';
  document.getElementById('status-filter').value = '';
  document.getElementById('sort-by').value = 'newest';
  currentPage = 1;
  loadChefs();
}

function closeModal() {
  document.getElementById('chef-modal').style.display = 'none';
}

function exportChefs() {
  showNotification('Export feature coming soon!', 'info');
}

function showAddChefModal() {
  showNotification('Chef applications are now created from the public registration page.', 'info');
}

function getInitials(name) {
  return String(name || '?')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getApprovalStatusClass(status) {
  if (status === 'pending') return 'status-pending';
  if (status === 'rejected') return 'status-rejected';
  return 'status-approved';
}

function getApprovalStatusText(status) {
  if (status === 'pending') return 'Pending Approval';
  if (status === 'rejected') return 'Rejected';
  return 'Approved';
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return `${Math.ceil(diffDays / 30)} months ago`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

window.onclick = function(event) {
  const modal = document.getElementById('chef-modal');
  if (event.target === modal) {
    closeModal();
  }
};
