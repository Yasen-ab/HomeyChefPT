// Main server file
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure Sequelize associations are registered
const { setupRelationships } = require('./config/syncDatabase');
setupRelationships();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chefRoutes = require('./routes/chefs');
const dishRoutes = require('./routes/dishes');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const favoriteRoutes = require('./routes/favorites');
const notificationRoutes = require('./routes/notifications');
const cartRoutes = require('./routes/cart');
const statisticsRoutes = require('./routes/statistics');
const { initNotificationSocket } = require('./socket/notificationSocket');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'views')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chefs', chefRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/statistics', statisticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HomeyChef API is running' });
});

// Favicon endpoint (to prevent 404 errors)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Serve HTML files - keep compatibility
const htmlFiles = [
  'login',
  'register',
  'menu',
  'dashboard-user',
  'dashboard-chef',
  'dashboard-admin',
  'dishes',
  'orders',
  'admin-users',
  'admin-chefs',
  'admin-dishes',
  'statistics',
  'change_password',
  'forgot_password',
  'reset_password'
];

htmlFiles.forEach((file) => {
  app.get(`/${file}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', `${file}.html`));
  });

  app.get(`/${file}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', `${file}.html`));
  });
});

app.get('/chefs/:chefId', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'chef-profile.html'));
});

app.get('/favorites', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'favorites.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'notifications.html'));
});

// Backward-compatible path aliases for auth recovery pages
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'forgot_password.html'));
});

app.get('/reset_password', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'reset_password.html'));
});

const server = http.createServer(app);
initNotificationSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`HomeyChef Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/`);
});
