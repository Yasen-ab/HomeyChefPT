// Dishes management for Chef - Enhanced Version
document.addEventListener('DOMContentLoaded', () => {
    ensureChefAuth();
    initializePage();
});

let allDishes = [];
let currentEditingDish = null;
let dishToDelete = null;

function ensureChefAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    const user = getUserData();
    if (user?.role !== 'chef') {
        redirectToDashboard();
    }
}

async function initializePage() {
    initLogoutButton();
    bindDishForm();
    setupEventListeners();
    await loadChefDishes();
    updateStatistics();
}

function setupEventListeners() {
    // Search with debounce
    let searchTimeout;
    const searchInput = document.getElementById('dishes-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterDishes();
            }, 300);
        });
    }

    // Filters
    const categoryFilter = document.getElementById('category-filter');
    const availabilityFilter = document.getElementById('availability-filter');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterDishes);
    }
    if (availabilityFilter) {
        availabilityFilter.addEventListener('change', filterDishes);
    }

    // Image preview
    const imageInput = document.getElementById('image');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }

    // Cancel edit button
    const cancelEditBtn = document.getElementById('cancel-edit');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetForm);
    }
}

async function loadChefDishes() {
    showLoading();
    const user = getUserData();
    const list = document.getElementById('dishes-list');
    
    if (!list) return;

    try {
        const dishes = await apiRequest(`/chefs/${user.id}/dishes`);
        allDishes = dishes;
        renderDishes(dishes);
        updateStatistics();
        populateCategoryFilter();
        hideLoading();
    } catch (error) {
        console.error('Error loading dishes:', error);
        showEmptyState();
        hideLoading();
    }
}

function renderDishes(dishes) {
    const list = document.getElementById('dishes-list');
    if (!list) return;

    if (dishes.length === 0) {
        showEmptyState();
        return;
    }

    list.innerHTML = dishes.map(dish => renderDishCard(dish)).join('');
    list.style.display = 'grid';
    document.getElementById('empty-state').style.display = 'none';
}

function renderDishCard(dish) {
    const imageUrl = dish.image ? `${API_URL.replace('/api','')}${dish.image}` : 
                    dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
    
    const isAvailable = dish.isAvailable !== false; // Default to true if not specified
    
    return `
        <div class="dish-card" data-dish-id="${dish.id}">
            <div class="dish-card-header">
                <div class="dish-image">
                    <img src="${imageUrl}" alt="${dish.name}" 
                         onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'">
                    ${!isAvailable ? '<div class="unavailable-badge">Unavailable</div>' : ''}
                </div>
                <div class="dish-actions">
                    <button class="btn-icon btn-edit" onclick="editDish(${dish.id})" title="Edit Dish">
                        ✏️
                    </button>
                    <button class="btn-icon btn-delete" onclick="showDeleteModal(${dish.id}, '${dish.name.replace(/'/g, "&#39;")}')" title="Delete Dish">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="dish-card-content">
                <h3 class="dish-name">${dish.name}</h3>
                <p class="dish-description">${dish.description || 'No description available.'}</p>
                
                <div class="dish-details">
                    <div class="detail-item">
                        <span class="label">Category:</span>
                        <span class="value category-tag">${dish.category || 'Uncategorized'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Price:</span>
                        <span class="value price">${formatCurrency(dish.price)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Prep Time:</span>
                        <span class="value">${dish.preparationTime || 30} min</span>
                    </div>
                    ${dish.calories ? `
                    <div class="detail-item">
                        <span class="label">Calories:</span>
                        <span class="value">${dish.calories} cal</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="dish-meta">
                    <span class="availability-badge ${isAvailable ? 'available' : 'unavailable'}">
                        ${isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                    <span class="created-date">
                        ${formatDate(dish.createdAt)}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function bindDishForm() {
    const form = document.getElementById('dish-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitDishForm();
    });
}

async function submitDishForm() {
    const form = document.getElementById('dish-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    
    if (!form || !submitBtn) return;

    // Validate form
    if (!validateForm()) {
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    btnText.textContent = currentEditingDish ? 'Updating Dish...' : 'Adding Dish...';
    btnLoading.style.display = 'inline-block';

    try {
        const formData = new FormData(form);
        
        // Convert availability checkbox to boolean
        formData.set('isAvailable', document.getElementById('isAvailable').checked.toString());

        const token = getAuthToken();
        const url = currentEditingDish ? 
            `${API_URL}/dishes/${currentEditingDish.id}` : 
            `${API_URL}/dishes`;

        const method = currentEditingDish ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `Failed to ${currentEditingDish ? 'update' : 'create'} dish`);
        }

        showNotification(`Dish ${currentEditingDish ? 'updated' : 'created'} successfully!`, 'success');
        
        // Reset form and reload dishes
        resetForm();
        await loadChefDishes();

    } catch (error) {
        console.error('Error submitting dish:', error);
        showNotification(error.message, 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        btnText.textContent = currentEditingDish ? 'Update Dish' : 'Add Dish';
        btnLoading.style.display = 'none';
    }
}

function validateForm() {
    const name = document.getElementById('name').value.trim();
    const price = document.getElementById('price').value;
    const category = document.getElementById('category').value;
    const preparationTime = document.getElementById('preparationTime').value;
    const ingredients = document.getElementById('ingredients').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!name) {
        showNotification('Please enter a dish name', 'error');
        return false;
    }

    if (!price || parseFloat(price) <= 0) {
        showNotification('Please enter a valid price', 'error');
        return false;
    }

    if (!category) {
        showNotification('Please select a category', 'error');
        return false;
    }

    if (!preparationTime || parseInt(preparationTime) < 1) {
        showNotification('Please enter a valid preparation time', 'error');
        return false;
    }

    if (!ingredients) {
        showNotification('Please list the ingredients', 'error');
        return false;
    }

    if (!description) {
        showNotification('Please enter a description', 'error');
        return false;
    }

    return true;
}

async function editDish(dishId) {
    try {
        const dish = allDishes.find(d => d.id === dishId);
        if (!dish) {
            throw new Error('Dish not found');
        }

        currentEditingDish = dish;
        
        // Populate form with dish data
        document.getElementById('dish-id').value = dish.id;
        document.getElementById('name').value = dish.name || '';
        document.getElementById('price').value = dish.price || '';
        document.getElementById('category').value = dish.category || '';
        document.getElementById('preparationTime').value = dish.preparationTime || '';
        document.getElementById('calories').value = dish.calories || '';
        document.getElementById('allergens').value = dish.allergens || '';
        document.getElementById('ingredients').value = dish.ingredients || '';
        document.getElementById('description').value = dish.description || '';
        document.getElementById('isAvailable').checked = dish.isAvailable !== false;

        // Update form title and button
        document.getElementById('form-title').textContent = 'Edit Dish';
        document.getElementById('submit-btn').querySelector('#btn-text').textContent = 'Update Dish';
        document.getElementById('cancel-edit').style.display = 'inline-block';

        // Scroll to form
        document.getElementById('form-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });

    } catch (error) {
        console.error('Error loading dish for editing:', error);
        showNotification('Failed to load dish for editing', 'error');
    }
}

function resetForm() {
    const form = document.getElementById('dish-form');
    if (form) {
        form.reset();
    }
    
    // Clear image preview
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) {
        imagePreview.innerHTML = '';
    }
    
    // Reset form state
    currentEditingDish = null;
    document.getElementById('dish-id').value = '';
    document.getElementById('form-title').textContent = 'Add New Dish';
    document.getElementById('submit-btn').querySelector('#btn-text').textContent = 'Add Dish';
    document.getElementById('cancel-edit').style.display = 'none';
    document.getElementById('isAvailable').checked = true;
}

function showDeleteModal(dishId, dishName) {
    dishToDelete = dishId;
    document.getElementById('delete-dish-name').textContent = dishName;
    document.getElementById('delete-modal').style.display = 'block';
}

function closeDeleteModal() {
    document.getElementById('delete-modal').style.display = 'none';
    dishToDelete = null;
}

async function confirmDelete() {
    if (!dishToDelete) return;

    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/dishes/${dishToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete dish');
        }

        showNotification('Dish deleted successfully!', 'success');
        closeDeleteModal();
        await loadChefDishes();

    } catch (error) {
        console.error('Error deleting dish:', error);
        showNotification('Failed to delete dish', 'error');
    }
}

function filterDishes() {
    const searchTerm = document.getElementById('dishes-search').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const availability = document.getElementById('availability-filter').value;

    let filtered = allDishes.filter(dish => {
        const matchesSearch = !searchTerm || 
            dish.name.toLowerCase().includes(searchTerm) ||
            dish.description.toLowerCase().includes(searchTerm) ||
            (dish.ingredients && dish.ingredients.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !category || dish.category === category;
        const matchesAvailability = !availability || 
            (availability === 'available' && dish.isAvailable !== false) ||
            (availability === 'unavailable' && dish.isAvailable === false);

        return matchesSearch && matchesCategory && matchesAvailability;
    });

    renderDishes(filtered);
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;

    // Get unique categories from dishes
    const categories = [...new Set(allDishes.map(dish => dish.category).filter(Boolean))];
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function updateStatistics() {
    const total = allDishes.length;
    const available = allDishes.filter(d => d.isAvailable !== false).length;
    const categories = new Set(allDishes.map(d => d.category).filter(Boolean)).size;

    document.getElementById('total-dishes').textContent = total;
    document.getElementById('available-dishes').textContent = available;
    document.getElementById('categories-count').textContent = categories;
}

function handleImagePreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('image-preview');
    
    if (!file || !preview) return;

    if (!file.type.startsWith('image/')) {
        showNotification('Please select an image file', 'error');
        event.target.value = '';
        return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
        showNotification('Image size should be less than 2MB', 'error');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `
            <div class="preview-image">
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-image" onclick="removeImagePreview()">×</button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function removeImagePreview() {
    const preview = document.getElementById('image-preview');
    const fileInput = document.getElementById('image');
    
    if (preview) preview.innerHTML = '';
    if (fileInput) fileInput.value = '';
}

function showLoading() {
    document.getElementById('loading-state').style.display = 'flex';
    document.getElementById('dishes-list').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
}

function showEmptyState() {
    document.getElementById('dishes-list').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('loading-state').style.display = 'none';
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount || 0);
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize delete confirmation
document.addEventListener('DOMContentLoaded', () => {
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDelete);
    }
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('delete-modal');
    if (event.target === modal) {
        closeDeleteModal();
    }
};