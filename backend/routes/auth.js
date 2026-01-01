// Authentication routes
const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts only
  message: { error: 'Too many login attempts, try again later' }
});

// Register Admin/User
router.post('/register', authController.register);

// Register Chef
router.post('/register/chef', authController.registerChef);

// Login (auto-detect Chef or User by email)
router.post('/login', loginLimiter, authController.login);

// Google OAuth Login
router.post('/google', authController.googleLogin);

// Get current user
router.get('/me', authController.getMe);

module.exports = router;

