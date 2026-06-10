// Utility functions
const API_URL = 'https://homeychef.me/api';
const HOMEYCHEF_GA4_ID = 'G-8QK6SHQJNE';
const HOMEYCHEF_GTAG_SCRIPT_ID = 'homeychef-ga4-script';
const HOMEYCHEF_ANALYTICS_HELPER_ID = 'homeychef-analytics-helper';

function createHomeyChefAnalyticsBridge() {
    const existingBridge = window.HomeyChefAnalytics || {};
    const queue = Array.isArray(existingBridge.queue) ? existingBridge.queue : [];
    const analyticsEnabled = Boolean(HOMEYCHEF_GA4_ID && HOMEYCHEF_GA4_ID !== 'G-XXXXXXXXXX');

    function safeParams(params) {
        if (!params || typeof params !== 'object') {
            return {};
        }

        return Object.keys(params).reduce((accumulator, key) => {
            const value = params[key];
            if (value !== undefined && value !== null) {
                accumulator[key] = value;
            }
            return accumulator;
        }, {});
    }

    function trackEvent(eventName, params = {}) {
        if (!analyticsEnabled) {
            return;
        }

        const payload = safeParams(params);

        if (typeof window.gtag === 'function') {
            window.gtag('event', eventName, payload);
            return;
        }

        queue.push({ name: eventName, params: payload });
    }

    function flushQueue() {
        if (!analyticsEnabled || typeof window.gtag !== 'function' || !queue.length) {
            return;
        }

        while (queue.length) {
            const event = queue.shift();
            window.gtag('event', event.name, event.params || {});
        }
    }

    function normalizeRole(role) {
        const normalized = String(role || '').trim().toLowerCase();
        if (normalized === 'user' || normalized === 'customer') return 'customer';
        if (normalized === 'chef') return 'chef';
        if (normalized === 'admin') return 'admin';
        return normalized || 'unknown';
    }

    function buildItemPayload(dish = {}) {
        return {
            item_id: String(dish.id ?? dish.dishId ?? ''),
            item_name: dish.name || dish.dishName || 'Unknown dish',
            item_category: dish.category || 'uncategorized',
            price: Number(dish.price || 0),
            quantity: Number(dish.quantity || 1)
        };
    }

    return {
        queue,
        enabled: analyticsEnabled,
        trackEvent,
        flushQueue,
        normalizeRole,
        buildItemPayload,
        trackDishSelection(dish) {
            trackEvent('select_item', {
                item_list_name: 'menu',
                items: [buildItemPayload(dish)]
            });
        },
        trackAddToCart(dish) {
            const item = buildItemPayload(dish);
            trackEvent('add_to_cart', {
                currency: 'USD',
                value: Number(dish.price || 0) * Number(dish.quantity || 1),
                items: [item]
            });
        },
        trackOrderSuccess(order = {}) {
            const items = Array.isArray(order.items) && order.items.length
                ? order.items.map(buildItemPayload)
                : [];

            trackEvent('purchase', {
                transaction_id: String(order.orderNumber || order.id || order.transactionId || Date.now()),
                currency: 'USD',
                value: Number(order.totalAmount || order.total || 0),
                items
            });
        },
        trackOrderStatus(order = {}, status = '') {
            const normalizedStatus = String(status || order.status || '').trim().toLowerCase();

            trackEvent(normalizedStatus === 'confirmed' ? 'order_confirmed' : 'order_status_updated', {
                order_id: String(order.id || order.orderId || ''),
                order_number: String(order.orderNumber || ''),
                order_status: normalizedStatus || 'unknown',
                total_value: Number(order.totalAmount || 0)
            });
        },
        trackLoginSuccess(user = {}, method = 'email') {
            trackEvent('login', {
                method,
                user_role: normalizeRole(user.role),
                user_id: user.id !== undefined && user.id !== null ? String(user.id) : undefined
            });
        }
    };
}

function ensureHomeyChefAnalytics() {
    if (!window.HomeyChefAnalytics) {
        window.HomeyChefAnalytics = createHomeyChefAnalyticsBridge();
    }

    window.trackAnalyticsEvent = window.trackAnalyticsEvent || ((eventName, params = {}) => {
        window.HomeyChefAnalytics.trackEvent(eventName, params);
    });
    window.trackDishSelection = window.trackDishSelection || ((dish = {}) => {
        window.HomeyChefAnalytics.trackDishSelection(dish);
    });
    window.trackAddToCartEvent = window.trackAddToCartEvent || ((dish = {}) => {
        window.HomeyChefAnalytics.trackAddToCart(dish);
    });
    window.trackOrderSuccess = window.trackOrderSuccess || ((order = {}) => {
        window.HomeyChefAnalytics.trackOrderSuccess(order);
    });
    window.trackOrderStatusEvent = window.trackOrderStatusEvent || ((order = {}, status = '') => {
        window.HomeyChefAnalytics.trackOrderStatus(order, status);
    });
    window.trackLoginSuccess = window.trackLoginSuccess || ((user = {}, method = 'email') => {
        window.HomeyChefAnalytics.trackLoginSuccess(user, method);
    });

    if (!window.dataLayer) {
        window.dataLayer = [];
    }

    if (window.HomeyChefAnalytics.enabled) {
        window.gtag = window.gtag || function () {
            window.dataLayer.push(arguments);
        };

        if (!document.getElementById(HOMEYCHEF_GTAG_SCRIPT_ID)) {
            const gtagScript = document.createElement('script');
            gtagScript.id = HOMEYCHEF_GTAG_SCRIPT_ID;
            gtagScript.async = true;
            gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(HOMEYCHEF_GA4_ID)}`;
            gtagScript.onload = () => {
                window.HomeyChefAnalytics.flushQueue();
            };
            document.head.appendChild(gtagScript);
        }

        window.gtag('js', new Date());
        window.gtag('config', HOMEYCHEF_GA4_ID, {
            send_page_view: true
        });
    }

    if (!document.getElementById(HOMEYCHEF_ANALYTICS_HELPER_ID)) {
        const helperScript = document.createElement('script');
        helperScript.id = HOMEYCHEF_ANALYTICS_HELPER_ID;
        helperScript.src = '/js/analytics-helper.js';
        helperScript.defer = true;
        helperScript.onload = () => {
            window.HomeyChefAnalytics.flushQueue();
        };
        document.head.appendChild(helperScript);
    }
}

ensureHomeyChefAnalytics();


// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Set auth token in localStorage
function setAuthToken(token) {
    localStorage.setItem('authToken', token);
}

// Remove auth token from localStorage
function removeAuthToken() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
}

// Get user data from localStorage
function getUserData() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
}

// Set user data in localStorage
function setUserData(data) {
    localStorage.setItem('userData', JSON.stringify(data));
}

// Make authenticated API request
async function apiRequest(url, options = {}) {
    const token = getAuthToken();
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(API_URL + url, {
            ...options,
            headers
        });
        const contentType = response.headers.get('content-type') || '';
        const raw = await response.text();
        const data = contentType.includes('application/json')
            ? JSON.parse(raw || '{}')
            : null;
        
        if (!response.ok) {
            throw new Error((data && data.error) || raw || 'Request failed');
        }

        if (data !== null) {
            return data;
        }

        throw new Error('Server returned a non-JSON response');
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Logout function
function logout() {
    removeAuthToken();
    window.location.href = 'index.html';
}

// Show notification
function showNotification(message, type = 'success') {
  const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : '!'}</span>
            <span class="notification-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        padding: 1rem 1.5rem;
        z-index: 9999;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 350px;
    }
    
    .notification-toast.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .notification-success {
        border-left: 4px solid var(--success);
    }
    
    .notification-error {
        border-left: 4px solid var(--error);
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    
    .notification-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
    }
    
    .notification-success .notification-icon {
        background: var(--success);
    }
    
    .notification-error .notification-icon {
        background: var(--error);
    }
    
    .notification-message {
        color: var(--text-color);
        font-size: 0.95rem;
        line-height: 1.4;
    }
`;

document.head.appendChild(notificationStyles);


// Check if user is admin
function isAdmin() {
    const user = getUserData();
    return user && user.role === 'admin';
}

// Check if user is chef
function isChef() {
    const user = getUserData();
    return user && user.role === 'chef';
}

// Check if user is regular user
function isUser() {
    const user = getUserData();
    return user && user.role === 'user';
}

// Backward-compatible helper used in some pages
function getCurrentUser() {
  return getUserData();
}

// Redirect based on user role
function redirectToDashboard() {
    const user = getUserData();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (user.role === 'admin') {
        window.location.href = 'dashboard-admin.html';
    } else if (user.role === 'chef') {
        window.location.href = 'dashboard-chef.html';
    } else {
        window.location.href = 'dashboard-user.html';
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format currency
function formatCurrency(amount) {
    return `$${parseFloat(amount).toFixed(2)}`;
}

// Initialize logout button listeners
function initLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
}

// Add CSS animation keyframes if not present
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

