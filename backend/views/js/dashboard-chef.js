// Chef dashboard logic
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardData();
    loadChefProfile();
    initProfileUpdate();
    initLogoutButton();
});

// Check authentication
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = getUserData();
    if (user?.role !== 'chef') {
        redirectToDashboard();
    }
}

function resolveImageUrl(path) {
    if (!path || path === 'default-chef.jpg') return 'https://via.placeholder.com/160?text=Chef';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${path}`;
    return `${API_URL.replace('/api', '')}/uploads/${path}`;
}

// Load dashboard data
async function loadDashboardData() {
    const user = getUserData();
    
    try {
        // Load dishes
        const dishes = await apiRequest(`/chefs/${user.id}/dishes`);
        document.getElementById('total-dishes').textContent = dishes.length;
        
        // Load orders
        const orders = await apiRequest(`/chefs/${user.id}/orders`);
        document.getElementById('total-orders').textContent = orders.length;
        
        // Calculate revenue
        const revenue = orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
        document.getElementById('total-revenue').textContent = formatCurrency(revenue);
        
        // Count pending orders
        const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
        document.getElementById('pending-orders').textContent = pendingOrders;
        
        // Display recent orders
        const recentOrders = orders.slice(0, 5);
        displayRecentOrders(recentOrders);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load chef profile
async function loadChefProfile() {
    try {
        const result = await apiRequest('/chefs/profile');
        const chef = result.chef || result;

        document.getElementById('profile-fullname').value = chef.name || '';
        document.getElementById('profile-email').value = chef.email || '';
        document.getElementById('profile-phone').value = chef.phone || '';
        document.getElementById('profile-bio').value = chef.bio || '';

        const avatar = document.getElementById('chef-profile-image');
        avatar.src = resolveImageUrl(chef.profileImage);
    } catch (error) {
        console.error('Error loading chef profile:', error);
        showNotification(error.message || 'Failed to load profile', 'error');
    }
}

// Display recent orders
function displayRecentOrders(orders) {
    const container = document.getElementById('recent-orders-container');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p>No orders yet</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => createOrderCard(order)).join('');
}

// Create order card HTML
function createOrderCard(order) {
    const statusClass = `status-${order.status}`;
    
   const isFinalStatus = ['delivered', 'cancelled'].includes(order.status);

return `
    <div class="order-card" data-order-id="${order.id}">
        <div class="order-header">
            <div class="order-info">
                <h3>Order #${order.orderNumber}</h3>
                <p class="order-date">${formatDate(order.createdAt)}</p>
                ${order.User ? `<p class="order-customer">Customer: ${order.User.name}</p>` : ''}
            </div>

            <span class="order-status ${statusClass}" aria-label="Order status">
                ${order.status}
            </span>
        </div>

        <div class="order-details">
            <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
            <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
        </div>

        <div class="order-actions">
            <select 
                id="status-${order.id}"
                aria-label="Update order status"
                ${isFinalStatus ? 'disabled' : ''}
                onchange="updateOrderStatus(${order.id}, this.value)"
            >
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                <option value="on_the_way" ${order.status === 'on_the_way' ? 'selected' : ''}>On the way</option>
                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>

            ${
                isFinalStatus
                    ? `<p class="order-locked">This order is finalized and cannot be updated.</p>`
                    : ''
            }
        </div>
    </div>
`;

}

// Initialize profile update
function initProfileUpdate() {
    const updateBtn = document.getElementById('update-chef-profile-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', handleProfileUpdate);
    }

    const imageInput = document.getElementById('profile-image');
    if (imageInput) {
        imageInput.addEventListener('change', () => {
            const file = imageInput.files && imageInput.files[0];
            if (!file) return;
            const preview = document.getElementById('chef-profile-image');
            preview.src = URL.createObjectURL(file);
        });
    }
}

// Handle profile update
async function handleProfileUpdate() {
    const fullName = document.getElementById('profile-fullname').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const bio = document.getElementById('profile-bio').value.trim();
    const imageInput = document.getElementById('profile-image');
    const file = imageInput?.files?.[0];

    if (!fullName) {
        showNotification('Full name is required', 'error');
        return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('Valid email is required', 'error');
        return;
    }

    if (file) {
        const isImage = file.type.startsWith('image/');
        const maxSize = 5 * 1024 * 1024;
        if (!isImage) {
            showNotification('Profile image must be an image file', 'error');
            return;
        }
        if (file.size > maxSize) {
            showNotification('Image must be 5MB or smaller', 'error');
            return;
        }
    }

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('bio', bio);
    if (file) {
        formData.append('profileImage', file);
    }

    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/chefs/profile`, {
            method: 'PUT',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to update profile');
        }

        showNotification('Profile updated successfully!');

        if (data.chef?.profileImage) {
            document.getElementById('chef-profile-image').src = resolveImageUrl(data.chef.profileImage);
        }

        const user = getUserData();
        if (user) {
            setUserData({ ...user, name: data.chef?.name || fullName, email: data.chef?.email || email });
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        await apiRequest(`/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        showNotification('Order status updated!');
        
        // Reload orders
        loadDashboardData();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

