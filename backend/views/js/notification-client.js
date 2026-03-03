(function () {
  const TOAST_TIMEOUT = 7000;
  const POLL_INTERVAL = 45000;
  let socket = null;
  let pollTimer = null;

  function getApiBase() {
    return (typeof API_URL === 'string' ? API_URL : '/api').replace(/\/api$/, '');
  }

  function updateUnreadBadge(count) {
    document.querySelectorAll('[data-notification-badge]').forEach((el) => {
      el.textContent = count > 99 ? '99+' : String(count);
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  function toast(notification) {
    const existing = document.querySelector('.rt-toast');
    if (existing) existing.remove();

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'rt-toast';
    el.innerHTML = `
      <strong>${notification.title}</strong>
      <span>${notification.body}</span>
    `;

    el.addEventListener('click', () => {
      if (notification.orderId) {
        window.location.href = `orders.html?orderId=${notification.orderId}`;
      } else {
        window.location.href = 'notifications';
      }
    });

    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, TOAST_TIMEOUT);
  }

  async function fetchUnreadCount() {
    if (!isAuthenticated()) return;
    try {
      const result = await apiRequest('/notifications?unread=true&limit=100');
      updateUnreadBadge((result.notifications || []).length);
    } catch (error) {
      // Ignore badge fetch errors silently.
    }
  }

  async function fetchInProgressBanner() {
    if (!isAuthenticated() || !isUser()) return;

    try {
      const [ordersResult, unreadResult] = await Promise.all([
        apiRequest('/orders?status=in-progress'),
        apiRequest('/notifications?unread=true&limit=20')
      ]);

      const inProgress = (ordersResult || []).filter(
        (order) => order.status === 'preparing' || order.status === 'on_the_way'
      );

      if (inProgress.length === 0) return;

      const banner = document.createElement('a');
      banner.className = 'order-status-banner';
      banner.href = 'orders.html';
      banner.textContent = `Order Status: You have ${inProgress.length} in-progress order(s).`;
      document.body.prepend(banner);

      updateUnreadBadge((unreadResult.notifications || []).length);
    } catch (error) {
      // Ignore banner fetch errors silently.
    }
  }

  function ensureStyles() {
    if (document.getElementById('rt-notification-styles')) return;
    const style = document.createElement('style');
    style.id = 'rt-notification-styles';
    style.textContent = `
      .rt-toast {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 9999;
        border: 0;
        border-radius: 12px;
        background: #0f172a;
        color: #fff;
        padding: 12px 14px;
        max-width: 320px;
        text-align: left;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 4px;
        opacity: 0;
        transform: translateY(12px);
        transition: 0.25s ease;
      }
      .rt-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
      .order-status-banner {
        display: block;
        background: #fde68a;
        color: #1f2937;
        text-decoration: none;
        font-weight: 600;
        text-align: center;
        padding: 10px 14px;
      }
      [data-notification-badge] {
        min-width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        font-size: 11px;
        line-height: 18px;
        text-align: center;
        padding: 0 5px;
        margin-left: 6px;
        display: none;
      }
    `;
    document.head.appendChild(style);
  }

  function startPollingFallback() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(fetchUnreadCount, POLL_INTERVAL);
  }

  function connectSocket() {
    if (!window.io || !isAuthenticated()) {
      startPollingFallback();
      return;
    }

    const token = getAuthToken();
    socket = window.io(`${getApiBase()}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', fetchUnreadCount);
    socket.on('notification:new', (notification) => {
      toast(notification);
      fetchUnreadCount();
    });
    socket.on('connect_error', startPollingFallback);
  }

  async function init() {
    ensureStyles();
    if (!isAuthenticated()) return;
    await fetchUnreadCount();
    await fetchInProgressBanner();
    connectSocket();
  }

  window.HomeyChefNotifications = {
    init,
    refreshUnread: fetchUnreadCount
  };
})();
