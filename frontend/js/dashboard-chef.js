// Chef dashboard logic
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardData();
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
                    ${order.User ? `<p>Customer: ${order.User.name}</p>` : ''}
                </div>
                <span class="order-status ${statusClass}">${order.status}</span>
            </div>
            <div class="order-details">
                <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
                <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
            </div>
            <div class="order-actions">
                <select id="status-${order.id}" onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                </select>
            </div>
        </div>
    `;
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

