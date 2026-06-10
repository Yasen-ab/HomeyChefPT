(function (window) {
    const analytics = window.HomeyChefAnalytics || {};
    const queue = Array.isArray(analytics.queue) ? analytics.queue : [];

    function isReady() {
        return typeof window.gtag === 'function' && analytics.enabled !== false;
    }

    function trackEvent(eventName, params = {}) {
        const payload = params && typeof params === 'object' ? params : {};

        if (!analytics.enabled) {
            return;
        }

        if (isReady()) {
            window.gtag('event', eventName, payload);
            return;
        }

        queue.push({ name: eventName, params: payload });
    }

    function flushQueue() {
        if (!isReady() || !queue.length) {
            return;
        }

        while (queue.length) {
            const event = queue.shift();
            window.gtag('event', event.name, event.params || {});
        }
    }

    function compactObject(source) {
        return Object.keys(source).reduce((accumulator, key) => {
            const value = source[key];
            if (value !== undefined && value !== null && value !== '') {
                accumulator[key] = value;
            }
            return accumulator;
        }, {});
    }

    function normalizeRole(role) {
        const value = String(role || '').trim().toLowerCase();
        if (value === 'user' || value === 'customer') return 'customer';
        if (value === 'chef') return 'chef';
        if (value === 'admin') return 'admin';
        return value || 'unknown';
    }

    function buildItem(item = {}) {
        return compactObject({
            item_id: String(item.id ?? item.dishId ?? ''),
            item_name: item.name || item.dishName || 'Unknown dish',
            item_category: item.category || 'uncategorized',
            price: Number(item.price || 0),
            quantity: Number(item.quantity || 1)
        });
    }

    analytics.queue = queue;
    analytics.trackEvent = trackEvent;
    analytics.flushQueue = flushQueue;
    analytics.trackDishSelection = function (dish = {}) {
        trackEvent('select_item', {
            item_list_name: 'menu',
            items: [buildItem(dish)]
        });
    };
    analytics.trackAddToCart = function (dish = {}) {
        const item = buildItem(dish);
        trackEvent('add_to_cart', {
            currency: 'USD',
            value: Number(dish.price || 0) * Number(dish.quantity || 1),
            items: [item]
        });
    };
    analytics.trackOrderSuccess = function (order = {}) {
        const items = Array.isArray(order.items) ? order.items.map(buildItem) : [];
        trackEvent('purchase', {
            transaction_id: String(order.orderNumber || order.id || order.transactionId || Date.now()),
            currency: 'USD',
            value: Number(order.totalAmount || order.total || 0),
            items
        });
    };
    analytics.trackOrderStatus = function (order = {}, status = '') {
        const normalizedStatus = String(status || order.status || '').trim().toLowerCase();

        trackEvent(normalizedStatus === 'confirmed' ? 'order_confirmed' : 'order_status_updated', {
            order_id: String(order.id || order.orderId || ''),
            order_number: String(order.orderNumber || ''),
            order_status: normalizedStatus || 'unknown',
            total_value: Number(order.totalAmount || 0)
        });
    };
    analytics.trackLoginSuccess = function (user = {}, method = 'email') {
        trackEvent('login', compactObject({
            method,
            user_role: normalizeRole(user.role),
            user_id: user.id !== undefined && user.id !== null ? String(user.id) : undefined
        }));
    };

    window.trackAnalyticsEvent = window.trackAnalyticsEvent || trackEvent;
    window.trackDishSelection = window.trackDishSelection || analytics.trackDishSelection;
    window.trackAddToCartEvent = window.trackAddToCartEvent || analytics.trackAddToCart;
    window.trackOrderSuccess = window.trackOrderSuccess || analytics.trackOrderSuccess;
    window.trackOrderStatusEvent = window.trackOrderStatusEvent || analytics.trackOrderStatus;
    window.trackLoginSuccess = window.trackLoginSuccess || analytics.trackLoginSuccess;

    analytics.flushQueue();
})(window);
