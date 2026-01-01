// Order management routes
const express = require('express');
const { authenticate, isChefOrAdmin } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

const router = express.Router();

// Get all orders (Admin or Chef can see their orders)
router.get('/', authenticate, orderController.getAllOrders);

// Get single order
router.get('/:id', authenticate, orderController.getOrderById);

// Create order (Users)
router.post('/', authenticate, orderController.createOrder);

// Update order status (Chef or Admin)
router.put('/:id/status', authenticate, isChefOrAdmin, orderController.updateOrderStatus);

// Cancel order (User or Chef)
router.put('/:id/cancel', authenticate, orderController.cancelOrder);

module.exports = router;

