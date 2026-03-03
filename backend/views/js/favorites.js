function dishImage(path) {
  if (!path) return 'https://via.placeholder.com/400x300?text=Dish';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${path}`;
  return `${API_URL.replace('/api', '')}/uploads/${path}`;
}

function createDishCard(favorite) {
  const dish = favorite.Dish;
  return `
    <article class="dish-card">
      <img src="${dishImage(dish.image)}" alt="${dish.name}">
      <div class="dish-content">
        <div class="dish-meta">
          <strong>${dish.name}</strong>
          <span>$${Number(dish.price).toFixed(2)}</span>
        </div>
        <small>Chef: ${dish.Chef?.name || 'Unknown'}</small>
        <div class="dish-actions">
          <button class="btn-chef" onclick="viewChef(${dish.chefId || dish.Chef?.id || 'null'})">View Chef</button>
          <button class="btn-remove" onclick="removeFavorite(${dish.id})">Remove</button>
        </div>
      </div>
    </article>
  `;
}

async function loadFavorites() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const result = await apiRequest('/favorites');
    const grid = document.getElementById('favorites-grid');
    const favorites = result.favorites || [];

    if (favorites.length === 0) {
      grid.innerHTML = '<div class="favorites-empty">No favorite dishes yet. Start adding from the menu.</div>';
      return;
    }

    grid.innerHTML = favorites.map(createDishCard).join('');
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function removeFavorite(dishId) {
  try {
    await apiRequest(`/favorites/${dishId}`, { method: 'DELETE' });
    showNotification('Removed from favorites', 'success');
    await loadFavorites();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

function viewChef(chefId) {
  const id = Number(chefId);
  if (!id) {
    showNotification('Chef id is missing', 'error');
    return;
  }
  window.location.href = `chef-profile.html?chefId=${id}`;
}

document.addEventListener('DOMContentLoaded', loadFavorites);

window.removeFavorite = removeFavorite;
window.viewChef = viewChef;
