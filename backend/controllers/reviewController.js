// Review management controller
const Review = require('../models/Review');
const User = require('../models/User');
const Dish = require('../models/Dish');

// Get reviews for a dish
exports.getDishReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { dishId: req.params.dishId },
      include: [{ model: User, attributes: ['name', 'id'] }],
      order: [['createdAt', 'DESC']]
    });

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({ reviews, avgRating });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create review (Users only)
exports.createReview = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can create reviews' });
    }

    const { dishId, rating, comment } = req.body;

    // Check if user already reviewed this dish
    const existingReview = await Review.findOne({
      where: { userId: req.userId, dishId }
    });

    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this dish' });
    }

    const review = await Review.create({
      userId: req.userId,
      dishId,
      rating,
      comment
    });

    res.status(201).json({ message: 'Review created successfully', review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update review (User can only update their own reviews)
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findByPk(req.params.id);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // User can only update their own reviews
    if (review.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await review.update({ rating, comment });
    res.json({ message: 'Review updated successfully', review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete review
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByPk(req.params.id);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // User can only delete their own reviews, admin can delete any
    if (review.userId !== req.userId && req.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await review.destroy();
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

