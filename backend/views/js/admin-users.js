   // Global variables
        let currentUsers = [];
        let currentPage = 1;
        const itemsPerPage = 10;
        let totalPages = 1;
        let editingUserId = null;

        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
            initLogoutButton();
            initializePage();
        });

        async function initializePage() {
            await loadUsers();
            setupEventListeners();
        }

        function setupEventListeners() {
            // Search with debounce
            let searchTimeout;
            document.getElementById('users-search').addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    currentPage = 1;
                    loadUsers();
                }, 300);
            });

            // Edit form submission
            document.getElementById('edit-user-form').addEventListener('submit', handleEditUser);
        }

        async function loadUsers() {
            showLoading();
            
            try {
                const searchQuery = document.getElementById('users-search').value;
                const roleFilter = document.getElementById('role-filter').value;
                const statusFilter = document.getElementById('status-filter').value;
                const sortBy = document.getElementById('sort-by').value;

                const params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (roleFilter) params.append('role', roleFilter);
                if (statusFilter) params.append('status', statusFilter);
                if (sortBy) params.append('sort', sortBy);
                params.append('page', currentPage);
                params.append('limit', itemsPerPage);

                const response = await apiRequest(`/users?${params}`);
                currentUsers = response.users || response;
                
                updateStatistics();
                renderUsersTable();
                updatePagination(response.totalCount || currentUsers.length);
                
            } catch (error) {
                console.error('Failed to load users:', error);
                showNotification('Failed to load users data', 'error');
                showEmptyState();
            } finally {
                hideLoading();
            }
        }

        function updateStatistics() {
            const total = currentUsers.length;
            const active = currentUsers.filter(u => u.isActive).length;
            const admins = currentUsers.filter(u => u.role === 'admin').length;

            document.getElementById('total-users').textContent = total;
            document.getElementById('active-users').textContent = active;
            document.getElementById('admin-users').textContent = admins;
        }

        function renderUsersTable() {
            const tbody = document.getElementById('users-tbody');
            tbody.innerHTML = '';

            if (currentUsers.length === 0) {
                showEmptyState();
                return;
            }

            currentUsers.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
<td>
  <div class="chef-card">
    <div class="avatar-circle ${user.isActive ? 'active' : 'inactive'}">
      ${getInitials(user.name)}
    </div>

    <div class="chef-meta">
      <span class="chef-name">${user.name || 'N/A'}</span>
      <span class="chef-id">#${user.id}</span>
      <span class="chef-email">${user.email || 'N/A'}</span>
    </div>
  </div>
</td>

<td>
  <div class="badge-stack">
    <span class="role-pill ${user.role}">
      ${user.role.toUpperCase()}
    </span>

    <span class="status-pill ${user.isActive ? 'active' : 'inactive'}">
      ${user.isActive ? 'Active' : 'Inactive'}
    </span>
  </div>
</td>

<td>
  <div class="time-stack">
    <span>${formatDate(user.createdAt)}</span>
    <small>${formatTimeAgo(user.createdAt)}</small>
  </div>
</td>

<td>
  ${user.lastLogin ? `
    <div class="time-stack">
      <span>${formatDate(user.lastLogin)}</span>
      <small>${formatTimeAgo(user.lastLogin)}</small>
    </div>
  ` : `<span class="text-muted">Never</span>`}
</td>

<td>
  <div class="action-cluster">
    <button class="icon-btn info" onclick="viewUser(${user.id})" title="View">
      👁️
    </button>

    <button class="icon-btn warning" onclick="editUser(${user.id})" title="Edit">
      ✏️
    </button>

    <button class="icon-btn ${user.isActive ? 'danger' : 'success'}"
            onclick="toggleUserStatus(${user.id}, ${!user.isActive})"
            title="${user.isActive ? 'Deactivate' : 'Activate'}">
      ${user.isActive ? '⛔' : '✅'}
    </button>
        ${isAdmin() ? `

        <button class="icon-btn danger" onclick="deleteUser(${user.id})" title="Delete">
            🗑️
        </button>
        ` : ''}
  </div>
</td>
`;


                tbody.appendChild(tr);
            });

            document.getElementById('table-container').style.display = 'block';
            document.getElementById('empty-state').style.display = 'none';
        }

        async function viewUser(id) {
            try {
                const user = await apiRequest(`/users/${id}`);
                showUserModal(user);
            } catch (error) {
                console.error('Failed to load user details:', error);
                showNotification('Failed to load user details', 'error');
            }
        }

        function showUserModal(user) {
            const modal = document.getElementById('user-modal');
            const details = document.getElementById('user-details');
            
            details.innerHTML = `
                <div class="user-profile">
                    <div class="profile-header">
                        <div class="avatar large">${getInitials(user.name)}</div>
                        <div>
                            <h4>${user.name}</h4>
                            <p>${user.email}</p>
                        </div>
                    </div>
                    
                    <div class="profile-details">
                        <div class="detail-group">
                            <label>User ID:</label>
                            <span>${user.id}</span>
                        </div>
                        <div class="detail-group">
                            <label>Role:</label>
                            <span class="role-badge ${user.role}">${user.role.toUpperCase()}</span>
                        </div>
                        <div class="detail-group">
                            <label>Status:</label>
                            <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
                                ${user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div class="detail-group">
                            <label>Registration Date:</label>
                            <span>${formatDate(user.createdAt)}</span>
                        </div>
                        ${user.lastLogin ? `
                        <div class="detail-group">
                            <label>Last Login:</label>
                            <span>${formatDate(user.lastLogin)}</span>
                        </div>
                        ` : ''}
                        ${user.phone ? `
                        <div class="detail-group">
                            <label>Phone:</label>
                            <span>${user.phone}</span>
                        </div>
                        ` : ''}
                        ${user.address ? `
                        <div class="detail-group">
                            <label>Address:</label>
                            <span>${user.address}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
        }

        async function editUser(id) {
                // Edit feature disabled for now — show coming soon message
                showNotification('Edit users feature coming soon!', 'info');
        }

        function showEditModal(user) {
            editingUserId = user.id;
            const modal = document.getElementById('edit-user-modal');
            
            document.getElementById('edit-name').value = user.name || '';
            document.getElementById('edit-email').value = user.email || '';
            document.getElementById('edit-role').value = user.role || 'user';
            document.getElementById('edit-status').value = user.isActive ? 'true' : 'false';
            
            document.getElementById('edit-error').style.display = 'none';
            modal.style.display = 'block';
        }

        async function handleEditUser(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('edit-name').value.trim(),
                email: document.getElementById('edit-email').value.trim(),
                role: document.getElementById('edit-role').value,
                isActive: document.getElementById('edit-status').value === 'true'
            };

            // Basic validation
            if (!formData.name || !formData.email) {
                showEditError('Please fill in all required fields');
                return;
            }

            try {
                await apiRequest(`/users/${editingUserId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                
                showNotification('User updated successfully', 'success');
                closeEditModal();
                await loadUsers();
            } catch (error) {
                console.error('Failed to update user:', error);
                showEditError(error.message || 'Failed to update user');
            }
        }

        function showEditError(message) {
            const errorDiv = document.getElementById('edit-error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        async function toggleUserStatus(id, newStatus) {
            const action = newStatus ? 'activate' : 'deactivate';
            if (!confirm(`Are you sure you want to ${action} this user?`)) return;
            
            try {
                await apiRequest(`/users/${id}/status`, {
                    method: 'PATCH',
                    body: JSON.stringify({ isActive: newStatus })
                });
                
                showNotification(`User ${newStatus ? 'activated' : 'deactivated'} successfully`, 'success');
                await loadUsers();
            } catch (error) {
                console.error('Failed to update user status:', error);
                showNotification('Failed to update user status', 'error');
            }
        }

        async function deleteUser(id) {
            if (!confirm('Are you sure you want to permanently delete this user?')) return;

            try {
                await apiRequest(`/users/${id}`, {
                    method: 'DELETE'
                });

                showNotification('User deleted successfully', 'success');
                await loadUsers();
            } catch (error) {
                console.error('Failed to delete user:', error);
                showNotification('Failed to delete user', 'error');
            }
        }

        function changePage(direction) {
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                loadUsers();
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
            document.getElementById('users-search').value = '';
            document.getElementById('role-filter').value = '';
            document.getElementById('status-filter').value = '';
            document.getElementById('sort-by').value = 'newest';
            currentPage = 1;
            loadUsers();
        }

        function closeModal() {
            document.getElementById('user-modal').style.display = 'none';
        }

        function closeEditModal() {
            document.getElementById('edit-user-modal').style.display = 'none';
            editingUserId = null;
        }

        // Utility functions
        function getInitials(name) {
            return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
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

        // Close modals when clicking outside
        window.onclick = function(event) {
            const userModal = document.getElementById('user-modal');
            const editModal = document.getElementById('edit-user-modal');
            
            if (event.target === userModal) closeModal();
            if (event.target === editModal) closeEditModal();
        }

        // Placeholder functions for future implementation
        function exportUsers() {
            showNotification('Export feature coming soon!', 'info');
        }

        function showAddUserModal() {
            showNotification('Add user feature coming soon!', 'info');
        }