let currentPage = 1;
const pageSize = 6;
let chefId = null;
let favoriteDishIds = new Set();

function resolveChefId() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const fromPath = parts[0] === 'chefs' ? Number(parts[1]) : null;
  if (fromPath) return fromPath;
  const query = new URLSearchParams(window.location.search);
  return Number(query.get('chefId'));
}

async function loadFavorites() {
  if (!isAuthenticated() || !isUser()) return;
  try {
    const result = await apiRequest('/favorites');
    favoriteDishIds = new Set((result.favorites || []).map((fav) => Number(fav.dishId)));
  } catch (error) {
    favoriteDishIds = new Set();
  }
}

function imageUrl(path) {
  if (!path) return 'https://via.placeholder.com/400x300?text=Dish';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${path}`;
  return `${API_URL.replace('/api', '')}/uploads/${path}`;
}

function renderHeader(chef) {
  document.getElementById('chef-avatar').src = imageUrl(chef.avatarUrl);
  document.getElementById('chef-name').textContent = chef.name;
  document.getElementById('chef-rating').textContent =
    `${Number(chef.rating.avgRating || 0).toFixed(1)} (${chef.rating.reviewCount || 0} reviews)`;
  document.getElementById('chef-bio').textContent = chef.bio || 'No bio available.';

  const badge = document.getElementById('availability-badge');
  const isAvailable = Boolean(chef.availability?.isAvailable);
  badge.textContent = isAvailable ? 'Available' : 'Unavailable';
  badge.classList.toggle('open', isAvailable);
  badge.classList.toggle('closed', !isAvailable);

  renderAvailabilitySchedule(chef.availability || { slots: [], disabledDays: [] });
}

function renderAvailabilitySchedule(availability) {
  const container = document.getElementById('availability-schedule');
  if (!container) return;

  const slots = availability.slots || [];
  const disabledDays = availability.disabledDays || [];
  const slotRows = slots
    .map((slot) => `<li>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][slot.dayOfWeek]}: ${slot.startTime} - ${slot.endTime}${slot.description ? ` (${slot.description})` : ''}</li>`)
    .join('');
  const disabledRows = disabledDays
    .map((holiday) => `<li>${holiday.date}${holiday.description ? ` — ${holiday.description}` : ''}</li>`)
    .join('');

  container.innerHTML = `
    <div class="schedule-summary">
      <h3>Schedule</h3>
      <div class="schedule-block">
        <strong>Slots</strong>
        <ul>${slotRows || '<li>No weekly slots defined.</li>'}</ul>
      </div>
      <div class="schedule-block">
        <strong>Holidays / Leaves</strong>
        <ul>${disabledRows || '<li>No holidays planned.</li>'}</ul>
      </div>
    </div>
  `;
}

function renderDishes(dishes) {
  const grid = document.getElementById('dishes-grid');
  grid.innerHTML = dishes.map((dish) => {
    const favorite = favoriteDishIds.has(Number(dish.id));
    return `
      <article class="dish-card">
        <img src="${imageUrl(dish.thumbnail)}" alt="${dish.name}">
        <div class="dish-card-content">
          <div class="dish-row">
            <strong>${dish.name}</strong>
            <span>$${Number(dish.price).toFixed(2)}</span>
          </div>
          <small>${dish.isAvailable ? 'Available' : 'Unavailable'}</small>
          <div class="dish-actions">
            <button class="btn-cart" onclick="addToCart(${dish.id})" ${dish.isAvailable ? '' : 'disabled'}>
              Add to Cart
            </button>
            <button class="btn-fav ${favorite ? 'active' : ''}" onclick="toggleFavorite(${dish.id})">
              <i class="${favorite ? 'fas' : 'far'} fa-heart"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function renderPagination(pagination) {
  document.getElementById('dish-count').textContent = `${pagination.total} total dishes`;
  document.getElementById('page-info').textContent = `Page ${pagination.page} / ${pagination.totalPages || 1}`;
  document.getElementById('prev-page').disabled = pagination.page <= 1;
  document.getElementById('next-page').disabled = pagination.page >= (pagination.totalPages || 1);
}

async function loadChefProfile() {
  try {
    const data = await apiRequest(`/chefs/${chefId}?page=${currentPage}&limit=${pageSize}`);
    renderHeader(data.chef);
    renderDishes(data.dishes || []);
    renderPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
  } catch (error) {
    showNotification(error.message || 'Failed to load chef profile', 'error');
  }
}

async function toggleFavorite(dishId) {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  if (!isUser()) return;

  const wasFavorite = favoriteDishIds.has(Number(dishId));
  if (wasFavorite) favoriteDishIds.delete(Number(dishId));
  else favoriteDishIds.add(Number(dishId));
  loadChefProfile();

  try {
    if (wasFavorite) {
      await apiRequest(`/favorites/${dishId}`, { method: 'DELETE' });
    } else {
      await apiRequest('/favorites', {
        method: 'POST',
        body: JSON.stringify({ dishId })
      });
    }
  } catch (error) {
    if (wasFavorite) favoriteDishIds.add(Number(dishId));
    else favoriteDishIds.delete(Number(dishId));
    loadChefProfile();
    showNotification(error.message, 'error');
  }
}

async function addToCart(dishId) {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }
  if (!isUser()) return;

  try {
    await apiRequest('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ dishId, quantity: 1 })
    });
    showNotification('Added to cart', 'success');
  } catch (error) {
    showNotification(error.message || 'Unable to add to cart', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  chefId = resolveChefId();
  if (!chefId) {
    showNotification('Chef id is missing', 'error');
    return;
  }

  await loadFavorites();
  await loadChefProfile();

  document.getElementById('prev-page').addEventListener('click', async () => {
    currentPage -= 1;
    await loadChefProfile();
  });

  document.getElementById('next-page').addEventListener('click', async () => {
    currentPage += 1;
    await loadChefProfile();
  });
});

window.toggleFavorite = toggleFavorite;
window.addToCart = addToCart;
