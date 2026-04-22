// =========================
// Orders Page Logic
// =========================

let allOrders = [];
let filteredOrders = [];
let currentStatus = 'all';
let currentSearch = '';
let currentSort = 'newest';
let pendingCancelOrderId = null;

function canUserCancelOrder(order) {
    const user = getUserData();
    if (!user || user.role !== 'user') return false;
    return order && ['pending', 'confirmed'].includes(order.status);
}

function canChefUpdateOrders() {
    const user = getUserData();
    return user?.role === 'chef';
}

function resolveImageUrl(path) {
    if (!path) return 'https://via.placeholder.com/240x160?text=Dish';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${path}`;
    return `${API_URL.replace('/api', '')}/uploads/${path}`;
}

function normalizeOrder(order) {
    const items = order.OrderItems || order.orderItems || [];
    const dishNames = items
        .map(item => item.Dish?.name)
        .filter(Boolean);
    const dishImage = items.find(item => item.Dish?.image)?.Dish?.image || null;
    return {
        ...order,
        dishName: order.dishName || dishNames.join(', '),
        dishImage: order.dishImage || dishImage
    };
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadOrders();
    initFilters();
    initCancelModal();
    initLogoutButton();
});

// =========================
// Auth Check
// =========================
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
    }
}

// =========================
// Load Orders
// =========================
async function loadOrders() {
    try {
        toggleLoading(true);

        const response = await apiRequest('/orders');
        allOrders = (response || []).map(normalizeOrder);
        filteredOrders = [...allOrders];

        updateStats(allOrders);
        applyFilters();

    } catch (error) {
        console.error('Error loading orders:', error);
    } finally {
        toggleLoading(false);
    }
}

// =========================
// Stats
// =========================
function updateStats(orders) {
    const s = status => (status || '').toLowerCase().trim();

    const pending = orders.filter(o => s(o.status) === 'pending').length;
    const completed = orders.filter(o => s(o.status) === 'delivered').length;
    const delivery = orders.filter(o => s(o.status) === 'ready').length;
    const totalSpent = orders
        .filter(o => s(o.status) === 'delivered')
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    document.getElementById('pending-count').textContent   = pending;
    document.getElementById('completed-count').textContent = completed;
    document.getElementById('delivery-count').textContent  = delivery;
    document.getElementById('total-spent').textContent     = formatCurrency(totalSpent);
}
// =========================
// Filters / Search / Sort
// =========================
function applyFilters() {
    filteredOrders = [...allOrders];

    // Status
    if (currentStatus !== 'all') {
        filteredOrders = filteredOrders.filter(o => o.status === currentStatus);
    }

    // Search
    if (currentSearch) {
        filteredOrders = filteredOrders.filter(o =>
            o.orderNumber.toString().includes(currentSearch) ||
            o.deliveryAddress?.toLowerCase().includes(currentSearch) ||
            o.dishName?.toLowerCase().includes(currentSearch) ||
            o.Chef?.name?.toLowerCase().includes(currentSearch)
        );
    }

    // Sort
    switch (currentSort) {
        case 'oldest':
            filteredOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            break;
        case 'price-high':
            filteredOrders.sort((a, b) => b.totalAmount - a.totalAmount);
            break;
        case 'price-low':
            filteredOrders.sort((a, b) => a.totalAmount - b.totalAmount);
            break;
        default:
            filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    renderOrders(filteredOrders);
}

// =========================
// Render Orders
// =========================
function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    const empty = document.getElementById('empty-orders');

    if (!orders.length) {
        container.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    container.innerHTML = orders.map(createOrderCard).join('');
}

// =========================
// Order Card
// =========================
function createOrderCard(order) {
    const canUpdate = canChefUpdateOrders();
    const canCancel = canUserCancelOrder(order);
    const isFinalStatus = ['delivered', 'cancelled'].includes(order.status);
    const statusSelect = canUpdate
        ? `
            <div class="order-status-update">
                <label for="status-${order.id}">Status</label>
                <select
                    id="status-${order.id}"
                    ${isFinalStatus ? 'disabled' : ''}
                    onchange="updateOrderStatus(${order.id}, this.value)"
                >
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                ${isFinalStatus ? '<small class="order-locked">Finalized</small>' : ''}
            </div>
        `
        : '';

    const cancelButton = canCancel
        ? `<button class="btn btn-sm btn-danger" onclick="openCancelModal(${order.id})">Cancel Order</button>`
        : '';

    return `
    <div class="card order-card">
        <div class="card-header">
            <strong>Order #${order.orderNumber}</strong>
            <span class="status-badge status-${order.status}">
                ${order.status}
            </span>
        </div>

        <div class="card-body">
            <p><strong>Dish:</strong> ${order.dishName || '�'}</p>
            <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
            <p><strong>Address:</strong> ${order.deliveryAddress}</p>
            <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>

            <button class="btn btn-sm btn-primary"
                onclick="openOrderModal(${order.id})">
                View Details
            </button>
            ${cancelButton}
            ${statusSelect}
        </div>
    </div>
    `;
}

// =========================
// Modal
// =========================
function openOrderModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('order-details-content').innerHTML = `
        <div class='order-details-media'>
            <img class='order-dish-image' src='${resolveImageUrl(order.dishImage)}' alt='${order.dishName || 'Dish'}'>
            <div class='order-details-text'>
                <p><strong>Order #:</strong> ${order.orderNumber}</p>
                <p><strong>Dish:</strong> ${order.dishName || '�'}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
                <p><strong>Address:</strong> ${order.deliveryAddress}</p>
                <p><strong>Notes:</strong> ${order.notes || '�'}</p>
            </div>
        </div>
    `;

    document.getElementById('order-details-modal').style.display = 'flex';
}

function closeOrderModal() {
    document.getElementById('order-details-modal').style.display = 'none';
}

// Update order status (Chef only)
async function updateOrderStatus(orderId, status) {
    try {
        await apiRequest(`/orders/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        showNotification('Order status updated!');
        loadOrders();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function initCancelModal() {
    const confirmBtn = document.getElementById('confirm-cancel-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmCancelOrder);
    }
}

function openCancelModal(orderId) {
    pendingCancelOrderId = orderId;
    const modal = document.getElementById('cancel-order-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeCancelModal() {
    pendingCancelOrderId = null;
    const modal = document.getElementById('cancel-order-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function confirmCancelOrder() {
    if (!pendingCancelOrderId) return;

    try {
        await apiRequest(`/orders/${pendingCancelOrderId}/cancel`, {
            method: 'PUT'
        });

        const order = allOrders.find(o => o.id === pendingCancelOrderId);
        if (order) {
            order.status = 'cancelled';
        }

        updateStats(allOrders);
        applyFilters();
        closeCancelModal();
        showNotification('Order cancelled successfully');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// =========================
// UI Helpers
// =========================
function toggleLoading(show) {
    const loader = document.getElementById('loading-orders');
    if (loader) loader.style.display = show ? 'block' : 'none';
}

// =========================
// Init Controls
// =========================
function initFilters() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.tab-btn.active')?.classList.remove('active');
            btn.classList.add('active');

            currentStatus = btn.dataset.tab;
            applyFilters();
        });
    });

    // Search
    document.getElementById('search-orders')
        .addEventListener('input', e => {
            currentSearch = e.target.value.toLowerCase();
            applyFilters();
        });

    // Sort
    document.getElementById('sort-orders')
        .addEventListener('change', e => {
            currentSort = e.target.value;
            applyFilters();
        });
}

// =========================
// Logout
// =========================
function initLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', () => {
        logout();
        window.location.href = 'login.html';
    });
}

