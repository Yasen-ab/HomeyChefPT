// Main server file
const express = require('express');
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HomeyChef API is running' });
});

// Serve HTML files - keep compatibility
const htmlFiles = ['login', 'register', 'menu', 'dashboard-user', 'dashboard-chef', 'dashboard-admin', 'dishes', 'orders', 'admin-users', 'admin-chefs', 'admin-dishes'];

htmlFiles.forEach(file => {
  app.get(`/${file}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', `${file}.html`));
  });
  
  app.get(`/${file}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', `${file}.html`));
  });
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 HomeyChef Server running on port ${PORT}`);
  console.log(`📍 API available at http://localhost:${PORT}/`);
});

