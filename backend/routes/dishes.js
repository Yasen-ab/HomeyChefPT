// Dish management routes
const express = require('express');
const multer = require('multer');
const { authenticate, isChefOrAdmin } = require('../middleware/auth');
const dishController = require('../controllers/dishController');

const router = express.Router();

// Use in-memory storage so images are uploaded directly to Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// Get all dishes (with filters)
router.get('/', dishController.getAllDishes);

// Get single dish
router.get('/:id', dishController.getDishById);

// Rate a dish (create or update review) - Users only
router.post('/:id/rate', authenticate, dishController.rateDish);

// Create dish (Chef or Admin)
router.post('/', authenticate, isChefOrAdmin, upload.single('image'), dishController.createDish);

// Update dish (Chef or Admin)
router.put('/:id', authenticate, isChefOrAdmin, upload.single('image'), dishController.updateDish);

// Delete dish (Chef or Admin)
router.delete('/:id', authenticate, isChefOrAdmin, dishController.deleteDish);

module.exports = router;

