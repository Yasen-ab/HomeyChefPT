// Sales statistics dashboard
let salesChart = null;
let ordersChart = null;
let dishesChart = null;
let activeController = null;
let currentRange = 'all';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initRangeFilters();
  initLogoutButton();
  loadStatistics('all');
});

function checkAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const user = getUserData() || decodeTokenUser();
  if (!user || (user.role !== 'admin' && user.role !== 'chef')) {
    redirectToDashboard();
  }
}

function initRangeFilters() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const range = button.getAttribute('data-range') || 'all';
      if (range === currentRange) return;
      buttons.forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');
      loadStatistics(range);
    });
  });
}

async function loadStatistics(range) {
  currentRange = range;
  setMessage('Loading statistics...');
  try {
    if (activeController) {
      activeController.abort();
    }
    activeController = new AbortController();

    const data = await apiRequest(`/statistics?range=${encodeURIComponent(range)}`, {
      signal: activeController.signal
    });
    updateMetrics(data);
    renderCharts(data);
    if ((data.total_orders || 0) === 0) {
      setMessage('No orders found for this range.');
    } else {
      setMessage('');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Failed to load statistics:', error);
    setMessage('Unable to load statistics right now.', true);
    showNotification('Unable to load statistics right now.', 'error');
  }
}

function updateMetrics(data) {
  document.getElementById('total-orders').textContent = data.total_orders ?? 0;
  document.getElementById('completed-orders').textContent = data.completed_orders ?? 0;
  document.getElementById('total-revenue').textContent = formatCurrency(data.total_revenue ?? 0);
  document.getElementById('avg-order-value').textContent = formatCurrency(data.average_order_value ?? 0);
}

function renderCharts(data) {
  renderSalesChart(data.sales_by_date || []);
  renderOrdersChart(data.orders_per_chef || []);
  renderDishesChart(data.top_dishes || []);
}

function setMessage(text, isError = false) {
  const message = document.getElementById('stats-message');
  if (!message) return;
  message.textContent = text || '';
  message.classList.toggle('is-error', Boolean(isError));
}

function renderSalesChart(rows) {
  const ctx = document.getElementById('sales-line-chart');
  if (!ctx) return;

  const labels = rows.map((row) => row.date);
  const values = rows.map((row) => Number(row.total_revenue || 0));

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: values,
        borderColor: '#d35400',
        backgroundColor: 'rgba(211, 84, 0, 0.12)',
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: ${formatCurrency(context.parsed.y)}`
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) => `$${value}`
          }
        }
      }
    }
  });
}

function renderOrdersChart(rows) {
  const ctx = document.getElementById('orders-bar-chart');
  if (!ctx) return;

  const labels = rows.map((row) => row.chef_name || `Chef ${row.chef_id}`);
  const values = rows.map((row) => Number(row.total_orders || 0));

  if (ordersChart) {
    ordersChart.destroy();
  }

  ordersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Orders',
        data: values,
        backgroundColor: 'rgba(31, 26, 23, 0.85)',
        borderRadius: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { color: '#6f625a' } },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function renderDishesChart(rows) {
  const ctx = document.getElementById('dishes-pie-chart');
  if (!ctx) return;

  const labels = rows.map((row) => row.dish_name || `Dish ${row.dish_id}`);
  const values = rows.map((row) => Number(row.quantity || 0));

  if (dishesChart) {
    dishesChart.destroy();
  }

  dishesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#d35400',
          '#f39c12',
          '#2c3e50',
          '#c0392b',
          '#7f8c8d'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom' }
      },
      cutout: '60%'
    }
  });
}

function decodeTokenUser() {
  try {
    const token = getAuthToken();
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return {
      id: json.sub || json.userId || json.id,
      role: json.role || json.userType,
      userType: json.userType
    };
  } catch (error) {
    return null;
  }
}
