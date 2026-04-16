document.addEventListener('DOMContentLoaded', () => {
    loadDishes();
    initFilters();
    initLogoutButton();
    setupRatingModal();
});

let allDishes = [];
let filteredDishes = [];
let currentDishForRating = null;
let favoriteDishIds = new Set();
const dishesPerPage = 12;
let currentPage = 1;
let hasMoreDishes = false;

// Load all dishes
async function loadDishes() {   
    showLoading();
    try {
        if (isAuthenticated() && isUser()) {
            await loadFavorites();
        }
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

async function loadFavorites() {
    try {   
        const result = await apiRequest('/favorites');
        favoriteDishIds = new Set((result.favorites || []).map((fav) => Number(fav.dishId)));
    } catch (error) {
        favoriteDishIds = new Set();
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
    
  setTimeout(() => {
        const cards = container.querySelectorAll('.dish-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }, 100);
}

// Create dish card HTML with ratings
function createDishCard(dish) {
    const imageUrl = dish.imageUrl || 
                    (dish.image && dish.image.startsWith('/uploads') ? 
                     `${API_URL.replace('/api','')}${dish.image}` : 
                     dish.image) || 
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop';
    const chefId = Number(dish.chefId || dish.Chef?.id) || null;
    const chefName = dish.Chef?.name || 'Unknown Chef';
    
    const averageRating = dish.averageRating ?? calculateAverageRating(dish);
    const ratingCount = dish.reviewCount ?? (dish.reviews ? dish.reviews.length : 0);
    const userRating = getUserRating(dish);
    
    return `
        <div class="dish-card" data-dish-id="${dish.id}">
            <div class="dish-image-container">
                <img src="${imageUrl}" alt="${dish.name}" class="dish-image" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop'">
                ${!dish.isAvailable ? '<div class="unavailable-badge">Unavailable</div>' : ''}
                ${dish.isAvailable && isAuthenticated() && isUser() ? `
                    <button class="wishlist-btn ${favoriteDishIds.has(Number(dish.id)) ? 'active' : ''}" onclick="toggleWishlist(${dish.id})" title="Add to Favorites">
                        ${favoriteDishIds.has(Number(dish.id)) ? '❤️' : '🤍'}
                    </button>
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
                    ${chefId
                        ? `<a class="chef-name chef-link" href="chef-profile.html?chefId=${chefId}" title="View ${chefName} profile">👨‍🍳 ${chefName}</a>`
                        : `<span class="chef-name">👨‍🍳 ${chefName}</span>`
                    }
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
                        🛒 Add to Cart
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
            throw new Error('You need to order this dish before rating it.');
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

// Toggle wishlist/favorites with optimistic UI
async function toggleWishlist(dishId) {
    if (!isAuthenticated() || !isUser()) {
        showNotification('Please login as a user first.', 'error');
        return;
    }

    const wasFavorite = favoriteDishIds.has(Number(dishId));
    if (wasFavorite) {
        favoriteDishIds.delete(Number(dishId));
    } else {
        favoriteDishIds.add(Number(dishId));
    }
    displayDishes();

    try {
        if (wasFavorite) {
            await apiRequest(`/favorites/${dishId}`, { method: 'DELETE' });
            showNotification('Removed from favorites', 'success');
        } else {
            await apiRequest('/favorites', {
                method: 'POST',
                body: JSON.stringify({ dishId })
            });
            showNotification('Added to favorites', 'success');
        }
    } catch (error) {
        if (wasFavorite) {
            favoriteDishIds.add(Number(dishId));
        } else {
            favoriteDishIds.delete(Number(dishId));
        }
        displayDishes();
        showNotification(error.message || 'Failed to update favorites', 'error');
    }
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

// Add the selected dish to the cart from the menu page.
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

        await apiRequest('/cart/add', {
            method: 'POST',
            body: JSON.stringify({
                dishId,
                quantity: 1
            })
        });

        showNotification(`${dishName} added to cart`, 'success');
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

// تحديث عرض الفلاتر النشطة
function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('active-filters');
    const summaryContainer = document.getElementById('filters-summary');
    
    if (!activeFiltersContainer) return;
    
    const activeFilters = [];
    
    // جمع الفلاتر النشطة
    const categoryFilter = document.getElementById('category-filter');
    const chefFilter = document.getElementById('chef-filter');
    const ratingFilter = document.getElementById('rating-filter');
    const maxPrice = document.getElementById('max-price');
    const searchInput = document.getElementById('search-input');
    
    if (categoryFilter && categoryFilter.value) {
        activeFilters.push({
            type: 'category',
            value: categoryFilter.value,
            text: categoryFilter.options[categoryFilter.selectedIndex].text
        });
    }
    
    if (chefFilter && chefFilter.value) {
        activeFilters.push({
            type: 'chef',
            value: chefFilter.value,
            text: `Chef: ${chefFilter.options[chefFilter.selectedIndex].text}`
        });
    }
    
    if (ratingFilter && ratingFilter.value) {
        activeFilters.push({
            type: 'rating',
            value: ratingFilter.value,
            text: `Rating: ${ratingFilter.options[ratingFilter.selectedIndex].text}`
        });
    }
    
    if (maxPrice && maxPrice.value) {
        activeFilters.push({
            type: 'price',
            value: maxPrice.value,
            text: `Max Price: $${maxPrice.value}`
        });
    }
    
    if (searchInput && searchInput.value) {
        activeFilters.push({
            type: 'search',
            value: searchInput.value,
            text: `Search: "${searchInput.value}"`
        });
    }
    
    // عرض الفلاتر النشطة
    if (activeFilters.length > 0) {
        activeFiltersContainer.innerHTML = activeFilters.map(filter => `
            <div class="filter-tag" data-type="${filter.type}">
                <span>${filter.text}</span>
                <button class="remove-filter" onclick="removeFilter('${filter.type}')">×</button>
            </div>
        `).join('');
        
        summaryContainer.style.display = 'block';
    } else {
        activeFiltersContainer.innerHTML = `
            <div class="no-filters-message">
                No active filters. Showing all dishes.
            </div>
        `;
    }
}

// دالة إزالة فلتر محدد
function removeFilter(filterType) {
    switch(filterType) {
        case 'category':
            document.getElementById('category-filter').value = '';
            break;
        case 'chef':
            document.getElementById('chef-filter').value = '';
            break;
        case 'rating':
            document.getElementById('rating-filter').value = '';
            break;
        case 'price':
            document.getElementById('max-price').value = '';
            break;
        case 'search':
            document.getElementById('search-input').value = '';
            break;
    }
    
    // تحديث الفلاتر
    updateActiveFiltersDisplay();
    
    // إعادة تحميل الأطباق مع الفلاتر المحدثة
    if (typeof filterDishes === 'function') {
        filterDishes();
    }
}

// دالة لتبديل العرض بين الشبكة والقائمة
function setupViewToggle() {
    const viewToggleBtn = document.getElementById('viewToggle');
    const gridViewIcon = viewToggleBtn.querySelector('.grid-view');
    const listViewIcon = viewToggleBtn.querySelector('.list-view');
    const dishesContainer = document.getElementById('dishes-container');
    
    if (!viewToggleBtn || !dishesContainer) return;
    
    viewToggleBtn.addEventListener('click', function() {
        const isGridView = gridViewIcon.style.display !== 'none';
        
        if (isGridView) {
            // التبديل إلى عرض القائمة
            gridViewIcon.style.display = 'none';
            listViewIcon.style.display = 'inline';
            dishesContainer.classList.add('list-view');
            dishesContainer.classList.remove('grid-view');
            viewToggleBtn.title = 'Switch to Grid View';
        } else {
            // التبديل إلى عرض الشبكة
            gridViewIcon.style.display = 'inline';
            listViewIcon.style.display = 'none';
            dishesContainer.classList.add('grid-view');
            dishesContainer.classList.remove('list-view');
            viewToggleBtn.title = 'Switch to List View';
        }
    });
}

// دالة لتحديث عدد النتائج بشكل متحرك
function animateCountUpdate(newCount) {
    const countElement = document.getElementById('results-count');
    if (!countElement) return;
    
    const currentCount = parseInt(countElement.textContent.match(/\d+/)?.[0]) || 0;
    const targetCount = parseInt(newCount) || 0;
    
    if (currentCount === targetCount) return;
    
    const duration = 1000; // مدة الحركة بالمللي ثانية
    const startTime = Date.now();
    const increment = targetCount > currentCount ? 1 : -1;
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // استخدام دالة توقيعية للحركة
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.round(currentCount + (targetCount - currentCount) * easeOutQuart);
        
        countElement.textContent = `${currentValue} delicious dishes`;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            countElement.textContent = `${targetCount} delicious dishes`;
        }
    }
    
    update();
}

// تهيئة أزرار الإجراءات السريعة
function setupQuickActions() {
    const exportBtn = document.getElementById('exportBtn');
    const shareBtn = document.getElementById('shareBtn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            // محاكاة تصدير النتائج
            showNotification('📤 Exporting menu results...', 'info');
            
            // يمكنك هنا إضافة منطق التصدير الحقيقي
            setTimeout(() => {
                showNotification('✅ Results exported successfully!', 'success');
            }, 1500);
        });
    }
    
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            // مشاركة القائمة
            if (navigator.share) {
                navigator.share({
                    title: 'HomeyChef Menu',
                    text: 'Check out these amazing dishes on HomeyChef!',
                    url: window.location.href
                });
            } else {
                // نسخ الرابط
                navigator.clipboard.writeText(window.location.href);
                showNotification('🔗 Link copied to clipboard!', 'success');
            }
        });
    }
}

// إضافة أنماط CSS لعرض القائمة
const listViewStyles = `
<style>
    .dishes-container.list-view .dishes-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    
    .dishes-container.list-view .dish-card {
        display: grid;
        grid-template-columns: 200px 1fr auto;
        gap: 25px;
        padding: 25px;
    }
    
    .dishes-container.list-view .dish-image-container {
        height: 150px;
        border-radius: 15px;
    }
    
    .dishes-container.list-view .dish-content {
        padding: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .dishes-container.list-view .dish-footer {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 180px;
    }
    
    .dishes-container.list-view .dish-description {
        -webkit-line-clamp: 3;
    }
    
    @media (max-width: 768px) {
        .dishes-container.list-view .dish-card {
            grid-template-columns: 1fr;
            text-align: center;
        }
        
        .dishes-container.list-view .dish-image-container {
            height: 200px;
        }
    }
</style>
`;

document.head.insertAdjacentHTML('beforeend', listViewStyles);

// تهيئة كل شيء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    updateActiveFiltersDisplay();
    setupViewToggle();
    setupQuickActions();
    
    // تحديث الفلاتر عند التغيير
    const filterElements = [
        'category-filter',
        'chef-filter',
        'rating-filter',
        'max-price',
        'search-input'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateActiveFiltersDisplay);
            element.addEventListener('input', updateActiveFiltersDisplay);
        }
    });
});

// دالة مساعدة لعرض الإشعارات
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        color: #2C3E50;
        padding: 20px 30px;
        border-radius: 15px;
        box-shadow: 0 15px 50px rgba(0, 188, 212, 0.3);
        z-index: 10000;
        font-weight: 600;
        display: flex;
        align-items: center;
        animation: slideIn 0.5s ease;
        border-left: 5px solid ${type === 'success' ? '#4CAF50' : '#00BCD4'};
        transform: translateX(400px);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}
