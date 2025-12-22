        // Global variables
        let currentChefs = [];
        let currentPage = 1;
        const itemsPerPage = 10;
        let totalPages = 1;

        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
            initLogoutButton();
            initializePage();
        });

        async function initializePage() {
            await loadChefs();
            setupEventListeners();
        }

        function setupEventListeners() {
            // Search with debounce
            let searchTimeout;
            document.getElementById('chefs-search').addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    currentPage = 1;
                    loadChefs();
                }, 300);
            });
        }

        async function loadChefs() {
            showLoading();
            
            try {
                const searchQuery = document.getElementById('chefs-search').value;
                const statusFilter = document.getElementById('status-filter').value;
                const sortBy = document.getElementById('sort-by').value;

                const params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (statusFilter) params.append('status', statusFilter);
                if (sortBy) params.append('sort', sortBy);
                params.append('page', currentPage);
                params.append('limit', itemsPerPage);

                const response = await apiRequest(`/chefs?${params}`);
                currentChefs = response.chefs || response;
                
                updateStatistics();
                renderChefsTable();
                updatePagination(response.totalCount || currentChefs.length);
                
            } catch (error) {
                console.error('Failed to load chefs:', error);
                showNotification('Failed to load chefs data', 'error');
                showEmptyState();
            } finally {
                hideLoading();
            }
        }

        function updateStatistics() {
            const total = currentChefs.length;
            const active = currentChefs.filter(c => c.isActive).length;
            const pending = currentChefs.filter(c => c.status === 'pending').length;

            document.getElementById('total-chefs').textContent = total;
            document.getElementById('active-chefs').textContent = active;
            document.getElementById('pending-chefs').textContent = pending;
        }

        function renderChefsTable() {
            const tbody = document.getElementById('chefs-tbody');
            tbody.innerHTML = '';

            if (currentChefs.length === 0) {
                showEmptyState();
                return;
            }

            currentChefs.forEach(chef => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
<td>
  <div class="chef-card">
    <div class="avatar-circle ${chef.isActive ? 'active' : 'inactive'}">
      ${getInitials(chef.name)}
    </div>

    <div class="chef-meta">
      <span class="chef-name">${chef.name || 'N/A'}</span>
      <span class="chef-id">#${chef.id}</span>
    </div>
  </div>
</td>

<td>
  <div class="contact-stack">
    <span>📧 ${chef.email || 'N/A'}</span>
    <span>📞 ${chef.phone || 'N/A'}</span>
  </div>
</td>

<td>
  <span class="status-pill ${getStatusClass(chef)}">
    ${getStatusText(chef)}
  </span>
</td>

<td>
  <div class="time-stack">
    <span>${formatDate(chef.createdAt)}</span>
    <small>${formatTimeAgo(chef.createdAt)}</small>
  </div>
</td>

<td>
  <div class="action-cluster">
    <button class="icon-btn info" onclick="viewChef(${chef.id})" title="View">
      👁️
    </button>

    <button class="icon-btn warning" onclick="editChef(${chef.id})" title="Edit">
      ✏️
    </button>

    <button class="icon-btn ${chef.isActive ? 'danger' : 'success'}"
            onclick="toggleChefStatus(${chef.id}, ${!chef.isActive})"
            title="${chef.isActive ? 'Deactivate' : 'Activate'}">
      ${chef.isActive ? '⛔' : '✅'}
    </button>
  </div>
</td>
`;

                tbody.appendChild(tr);
            });

            document.getElementById('table-container').style.display = 'block';
            document.getElementById('empty-state').style.display = 'none';
        }

        async function viewChef(id) {
            try {
                const chef = await apiRequest(`/chefs/${id}`);
                showChefModal(chef);
            } catch (error) {
                console.error('Failed to load chef details:', error);
                showNotification('Failed to load chef details', 'error');
            }
        }

        function showChefModal(chef) {
            const modal = document.getElementById('chef-modal');
            const details = document.getElementById('chef-details');
            
            details.innerHTML = `
<div class="chef-profile-card">

  <!-- ===== HEADER ===== -->
  <div class="chef-header">
    <div class="avatar-xl ${chef.isActive ? 'active' : 'inactive'}">
      ${getInitials(chef.name)}
    </div>

    <div class="chef-header-info">
      <h2 class="chef-name">${chef.name}</h2>
      <span class="chef-role">👨‍🍳 Professional Chef</span>

      <span class="status-pill ${getStatusClass(chef)}">
        ${getStatusText(chef)}
      </span>
    </div>
  </div>

  <!-- ===== DETAILS GRID ===== -->
  <div class="chef-info-grid">
    <div class="info-item">
      <label>Email</label>
      <span>${chef.email || 'N/A'}</span>
    </div>

    <div class="info-item">
      <label>Phone</label>
      <span>${chef.phone || 'N/A'}</span>
    </div>

    <div class="info-item">
      <label>Address</label>
      <span>${chef.address || 'N/A'}</span>
    </div>

    <div class="info-item">
      <label>Registered</label>
      <span>${formatDate(chef.createdAt)}</span>
    </div>
  </div>

  <!-- ===== BIO ===== -->
  ${chef.bio ? `
  <div class="chef-bio-section">
    <h4>📝 Bio</h4>
    <p>${chef.bio}</p>
  </div>
  ` : ''}

</div>
`;

            
            modal.style.display = 'block';
        }

        async function toggleChefStatus(id, newStatus) {
            const action = newStatus ? 'activate' : 'deactivate';
            if (!confirm(`Are you sure you want to ${action} this chef?`)) return;
            
            try {
                await apiRequest(`/chefs/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ isActive: newStatus })
                });
                
                showNotification(`Chef ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
                await loadChefs();
            } catch (error) {
                console.error('Failed to update chef status:', error);
                showNotification('Failed to update chef status', 'error');
            }
        }

        function changePage(direction) {
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                loadChefs();
            }
        }

        function updatePagination(totalCount) {
            const pagination = document.getElementById('pagination');
            const pageInfo = document.getElementById('page-info');
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');

            totalPages = Math.ceil(totalCount / itemsPerPage);
            
            if (totalPages <= 1) {
                pagination.style.display = 'none';
                return;
            }

            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;
            pagination.style.display = 'flex';
        }

        function showLoading() {
            document.getElementById('loading-state').style.display = 'block';
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

        // Utility functions
        function getInitials(name) {
            return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
        }

        function getStatusClass(chef) {
            if (!chef.isActive) return 'status-inactive';
            if (chef.status === 'pending') return 'status-pending';
            return 'status-active';
        }

        function getStatusText(chef) {
            if (!chef.isActive) return 'Inactive';
            if (chef.status === 'pending') return 'Pending Approval';
            return 'Active';
        }

        function formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
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

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('chef-modal');
            if (event.target === modal) {
                closeModal();
            }
        }

        // Placeholder functions for future implementation
        function exportChefs() {
            showNotification('Export feature coming soon!', 'info');
        }

        function showAddChefModal() {
            showNotification('Add chef feature coming soon!', 'info');
        }

        function editChef(id) {
            showNotification('Edit chef feature coming soon!', 'info');
        }