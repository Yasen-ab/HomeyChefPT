// Home page logic
document.addEventListener('DOMContentLoaded', () => {
    loadPopularDishes();
    initLogoutButton();
    
    // Update navigation based on auth status
    updateNavigation();
});

// Load popular dishes
async function loadPopularDishes() {
    try {
        const dishes = await apiRequest('/dishes');
        
        // Display only first 6 dishes
        const popularDishes = dishes.slice(0, 6);
        
        const container = document.getElementById('popular-dishes-container');
        if (container) {
            container.innerHTML = popularDishes.map(dish => createDishCard(dish)).join('');
        }
    } catch (error) {
        console.error('Error loading dishes:', error);
    }
}

// Create dish card HTML
function createDishCard(dish) {
    const imageUrl = dish.image
        ? (dish.image.startsWith('/uploads') ? `${API_URL.replace('/api','')}${dish.image}` : dish.image)
        : 'https://via.placeholder.com/300';
    return `
        <div class="dish-card">
            <img src="${imageUrl}" alt="${dish.name}" class="dish-image">
            <div class="dish-content">
                <div class="dish-header">
                    <h3 class="dish-title">${dish.name}</h3>
                    <span class="dish-price">$${parseFloat(dish.price).toFixed(2)}</span>
                </div>
                <p class="dish-description">${dish.description.substring(0, 80)}...</p>
                <div class="dish-meta">
                    <span>${dish.category}</span>
                    <span>⭐ ${(dish.averageRating ?? 0).toFixed(1)} (${dish.reviewCount ?? dish.reviews?.length ?? 0})</span>
                </div>
                <a href="menu.html" class="btn btn-primary btn-order">View Details</a>
            </div>
        </div>
    `;
}

// Update navigation based on auth status
function updateNavigation() {
    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;
    
    if (isAuthenticated()) {
        const user = getUserData();
        navAuth.innerHTML = `
            <a href="${getDashboardUrl()}">Dashboard</a>
            <a href="#" id="logout-btn-mobile">Logout</a>
        `;
        
        const logoutBtn = document.getElementById('logout-btn-mobile');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });
        }
    }
}

// Get dashboard URL based on user role
function getDashboardUrl() {
    const user = getUserData();
    if (user?.role === 'admin') return 'dashboard-admin.html';
    if (user?.role === 'chef') return 'dashboard-chef.html';
    return 'dashboard-user.html';
}

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 3D Dish Showcase Functionality
// Masterpiece Hero Section - Advanced Interactions



