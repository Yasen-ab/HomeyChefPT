// Menu page logic
document.addEventListener('DOMContentLoaded', () => {
    loadDishes();
    initFilters();
    initLogoutButton();
});

let allDishes = [];

// Load all dishes
async function loadDishes() {
    try {
        const dishes = await apiRequest('/dishes');
        allDishes = dishes;
        displayDishes(dishes);
    } catch (error) {
        console.error('Error loading dishes:', error);
    }
}

// Display dishes
function displayDishes(dishes) {
    const container = document.getElementById('dishes-container');
    if (!container) return;
    
    if (dishes.length === 0) {
        container.innerHTML = '<p class="text-center">No dishes found</p>';
        return;
    }
    
    container.innerHTML = dishes.map(dish => createDishCard(dish)).join('');
}

// Create dish card HTML
function createDishCard(dish) {
    return `
        <div class="dish-card">
            <img src="${dish.image || 'https://via.placeholder.com/300'}" alt="${dish.name}" class="dish-image">
            <div class="dish-content">
                <div class="dish-header">
                    <h3 class="dish-title">${dish.name}</h3>
                    <span class="dish-price">$${parseFloat(dish.price).toFixed(2)}</span>
                </div>
                <p class="dish-description">${dish.description}</p>
                <div class="dish-meta">
                    <span>${dish.category}</span>
                    <span>${dish.Chef ? `👨‍🍳 ${dish.Chef.name}` : 'Chef'}</span>
                </div>
                <div class="dish-meta">
                    <span>⏱️ ${dish.preparationTime || 30} min</span>
                    <span>⭐ 4.5</span>
                </div>
                ${isAuthenticated() && isUser() ? `<button class="btn btn-primary btn-order" onclick="addToCart(${dish.id}, '${dish.name}', ${dish.price})">Add to Cart</button>` : ''}
            </div>
        </div>
    `;
}

// Initialize filters
function initFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const maxPriceFilter = document.getElementById('max-price');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterDishes);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterDishes);
    }
    
    if (maxPriceFilter) {
        maxPriceFilter.addEventListener('input', filterDishes);
    }
}

// Filter dishes
function filterDishes() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
    
    let filtered = allDishes.filter(dish => {
        const matchesSearch = !searchTerm || 
            dish.name.toLowerCase().includes(searchTerm) ||
            dish.description.toLowerCase().includes(searchTerm) ||
            (dish.ingredients && dish.ingredients.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !category || dish.category === category;
        const matchesPrice = parseFloat(dish.price) <= maxPrice;
        
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    displayDishes(filtered);
}

// Add to cart (placeholder)
function addToCart(dishId, dishName, price) {
    showNotification(`${dishName} added to cart!`);
    // Cart functionality would be implemented here
}

