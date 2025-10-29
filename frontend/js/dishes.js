// Dishes management for Chef
document.addEventListener('DOMContentLoaded', () => {
    ensureChefAuth();
    const user = getUserData();
    if (user?.role !== 'chef') {
        redirectToDashboard();
        return;
    }

    initLogoutButton();
    bindAddDishForm();
    loadChefDishes();
});

function ensureChefAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    const user = getUserData();
    if (user?.role !== 'chef') {
        redirectToDashboard();
    }
}

async function loadChefDishes() {
    const user = getUserData();
    const list = document.getElementById('dishes-list');
    if (!list) return;

    list.innerHTML = '<p>Loading...</p>';
    try {
        const dishes = await apiRequest(`/chefs/${user.id}/dishes`);
        if (!dishes.length) {
            list.innerHTML = '<p>No dishes yet. Add your first dish above.</p>';
            return;
        }

        list.innerHTML = dishes.map(renderDishCard).join('');
    } catch (e) {
        list.innerHTML = `<p class="text-error">${e.message}</p>`;
    }
}

function renderDishCard(dish) {
    const imageUrl = dish.image ? `${API_URL.replace('/api','')}${dish.image}` : null;
    return `
        <div class="card">
            ${imageUrl ? `<img src="${imageUrl}" alt="${dish.name}" style="width:100%;max-height:180px;object-fit:cover;border-radius:8px;"/>` : ''}
            <h3>${dish.name}</h3>
            <p>${dish.description}</p>
            <p><strong>Category:</strong> ${dish.category}</p>
            <p><strong>Price:</strong> ${formatCurrency(dish.price)}</p>
            ${dish.preparationTime ? `<p><strong>Prep Time:</strong> ${dish.preparationTime} min</p>` : ''}
        </div>
    `;
}

function bindAddDishForm() {
    const form = document.getElementById('add-dish-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;

        try {
            const formData = new FormData(form);

            // Build multipart request manually to avoid default JSON headers
            const token = getAuthToken();
            const response = await fetch(`${API_URL}/dishes`, {
                method: 'POST',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create dish');

            showNotification('Dish created successfully!');
            form.reset();
            await loadChefDishes();
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    });
}


