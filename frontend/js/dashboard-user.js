// User dashboard logic
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserData();
    loadOrders();
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
    if (user?.role !== 'user') {
        redirectToDashboard();
    }
}

// Load user data
async function loadUserData() {
    const user = getUserData();
    
    // Display user name
    document.getElementById('user-name').textContent = user?.name || 'User';
    
    // Load full user profile
    try {
        const fullUser = await apiRequest(`/users/${user.id}`);
        
        // Populate profile fields
        document.getElementById('profile-name').value = fullUser.name || '';
        document.getElementById('profile-email').value = fullUser.email || '';
        document.getElementById('profile-phone').value = fullUser.phone || '';
        document.getElementById('profile-address').value = fullUser.address || '';
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load user's orders
async function loadOrders() {
    const user = getUserData();
    
    try {
        const orders = await apiRequest(`/users/${user.id}/orders`);
        
        // Update stats
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const completedOrders = orders.filter(o => o.status === 'delivered').length;
        
        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('pending-orders').textContent = pendingOrders;
        document.getElementById('completed-orders').textContent = completedOrders;
        
        // Display recent orders
        const recentOrders = orders.slice(0, 5);
        displayRecentOrders(recentOrders);
    } catch (error) {
        console.error('Error loading orders:', error);
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
    
    return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-info">
                    <h3>Order #${order.orderNumber}</h3>
                    <p>${formatDate(order.createdAt)}</p>
                </div>
                <span class="order-status ${statusClass}">${order.status}</span>
            </div>
            <div class="order-details">
                <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
                <p><strong>Status:</strong> ${order.status}</p>
            </div>
        </div>
    `;
}

// Initialize profile update
function initProfileUpdate() {
    const updateBtn = document.getElementById('update-profile-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', handleProfileUpdate);
    }
}

// Handle profile update
async function handleProfileUpdate() {
    const user = getUserData();
    
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const address = document.getElementById('profile-address').value;
    
    try {
        await apiRequest(`/users/${user.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name, phone, address })
        });
        
        showNotification('Profile updated successfully!');
        
        // Update localStorage
        const updatedUser = { ...user, name, phone, address };
        setUserData(updatedUser);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

