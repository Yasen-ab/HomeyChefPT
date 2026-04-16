let currentCart = null;

document.addEventListener('DOMContentLoaded', () => {
  checkCartAccess();
  initLogoutButton();
  bindCartActions();
  loadCart();
});

function checkCartAccess() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  if (!isUser()) {
    redirectToDashboard();
  }
}

function bindCartActions() {
  document.getElementById('clear-cart-btn')?.addEventListener('click', clearCart);
  document.getElementById('checkout-form')?.addEventListener('submit', handleCheckout);
}

async function loadCart() {
  toggleLoading(true);

  try {
    const response = await apiRequest('/cart');
    currentCart = response.cart;
    renderCart();
  } catch (error) {
    showNotification(error.message || 'Unable to load cart', 'error');
  } finally {
    toggleLoading(false);
  }
}

function renderCart() {
  const itemsContainer = document.getElementById('cart-items');
  const emptyState = document.getElementById('empty-state');
  const sidebar = document.getElementById('cart-sidebar');
  const items = currentCart?.items || [];

  if (!items.length) {
    itemsContainer.innerHTML = '';
    emptyState.style.display = 'block';
    sidebar.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  sidebar.style.display = 'block';
  itemsContainer.innerHTML = items.map(renderCartItem).join('');

  document.getElementById('summary-items').textContent = currentCart.summary.totalItems;
  document.getElementById('summary-total').textContent = formatCurrency(currentCart.summary.totalAmount);
}

function renderCartItem(item) {
  const imageUrl = resolveImageUrl(item.dish.image);

  return `
    <article class="cart-item">
      <img class="cart-item-image" src="${imageUrl}" alt="${escapeHtml(item.dish.name)}">
      <div>
        <h3>${escapeHtml(item.dish.name)}</h3>
        <p class="cart-chef">Chef: ${escapeHtml(item.dish.chefName || 'Unknown')}</p>
        <p class="cart-meta">${escapeHtml(item.dish.description || 'No description available.')}</p>
        <p class="cart-meta">Unit price: ${formatCurrency(item.unitPrice)}</p>
        <div class="cart-controls">
          <input
            class="qty-input"
            type="number"
            min="1"
            value="${item.quantity}"
            onchange="updateQuantity(${item.dishId}, this.value)"
            aria-label="Quantity for ${escapeHtml(item.dish.name)}"
          >
          <button class="btn btn-danger btn-small" type="button" onclick="removeItem(${item.dishId})">Remove</button>
        </div>
      </div>
      <div class="item-total">
        <strong>${formatCurrency(item.subtotal)}</strong>
        <a class="btn btn-secondary btn-small" href="menu.html">Add More</a>
      </div>
    </article>
  `;
}

async function updateQuantity(dishId, quantity) {
  try {
    const response = await apiRequest(`/cart/items/${dishId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: Number(quantity) })
    });
    currentCart = response.cart;
    renderCart();
  } catch (error) {
    showNotification(error.message || 'Unable to update quantity', 'error');
    loadCart();
  }
}

async function removeItem(dishId) {
  try {
    const response = await apiRequest(`/cart/items/${dishId}`, {
      method: 'DELETE'
    });
    currentCart = response.cart;
    renderCart();
    showNotification('Item removed from cart', 'success');
  } catch (error) {
    showNotification(error.message || 'Unable to remove item', 'error');
  }
}

async function clearCart() {
  if (!confirm('Are you sure you want to clear your cart?')) {
    return;
  }

  try {
    const response = await apiRequest('/cart/clear', { method: 'DELETE' });
    currentCart = response.cart;
    renderCart();
    showNotification('Cart cleared successfully', 'success');
  } catch (error) {
    showNotification(error.message || 'Unable to clear cart', 'error');
  }
}

async function handleCheckout(event) {
  event.preventDefault();

  try {
    const response = await apiRequest('/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({
        deliveryAddress: document.getElementById('delivery-address').value.trim(),
        deliveryDate: document.getElementById('delivery-date').value || null,
        notes: document.getElementById('order-notes').value.trim()
      })
    });

    currentCart = response.cart;
    renderCart();
    event.target.reset();
    showNotification('Checkout completed successfully', 'success');
    setTimeout(() => {
      window.location.href = 'orders.html';
    }, 900);
  } catch (error) {
    showNotification(error.message || 'Checkout failed', 'error');
  }
}

function toggleLoading(show) {
  document.getElementById('loading-state').style.display = show ? 'block' : 'none';
}

function resolveImageUrl(path) {
  if (!path) return 'https://via.placeholder.com/300x220?text=Dish';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${path}`;
  return `${API_URL.replace('/api', '')}/uploads/${path}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
