const express = require('express');
const { authenticate } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

const router = express.Router();

router.post('/add', authenticate, cartController.addToCart);

module.exports = router;
