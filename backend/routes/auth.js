// Authentication routes
const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts only
  message: { error: 'Too many login attempts, try again later' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many requests, try again later' }
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many requests, try again later' }
});

// Register Admin/User
router.post('/register', authController.register);

// Register Chef
router.post('/register/chef', authController.registerChef);

// Login (auto-detect Chef or User by email)
router.post('/login', loginLimiter, authController.login);

// Change password (authenticated user only)
router.post('/change-password', authenticate, authController.changePassword);

// Forgot/reset password flow
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.get('/reset-password/validate', resetPasswordLimiter, authController.validateResetToken);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

// Google OAuth Login
router.post('/google', authController.googleLogin);

// Get current user
router.get('/me', authController.getMe);

module.exports = router;

