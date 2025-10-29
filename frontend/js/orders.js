// Orders page logic
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadOrders();
    initLogoutButton();
});

// Check authentication
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// Load orders
async function loadOrders() {
    try {
        const orders = await apiRequest('/orders');
        displayOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Display orders
function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-center">No orders found</p>';
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
                <p><strong>Delivery Address:</strong> ${order.deliveryAddress}</p>
                ${order.deliveryDate ? `<p><strong>Delivery Date:</strong> ${formatDate(order.deliveryDate)}</p>` : ''}
                ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
            </div>
        </div>
    `;
}

