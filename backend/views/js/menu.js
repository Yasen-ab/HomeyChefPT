// // Menu page logic
// document.addEventListener('DOMContentLoaded', () => {
//     loadDishes();
//     initFilters();
//     initLogoutButton();
// });

// let allDishes = [];

// // Load all dishes
// async function loadDishes() {
//     try {
//         const dishes = await apiRequest('/dishes');
//         allDishes = dishes;
//         displayDishes(dishes);
//     } catch (error) {
//         console.error('Error loading dishes:', error);
//     }
// }

// // Display dishes
// function displayDishes(dishes) {
//     const container = document.getElementById('dishes-container');
//     if (!container) return;
    
//     if (dishes.length === 0) {
//         container.innerHTML = '<p class="text-center">No dishes found</p>';
//         return;
//     }
    
//     container.innerHTML = dishes.map(dish => createDishCard(dish)).join('');
// }

// // Create dish card HTML
// function createDishCard(dish) {
//     const imageUrl = dish.image
//         ? (dish.image.startsWith('/uploads') ? `${API_URL.replace('/api','')}${dish.image}` : dish.image)
//         : 'https://via.placeholder.com/300';
//     return `
//         <div class="dish-card">
//             <img src="${imageUrl}" alt="${dish.name}" class="dish-image">
//             <div class="dish-content">
//                 <div class="dish-header">
//                     <h3 class="dish-title">${dish.name}</h3>
//                     <span class="dish-price">$${parseFloat(dish.price).toFixed(2)}</span>
//                 </div>
//                 <p class="dish-description">${dish.description}</p>
//                 <div class="dish-meta">
//                     <span>${dish.category}</span>
//                     <span>${dish.Chef ? `👨‍🍳 ${dish.Chef.name}` : 'Chef'}</span>
//                 </div>
//                 <div class="dish-meta">
//                     <span>⏱️ ${dish.preparationTime || 30} min</span>
//                     <span>⭐ 4.5</span>
//                 </div>
//                 ${isAuthenticated() && isUser() ? `<button class="btn btn-primary btn-order" onclick="orderNow(${dish.id}, '${dish.name.replace(/'/g, "&#39;")}', ${dish.price})">Order Now</button>` : ''}
//             </div>
//         </div>
//     `;
// }

// // Initialize filters
// function initFilters() {
//     const searchInput = document.getElementById('search-input');
//     const categoryFilter = document.getElementById('category-filter');
//     const maxPriceFilter = document.getElementById('max-price');
    
//     if (searchInput) {
//         searchInput.addEventListener('input', filterDishes);
//     }
    
//     if (categoryFilter) {
//         categoryFilter.addEventListener('change', filterDishes);
//     }
    
//     if (maxPriceFilter) {
//         maxPriceFilter.addEventListener('input', filterDishes);
//     }
// }

// // Filter dishes
// function filterDishes() {
//     const searchTerm = document.getElementById('search-input').value.toLowerCase();
//     const category = document.getElementById('category-filter').value;
//     const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
    
//     let filtered = allDishes.filter(dish => {
//         const matchesSearch = !searchTerm || 
//             dish.name.toLowerCase().includes(searchTerm) ||
//             dish.description.toLowerCase().includes(searchTerm) ||
//             (dish.ingredients && dish.ingredients.toLowerCase().includes(searchTerm));
        
//         const matchesCategory = !category || dish.category === category;
//         const matchesPrice = parseFloat(dish.price) <= maxPrice;
        
//         return matchesSearch && matchesCategory && matchesPrice;
//     });
    
//     displayDishes(filtered);
// }

// // Add to cart (placeholder)
// async function orderNow(dishId, dishName, price) {
//     try {
//         if (!isAuthenticated()) {
//             window.location.href = 'login.html';
//             return;
//         }
//         if (!isUser()) {
//             showNotification('Only users can place orders.', 'error');
//             return;
//         }

//         const deliveryAddress = prompt(`Enter delivery address for ${dishName}:`);
//         if (!deliveryAddress) return;

//         const token = getAuthToken();
//         const response = await fetch(`${API_URL}/orders`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${token}`
//             },
//             body: JSON.stringify({
//                 items: [{ dishId, quantity: 1 }],
//                 deliveryAddress
//             })
//         });
//         const data = await response.json();
//         if (!response.ok) throw new Error(data.error || 'Failed to place order');

//         showNotification('Order placed successfully!');
//     } catch (e) {
//         showNotification(e.message, 'error');
//     }
// }

// Menu page logic with rating system
document.addEventListener('DOMContentLoaded', () => {
    loadDishes();
    initFilters();
    initLogoutButton();
    setupRatingModal();
});

let allDishes = [];
let filteredDishes = [];
let currentDishForRating = null;
const dishesPerPage = 12;
let currentPage = 1;
let hasMoreDishes = false;

// Load all dishes
async function loadDishes() {
    showLoading();
    try {
        const dishes = await apiRequest('/dishes'); // بدل ratings
        allDishes = dishes;
        filteredDishes = [...dishes];
        displayDishes();
        populateChefFilter();
        updateResultsCount();
        hideLoading();
    } catch (error) {
        console.error('Error loading dishes:', error);
        showEmptyState();
        hideLoading();
    }
}
// Display dishes with pagination
function displayDishes() {
    const container = document.getElementById('dishes-container');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    if (!container) return;
    
    // Calculate dishes to show
    const startIndex = 0;
    const endIndex = currentPage * dishesPerPage;
    const dishesToShow = filteredDishes.slice(startIndex, endIndex);
    
    if (dishesToShow.length === 0) {
        showEmptyState();
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    container.innerHTML = dishesToShow.map(dish => createDishCard(dish)).join('');
    
    // Show/hide load more button
    hasMoreDishes = endIndex < filteredDishes.length;
    loadMoreContainer.style.display = hasMoreDishes ? 'block' : 'none';
    
    // Show container
    container.style.display = 'grid';
    document.getElementById('empty-state').style.display = 'none';
}

// Create dish card HTML with ratings
function createDishCard(dish) {
    const imageUrl = dish.imageUrl || 
                    (dish.image && dish.image.startsWith('/uploads') ? 
                     `${API_URL.replace('/api','')}${dish.image}` : 
                     dish.image) || 
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop';
    
    const averageRating = dish.averageRating ?? calculateAverageRating(dish);
    const ratingCount = dish.reviewCount ?? (dish.reviews ? dish.reviews.length : 0);
    const userRating = getUserRating(dish);
    
    return `
        <div class="dish-card" data-dish-id="${dish.id}">
            <div class="dish-image-container">
                <img src="${imageUrl}" alt="${dish.name}" class="dish-image" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'">
                ${!dish.isAvailable ? '<div class="unavailable-badge">Unavailable</div>' : ''}
                ${dish.isAvailable && isAuthenticated() && isUser() ? `
                    <button class="wishlist-btn" onclick="toggleWishlist(${dish.id})" title="Add to Wishlist">❤️</button>
                ` : ''}
            </div>
            <div class="dish-content">
                <div class="dish-header">
                    <h3 class="dish-title">${dish.name}</h3>
                    <span class="dish-price">$${parseFloat(dish.price).toFixed(2)}</span>
                </div>
                
                <p class="dish-description">${dish.description || 'No description available.'}</p>
                
                <div class="dish-meta">
                    <span class="category-tag">${dish.category || 'Uncategorized'}</span>
                    <span class="chef-name">👨‍🍳 ${dish.Chef ? dish.Chef.name : 'Unknown Chef'}</span>
                </div>
                
                <div class="dish-details">
                    <span>⏱️ ${dish.preparationTime || 30} min</span>
                    <span class="calories">🔥 ${dish.calories || '??'} cal</span>
                </div>
                
                <!-- Rating Section -->
                <div class="rating-section">
                    <div class="rating-display">
                        ${averageRating > 0 ? `
                            <div class="stars">
                                ${renderStars(averageRating)}
                                <span class="rating-value">${averageRating.toFixed(1)}</span>
                            </div>
                            <span class="rating-count">(${ratingCount} review${ratingCount !== 1 ? 's' : ''})</span>
                        ` : `
                            <div class="no-ratings">
                                <span class="no-rating-text">No ratings yet</span>
                            </div>
                        `}
                    </div>
                    
                    ${isAuthenticated() && isUser() ? `
                        <div class="rating-actions">
                            ${userRating ? `
                                <button class="btn-rating btn-rated" onclick="openRatingModal(${dish.id})">
                                    ⭐ You rated ${userRating.rating}/5
                                </button>
                            ` : `
                                <button class="btn-rating" onclick="openRatingModal(${dish.id})">
                                    ⭐ Rate This Dish
                                </button>
                            `}
                        </div>
                    ` : ''}
                </div>
                
                ${dish.isAvailable && isAuthenticated() && isUser() ? `
                    <button class="btn btn-primary btn-order" onclick="orderNow(${dish.id}, '${dish.name.replace(/'/g, "&#39;")}', ${dish.price})">
                        🛒 Order Now
                    </button>
                ` : !dish.isAvailable ? `
                    <button class="btn btn-disabled" disabled>Currently Unavailable</button>
                ` : !isAuthenticated() ? `
                    <button class="btn btn-primary" onclick="window.location.href='login.html'">
                        Login to Order
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Calculate average rating
function calculateAverageRating(dish) {
    if (typeof dish.averageRating === 'number') return dish.averageRating;
    if (!dish.reviews || dish.reviews.length === 0) return 0;

    const sum = dish.reviews.reduce((total, review) => total + review.rating, 0);
    return sum / dish.reviews.length;
}



// Get user's rating for a dish
function getUserRating(dish) {
    if (!isAuthenticated() || !dish.reviews) return null;

    const userId = getCurrentUser().id;
    return dish.reviews.find(review => review.userId === userId);
}


// Render star rating display
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '★';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '½';
        } else {
            stars += '☆';
        }
    }
    return stars;
}

// Initialize filters
function initFilters() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const chefFilter = document.getElementById('chef-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const maxPriceFilter = document.getElementById('max-price');
    const sortOptions = document.getElementById('sort-options');
    
    // Search with debounce
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                filterDishes();
            }, 500);
        });
    }
    
    // Other filters
    [categoryFilter, chefFilter, ratingFilter, sortOptions].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                currentPage = 1;
                filterDishes();
            });
        }
    });
    
    if (maxPriceFilter) {
        maxPriceFilter.addEventListener('input', () => {
            currentPage = 1;
            filterDishes();
        });
    }
}

// Populate chef filter
function populateChefFilter() {
    const chefFilter = document.getElementById('chef-filter');
    if (!chefFilter) return;
    
    const chefs = [...new Set(allDishes.map(dish => dish.Chef ? dish.Chef.name : '').filter(name => name))];
    
    chefs.forEach(chefName => {
        const option = document.createElement('option');
        option.value = chefName;
        option.textContent = chefName;
        chefFilter.appendChild(option);
    });
}

// Filter dishes
function filterDishes() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const category = document.getElementById('category-filter').value;
    const chef = document.getElementById('chef-filter').value;
    const minRating = parseFloat(document.getElementById('rating-filter').value) || 0;
    const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
    const sortBy = document.getElementById('sort-options').value;
    
    let filtered = allDishes.filter(dish => {
        const matchesSearch = !searchTerm || 
            dish.name.toLowerCase().includes(searchTerm) ||
            dish.description.toLowerCase().includes(searchTerm) ||
            (dish.ingredients && dish.ingredients.toLowerCase().includes(searchTerm)) ||
            (dish.Chef && dish.Chef.name.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !category || dish.category === category;
        const matchesChef = !chef || (dish.Chef && dish.Chef.name === chef);
        const matchesRating = calculateAverageRating(dish) >= minRating;
        const matchesPrice = parseFloat(dish.price) <= maxPrice;
        
        return matchesSearch && matchesCategory && matchesChef && matchesRating && matchesPrice;
    });
    
    // Sort dishes
    filtered = sortDishes(filtered, sortBy);
    filteredDishes = filtered;
    
    displayDishes();
    updateResultsCount();
}

// Sort dishes
function sortDishes(dishes, sortBy) {
    switch(sortBy) {
        case 'rating':
            return dishes.sort((a, b) => calculateAverageRating(b) - calculateAverageRating(a));
        case 'price-low':
            return dishes.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        case 'price-high':
            return dishes.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        case 'newest':
            return dishes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'popular':
        default:
            return dishes.sort((a, b) => (b.reviews?.length || 0) - (a.reviews?.length || 0));
    }
}

// Update results count
function updateResultsCount() {
    const countElement = document.getElementById('results-count');
    if (countElement) {
        const showing = Math.min(currentPage * dishesPerPage, filteredDishes.length);
        countElement.textContent = `Showing ${showing} of ${filteredDishes.length} dishes`;
    }
}

// Load more dishes
function loadMoreDishes() {
    if (hasMoreDishes) {
        currentPage++;
        displayDishes();
        updateResultsCount();
    }
}

// Clear all filters
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('chef-filter').value = '';
    document.getElementById('rating-filter').value = '';
    document.getElementById('max-price').value = '';
    document.getElementById('sort-options').value = 'popular';
    
    currentPage = 1;
    filterDishes();
}

// Setup rating modal
function setupRatingModal() {
    const stars = document.querySelectorAll('#stars-container .star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            previewStars(rating);
        });
    });
    
    document.getElementById('stars-container').addEventListener('mouseleave', function() {
        const currentRating = parseInt(this.getAttribute('data-current-rating')) || 0;
        highlightStars(currentRating);
    });
}

// Open rating modal
function openRatingModal(dishId) {
    const dish = allDishes.find(d => d.id === dishId);
    if (!dish) return;
    
    currentDishForRating = dish;
    const userRating = getUserRating(dish);
    
    // Set dish info
    document.getElementById('rating-dish-name').textContent = dish.name;
    document.getElementById('rating-dish-chef').textContent = `by ${dish.Chef ? dish.Chef.name : 'Unknown Chef'}`;
    
    const imageUrl = dish.imageUrl || 
                    (dish.image && dish.image.startsWith('/uploads') ? 
                     `${API_URL.replace('/api','')}${dish.image}` : 
                     dish.image) || 
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop';
    
    document.getElementById('rating-dish-image').src = imageUrl;
    
    // Set current rating if exists
    if (userRating) {
        highlightStars(userRating.rating);
        document.getElementById('review-comment').value = userRating.comment || '';
    } else {
        highlightStars(0);
        document.getElementById('review-comment').value = '';
    }
    
    document.getElementById('rating-error').style.display = 'none';
    document.getElementById('rating-modal').style.display = 'block';
}

// Close rating modal
function closeRatingModal() {
    document.getElementById('rating-modal').style.display = 'none';
    currentDishForRating = null;
}

// Highlight stars based on rating
function highlightStars(rating) {
    const stars = document.querySelectorAll('#stars-container .star');
    const ratingText = document.getElementById('rating-text');
    
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.textContent = '★';
            star.style.color = '#ffc107';
        } else {
            star.textContent = '☆';
            star.style.color = '#ccc';
        }
    });
    
    document.getElementById('stars-container').setAttribute('data-current-rating', rating);
    
    // Update rating text
    const ratings = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent'
    };
    ratingText.textContent = rating > 0 ? `${ratings[rating]} (${rating}/5)` : 'Select a rating';
}

// Preview stars on hover
function previewStars(rating) {
    const currentRating = parseInt(document.getElementById('stars-container').getAttribute('data-current-rating')) || 0;
    const stars = document.querySelectorAll('#stars-container .star');
    
    stars.forEach(star => {
        const starRating = parseInt(star.getAttribute('data-rating'));
        if (starRating <= rating) {
            star.style.color = '#ffc107';
        } else {
            star.style.color = '#ccc';
        }
    });
}

// Submit rating
async function submitRating() {
    const rating = parseInt(document.getElementById('stars-container').getAttribute('data-current-rating'));
    const comment = document.getElementById('review-comment').value.trim();
    const errorDiv = document.getElementById('rating-error');
    
    if (!rating) {
        errorDiv.textContent = 'Please select a rating';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/dishes/${currentDishForRating.id}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating: rating,
                comment: comment
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit rating');
        }
        
        showNotification('Rating submitted successfully!', 'success');
        closeRatingModal();
        
        // Reload dishes to update ratings
        await loadDishes();
        
    } catch (error) {
        console.error('Error submitting rating:', error);
        errorDiv.textContent = error.message || 'Failed to submit rating';
        errorDiv.style.display = 'block';
    }
}

// Toggle wishlist (placeholder)
function toggleWishlist(dishId) {
    showNotification('Added to wishlist!', 'success');
}

// Show loading state
function showLoading() {
    document.getElementById('loading-state').style.display = 'flex';
    document.getElementById('dishes-container').style.display = 'none';
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('load-more-container').style.display = 'none';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loading-state').style.display = 'none';
}

// Show empty state
function showEmptyState() {
    document.getElementById('dishes-container').style.display = 'none';
    document.getElementById('empty-state').style.display = 'flex';
    document.getElementById('load-more-container').style.display = 'none';
}

// Order now function (existing)
async function orderNow(dishId, dishName, price) {
    try {
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        if (!isUser()) {
            showNotification('Only users can place orders.', 'error');
            return;
        }

        const deliveryAddress = prompt(`Enter delivery address for ${dishName}:`);
        if (!deliveryAddress) return;

        const token = getAuthToken();
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                items: [{ dishId, quantity: 1 }],
                deliveryAddress
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to place order');

        showNotification('Order placed successfully!');
    } catch (e) {
        showNotification(e.message, 'error');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('rating-modal');
    if (event.target === modal) {
        closeRatingModal();
    }
}