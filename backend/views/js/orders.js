// =========================
// Orders Page Logic
// =========================

let allOrders = [];
let filteredOrders = [];
let currentStatus = 'all';
let currentSearch = '';
let currentSort = 'newest';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadOrders();
    initFilters();
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

        allOrders = await apiRequest('/orders');
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
    const s = status => (status || '').toLowerCase().trim(); // للتعامل مع أي اختلاف في الكتابة

    // Pending: حالة pending
    const pending = orders.filter(o => s(o.status) === 'pending').length;

    // Completed: حالة delivered (لأن delivered هي اللي تعني مكتمل عندك)
    const completed = orders.filter(o => s(o.status) === 'delivered').length;

    // In Delivery: حالة ready (لأن ready غالبًا تعني جاهز للتوصيل / في الطريق)
    const delivery = orders.filter(o => s(o.status) === 'ready').length;

    // Total Spent: فقط الطلبات المكتملة (delivered)
    const totalSpent = orders
        .filter(o => s(o.status) === 'delivered')
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    // تحديث العدادات في الصفحة
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
            o.deliveryAddress?.toLowerCase().includes(currentSearch)
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
    return `
    <div class="card order-card">
        <div class="card-header">
            <strong>Order #${order.orderNumber}</strong>
            <span class="status-badge status-${order.status}">
                ${order.status}
            </span>
        </div>

        <div class="card-body">
            <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
            <p><strong>Address:</strong> ${order.deliveryAddress}</p>
            <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>

            <button class="btn btn-sm btn-primary"
                onclick="openOrderModal(${order.id})">
                View Details
            </button>
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
        <p><strong>Order #:</strong> ${order.orderNumber}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Total:</strong> ${formatCurrency(order.totalAmount)}</p>
        <p><strong>Address:</strong> ${order.deliveryAddress}</p>
        <p><strong>Notes:</strong> ${order.notes || '—'}</p>
    `;

    document.getElementById('order-details-modal').style.display = 'flex';
}

function closeOrderModal() {
    document.getElementById('order-details-modal').style.display = 'none';
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
