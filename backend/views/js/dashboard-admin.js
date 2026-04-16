// Admin dashboard logic
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadDashboardStats();
    initLogoutButton();
});

// Check authentication
function checkAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    const user = getUserData();
    if (user?.role !== 'admin') {
        redirectToDashboard();
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        // Load users
        const users = await apiRequest('/users');
        document.getElementById('total-users').textContent = users.length;
        
        // Load chefs
        const chefsResponse = await apiRequest('/admin/chefs?page=1&limit=1');
        document.getElementById('total-chefs').textContent = chefsResponse.totalCount || 0;
        
        // Load dishes
        const dishes = await apiRequest('/dishes');
        document.getElementById('total-dishes').textContent = dishes.length;
        
        // Load orders
        const orders = await apiRequest('/orders');
        document.getElementById('total-orders').textContent = orders.length;
        
        // Calculate revenue
        const revenue = orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
        document.getElementById('total-revenue').textContent = formatCurrency(revenue);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

