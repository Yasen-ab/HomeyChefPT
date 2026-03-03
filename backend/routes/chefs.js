// Chef management routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, isAdmin, isChef } = require('../middleware/auth');
const chefController = require('../controllers/chefController');

const router = express.Router();

// Configure multer for chef profile uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chef-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Get all chefs
router.get('/', chefController.getAllChefs);

// Get own chef profile
router.get('/profile', authenticate, isChef, chefController.getChefProfile);

// Get single chef
router.get('/:id', chefController.getChefById);

// Update own chef profile (with image upload)
router.put('/profile', authenticate, isChef, upload.single('profileImage'), chefController.updateChefProfile);

// Update chef (own profile or admin)
router.put('/:id', authenticate, chefController.updateChef);

// Delete chef (Admin only)
router.delete('/:id', authenticate, isAdmin, chefController.deleteChef);

// Get chef's dishes
router.get('/:id/dishes', chefController.getChefDishes);

// Get chef's orders
router.get('/:id/orders', authenticate, chefController.getChefOrders);

module.exports = router;

