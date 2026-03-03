const express = require('express');
const { authenticate } = require('../middleware/auth');
const favoriteController = require('../controllers/favoriteController');

const router = express.Router();

router.get('/', authenticate, favoriteController.getFavorites);
router.post('/', authenticate, favoriteController.addFavorite);
router.delete('/:dishId', authenticate, favoriteController.removeFavorite);

module.exports = router;
