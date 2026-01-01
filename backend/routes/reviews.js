// Review management routes
const express = require('express');
const { authenticate } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

// Get reviews for a dish
router.get('/dish/:dishId', reviewController.getDishReviews);

// Create review (Users only)
router.post('/', authenticate, reviewController.createReview);

// Update review (User can only update their own reviews)
router.put('/:id', authenticate, reviewController.updateReview);

// Delete review
router.delete('/:id', authenticate, reviewController.deleteReview);

module.exports = router;

