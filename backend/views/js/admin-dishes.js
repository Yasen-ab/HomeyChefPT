 // Global variables
        let currentDishes = [];
        let currentPage = 1;
        const itemsPerPage = 10;
        let totalPages = 1;
        let editingDishId = null;
        let categories = [];
        let chefs = [];

        document.addEventListener('DOMContentLoaded', () => {
            checkAuth();
            initLogoutButton();
            initializePage();
        });

        async function initializePage() {
            await loadCategories();
            await loadChefs();
            await loadDishes();
            setupEventListeners();
        }

        function setupEventListeners() {
            // Search with debounce
            let searchTimeout;
            document.getElementById('dishes-search').addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    currentPage = 1;
                    loadDishes();
                }, 300);
            });

            // Edit form submission
            document.getElementById('edit-dish-form').addEventListener('submit', handleEditDish);
        }

        async function loadCategories() {
            try {
                // This would typically come from an API
                categories = ['Main Course', 'Appetizer', 'Dessert', 'Salad', 'Soup', 'Beverage'];
                const categoryFilter = document.getElementById('category-filter');
                const editCategory = document.getElementById('edit-category');
                
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categoryFilter.appendChild(option.cloneNode(true));
                    editCategory.appendChild(option);
                });
            } catch (error) {
                console.error('Failed to load categories:', error);
            }
        }

        async function loadChefs() {
            try {
                chefs = await apiRequest('/chefs');
                const chefFilter = document.getElementById('chef-filter');
                
                chefs.forEach(chef => {
                    const option = document.createElement('option');
                    option.value = chef.id;
                    option.textContent = chef.name;
                    chefFilter.appendChild(option);
                });
            } catch (error) {
                console.error('Failed to load chefs:', error);
            }
        }

        async function loadDishes() {
            showLoading();
            
            try {
                const searchQuery = document.getElementById('dishes-search').value;
                const categoryFilter = document.getElementById('category-filter').value;
                const availabilityFilter = document.getElementById('availability-filter').value;
                const chefFilter = document.getElementById('chef-filter').value;
                const sortBy = document.getElementById('sort-by').value;

                const params = new URLSearchParams();
                if (searchQuery) params.append('search', searchQuery);
                if (categoryFilter) params.append('category', categoryFilter);
                if (availabilityFilter) params.append('availability', availabilityFilter);
                if (chefFilter) params.append('chefId', chefFilter);
                if (sortBy) params.append('sort', sortBy);
                params.append('page', currentPage);
                params.append('limit', itemsPerPage);

                const response = await apiRequest(`/dishes?${params}`);
                currentDishes = response.dishes || response;
                
                updateStatistics();
                renderDishesTable();
                updatePagination(response.totalCount || currentDishes.length);
                
            } catch (error) {
                console.error('Failed to load dishes:', error);
                showNotification('Failed to load dishes data', 'error');
                showEmptyState();
            } finally {
                hideLoading();
            }
        }

        function updateStatistics() {
            const total = currentDishes.length;
            const available = currentDishes.filter(d => d.isAvailable).length;
            const uniqueCategories = [...new Set(currentDishes.map(d => d.category))].length;

            document.getElementById('total-dishes').textContent = total;
            document.getElementById('available-dishes').textContent = available;
            document.getElementById('total-categories').textContent = uniqueCategories;
        }

        function renderDishesTable() {
            const tbody = document.getElementById('dishes-tbody');
            tbody.innerHTML = '';

            if (currentDishes.length === 0) {
                showEmptyState();
                return;
            }

            currentDishes.forEach(dish => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="dish-info">
                            <div class="dish-image">
                                ${dish.imageUrl ? 
                                    `<img src="${dish.imageUrl}" alt="${dish.name}" onerror="this.style.display='none'">` : 
                                    `<div class="image-placeholder">🍽️</div>`
                                }
                            </div>
                            <div>
                                <strong>${dish.name || 'N/A'}</strong>
                                ${dish.description ? `<p class="dish-description">${dish.description}</p>` : ''}
                                <small>ID: ${dish.id}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="chef-info">
                            <strong>${dish.Chef?.name || 'Unknown Chef'}</strong>
                            <div class="category-badge">${dish.category || 'Uncategorized'}</div>
                        </div>
                    </td>
                    <td>
                        <div class="price">${formatCurrency(dish.price)}</div>
                        <span class="availability-badge ${dish.isAvailable ? 'available' : 'unavailable'}">
                            ${dish.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                    </td>
                    <td>
                        <div>${formatDate(dish.createdAt)}</div>
                        <small>${formatTimeAgo(dish.createdAt)}</small>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-info" onclick="viewDish(${dish.id})" title="View Details">
                                👁️ View
                            </button>
                            <button class="btn btn-sm btn-warning" onclick="editDish(${dish.id})" title="Edit Dish">
                                ✏️ Edit
                            </button>
                            <button class="btn btn-sm ${dish.isAvailable ? 'btn-danger' : 'btn-success'}" 
                                    onclick="toggleDishAvailability(${dish.id}, ${!dish.isAvailable})"
                                    title="${dish.isAvailable ? 'Make Unavailable' : 'Make Available'}">
                                ${dish.isAvailable ? '❌ Unavailable' : '✅ Available'}
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('table-container').style.display = 'block';
            document.getElementById('empty-state').style.display = 'none';
        }

        async function viewDish(id) {
            try {
                const dish = await apiRequest(`/dishes/${id}`);
                showDishModal(dish);
            } catch (error) {
                console.error('Failed to load dish details:', error);
                showNotification('Failed to load dish details', 'error');
            }
        }

        function showDishModal(dish) {
            const modal = document.getElementById('dish-modal');
            const details = document.getElementById('dish-details');
            
            details.innerHTML = `
                <div class="dish-profile">
                    <div class="profile-header">
                        <div class="dish-image large">
                            ${dish.imageUrl ? 
                                `<img src="${dish.imageUrl}" alt="${dish.name}">` : 
                                `<div class="image-placeholder large">🍽️</div>`
                            }
                        </div>
                        <div>
                            <h4>${dish.name}</h4>
                            <p class="price-large">${formatCurrency(dish.price)}</p>
                        </div>
                    </div>
                    
                    <div class="profile-details">
                        <div class="detail-group">
                            <label>Dish ID:</label>
                            <span>${dish.id}</span>
                        </div>
                        <div class="detail-group">
                            <label>Chef:</label>
                            <span>${dish.Chef?.name || 'Unknown Chef'}</span>
                        </div>
                        <div class="detail-group">
                            <label>Category:</label>
                            <span class="category-badge">${dish.category || 'Uncategorized'}</span>
                        </div>
                        <div class="detail-group">
                            <label>Availability:</label>
                            <span class="availability-badge ${dish.isAvailable ? 'available' : 'unavailable'}">
                                ${dish.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
                        </div>
                        <div class="detail-group">
                            <label>Created Date:</label>
                            <span>${formatDate(dish.createdAt)}</span>
                        </div>
                        ${dish.description ? `
                        <div class="detail-group full-width">
                            <label>Description:</label>
                            <p class="dish-description">${dish.description}</p>
                        </div>
                        ` : ''}
                        ${dish.ingredients ? `
                        <div class="detail-group full-width">
                            <label>Ingredients:</label>
                            <p>${dish.ingredients}</p>
                        </div>
                        ` : ''}
                        ${dish.allergens ? `
                        <div class="detail-group full-width">
                            <label>Allergens:</label>
                            <p>${dish.allergens}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
        }

        async function editDish(id) {
            try {
                const dish = await apiRequest(`/dishes/${id}`);
                showEditModal(dish);
            } catch (error) {
                console.error('Failed to load dish for editing:', error);
                showNotification('Failed to load dish data', 'error');
            }
        }

        function showEditModal(dish) {
            editingDishId = dish.id;
            const modal = document.getElementById('edit-dish-modal');
            
            document.getElementById('edit-name').value = dish.name || '';
            document.getElementById('edit-description').value = dish.description || '';
            document.getElementById('edit-price').value = dish.price || '';
            document.getElementById('edit-category').value = dish.category || '';
            document.getElementById('edit-availability').value = dish.isAvailable ? 'true' : 'false';
            document.getElementById('edit-image').value = dish.imageUrl || '';
            
            document.getElementById('edit-error').style.display = 'none';
            modal.style.display = 'block';
        }

        async function handleEditDish(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('edit-name').value.trim(),
                description: document.getElementById('edit-description').value.trim(),
                price: parseFloat(document.getElementById('edit-price').value),
                category: document.getElementById('edit-category').value,
                isAvailable: document.getElementById('edit-availability').value === 'true',
                imageUrl: document.getElementById('edit-image').value.trim()
            };

            // Basic validation
            if (!formData.name || !formData.price || formData.price < 0) {
                showEditError('Please fill in all required fields with valid values');
                return;
            }

            try {
                await apiRequest(`/dishes/${editingDishId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                
                showNotification('Dish updated successfully', 'success');
                closeEditModal();
                await loadDishes();
            } catch (error) {
                console.error('Failed to update dish:', error);
                showEditError(error.message || 'Failed to update dish');
            }
        }

        function showEditError(message) {
            const errorDiv = document.getElementById('edit-error');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }

        async function toggleDishAvailability(id, newStatus) {
            const action = newStatus ? 'make available' : 'make unavailable';
            if (!confirm(`Are you sure you want to ${action} this dish?`)) return;
            
            try {
                await apiRequest(`/dishes/${id}/availability`, {
                    method: 'PATCH',
                    body: JSON.stringify({ isAvailable: newStatus })
                });
                
                showNotification(`Dish ${newStatus ? 'made available' : 'made unavailable'} successfully`, 'success');
                await loadDishes();
            } catch (error) {
                console.error('Failed to update dish availability:', error);
                showNotification('Failed to update dish availability', 'error');
            }
        }

        function changePage(direction) {
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                loadDishes();
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
            document.getElementById('dishes-search').value = '';
            document.getElementById('category-filter').value = '';
            document.getElementById('availability-filter').value = '';
            document.getElementById('chef-filter').value = '';
            document.getElementById('sort-by').value = 'newest';
            currentPage = 1;
            loadDishes();
        }

        function closeModal() {
            document.getElementById('dish-modal').style.display = 'none';
        }

        function closeEditModal() {
            document.getElementById('edit-dish-modal').style.display = 'none';
            editingDishId = null;
        }

        // Utility functions
        function formatCurrency(amount) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(amount || 0);
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
            const dishModal = document.getElementById('dish-modal');
            const editModal = document.getElementById('edit-dish-modal');
            
            if (event.target === dishModal) closeModal();
            if (event.target === editModal) closeEditModal();
        }

        // Placeholder functions for future implementation
        function exportDishes() {
            showNotification('Export feature coming soon!', 'info');
        }

        function showAddDishModal() {
            showNotification('Add dish feature coming soon!', 'info');
        }