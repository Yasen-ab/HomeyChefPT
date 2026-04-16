const express = require('express');
const { authenticate } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

const router = express.Router();

router.get('/', authenticate, cartController.getCart);
router.post('/add', authenticate, cartController.addToCart);
router.patch('/items/:dishId', authenticate, cartController.updateCartItem);
router.delete('/items/:dishId', authenticate, cartController.removeCartItem);
router.delete('/clear', authenticate, cartController.clearCart);
router.post('/checkout', authenticate, cartController.checkoutCart);

module.exports = router;
