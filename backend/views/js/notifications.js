let page = 1;
let totalPages = 1;

function formatWhen(date) {
  return new Date(date).toLocaleString();
}

function renderNotification(notification) {
  return `
    <article class="notification-item ${notification.read ? '' : 'unread'}">
      <div class="notification-row">
        <strong>${notification.title}</strong>
        ${notification.read ? '' : `<button onclick="markAsRead(${notification.id})">Mark as read</button>`}
      </div>
      <p>${notification.body}</p>
      <div class="notification-meta">
        <span>${notification.type}</span>
        <span>${formatWhen(notification.createdAt)}</span>
      </div>
    </article>
  `;
}

async function loadNotifications() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const result = await apiRequest(`/notifications?page=${page}&limit=10`);
    const list = result.notifications || [];
    totalPages = result.pagination?.totalPages || 1;

    document.getElementById('notification-list').innerHTML =
      list.length ? list.map(renderNotification).join('') : '<p>No notifications yet.</p>';

    document.getElementById('page-label').textContent = `Page ${page} / ${totalPages}`;
    document.getElementById('prev').disabled = page <= 1;
    document.getElementById('next').disabled = page >= totalPages;

    if (window.HomeyChefNotifications) {
      window.HomeyChefNotifications.refreshUnread();
    }
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

async function markAsRead(id) {
  try {
    await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
    await loadNotifications();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadNotifications();
  document.getElementById('prev').addEventListener('click', async () => {
    page -= 1;
    await loadNotifications();
  });
  document.getElementById('next').addEventListener('click', async () => {
    page += 1;
    await loadNotifications();
  });
});

window.markAsRead = markAsRead;
