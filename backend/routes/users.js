// User management routes
const express = require('express');
const { authenticate, isAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticate, isAdmin, userController.getAllUsers);

// Get single user
router.get('/:id', authenticate, userController.getUserById);

// Update user (own profile or admin)
router.put('/:id', authenticate, userController.updateUser);

// Patch user status (activate/deactivate) - Admin only
router.patch('/:id/status', authenticate, isAdmin, userController.updateUserStatus);

// Delete user (Admin only)
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);

// Get user's orders
router.get('/:id/orders', authenticate, userController.getUserOrders);

module.exports = router;

