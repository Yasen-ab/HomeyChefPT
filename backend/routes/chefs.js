// Chef management routes
const express = require('express');
const { authenticate, isAdmin } = require('../middleware/auth');
const chefController = require('../controllers/chefController');

const router = express.Router();

// Get all chefs
router.get('/', chefController.getAllChefs);

// Get single chef
router.get('/:id', chefController.getChefById);

// Update chef (own profile or admin)
router.put('/:id', authenticate, chefController.updateChef);

// Delete chef (Admin only)
router.delete('/:id', authenticate, isAdmin, chefController.deleteChef);

// Get chef's dishes
router.get('/:id/dishes', chefController.getChefDishes);

// Get chef's orders
router.get('/:id/orders', authenticate, chefController.getChefOrders);

module.exports = router;

