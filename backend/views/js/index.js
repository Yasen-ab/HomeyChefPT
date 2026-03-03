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
        
        // Display top-rated 6 dishes
        const popularDishes = [...dishes]
            .sort((a, b) => {
                const ratingDiff = (b.averageRating ?? 0) - (a.averageRating ?? 0);
                if (ratingDiff !== 0) return ratingDiff;
                return (b.reviewCount ?? b.reviews?.length ?? 0) - (a.reviewCount ?? a.reviews?.length ?? 0);
            })
            .slice(0, 6);
        
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
    <div class="dish-image-container">
        <img src="${imageUrl}" alt="${dish.name}" class="dish-image" loading="lazy">
        <div class="dish-badge">? Top Rated</div>
    </div>
    <div class="dish-content">
        <div class="dish-header">
            <h3 class="dish-title">${dish.name}</h3>
            <span class="dish-price">$${parseFloat(dish.price).toFixed(2)}</span>
        </div>
        <p class="dish-description">${dish.description.substring(0, 80)}...</p>
        <div class="dish-meta">
            <span class="dish-category">
                <i class="fas fa-tag"></i> ${dish.category}
            </span>
            <span class="dish-rating">
                <i class="fas fa-star"></i> ${(dish.averageRating ?? 0).toFixed(1)} (${dish.reviewCount ?? dish.reviews?.length ?? 0})
            </span>
            <span class="dish-time">
                <i class="fas fa-clock"></i> ${dish.prepTime || '30'} min
            </span>
        </div>
        <div class="dish-actions">
            <a href="menu.html?dish=${dish.id}" class="btn btn-primary btn-order">
                <i class="fas fa-eye"></i> View Details
            </a>
            <button class="btn-icon btn-favorite" aria-label="Add to favorites">
                <i class="far fa-heart"></i>
            </button>
        </div>
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



