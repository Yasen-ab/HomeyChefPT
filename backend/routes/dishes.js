// Dish management routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const { Op } = require('sequelize');
const { authenticate, isChefOrAdmin } = require('../middleware/auth');
const Dish = require('../models/Dish');
const Chef = require('../models/Chef');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dish-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Get all dishes (with filters)
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
    const where = { isAvailable: true };

    if (category) {
      where.category = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { ingredients: { [Op.like]: `%${search}%` } }
      ];
    }

    const dishes = await Dish.findAll({
      where,
      include: [{ model: Chef, attributes: ['name', 'id'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(dishes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single dish
router.get('/:id', async (req, res) => {
  try {
    const dish = await Dish.findByPk(req.params.id, {
      include: [{ model: Chef, attributes: ['name', 'id', 'bio'] }]
    });
    
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    
    res.json(dish);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create dish (Chef or Admin)
router.post('/', authenticate, isChefOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, ingredients, preparationTime } = req.body;
    
    const chefId = req.userType === 'chef' ? req.userId : req.body.chefId;
    
    if (!chefId) {
      return res.status(400).json({ error: 'Chef ID is required' });
    }

    // Chef can only create dishes for themselves, admin can create for any chef
    if (req.userType === 'chef' && req.userId.toString() !== chefId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const dish = await Dish.create({
      name,
      description,
      price,
      category,
      ingredients,
      preparationTime,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      chefId
    });

    res.status(201).json({ message: 'Dish created successfully', dish });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update dish (Chef or Admin)
router.put('/:id', authenticate, isChefOrAdmin, upload.single('image'), async (req, res) => {
  try {
    const dish = await Dish.findByPk(req.params.id);
    
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    // Chef can only update their own dishes
    if (req.userType === 'chef' && dish.chefId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, description, price, category, ingredients, isAvailable, preparationTime } = req.body;
    
    await dish.update({
      name,
      description,
      price,
      category,
      ingredients,
      isAvailable,
      preparationTime,
      image: req.file ? `/uploads/${req.file.filename}` : dish.image
    });

    res.json({ message: 'Dish updated successfully', dish });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete dish (Chef or Admin)
router.delete('/:id', authenticate, isChefOrAdmin, async (req, res) => {
  try {
    const dish = await Dish.findByPk(req.params.id);
    
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    // Chef can only delete their own dishes
    if (req.userType === 'chef' && dish.chefId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await dish.destroy();
    res.json({ message: 'Dish deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

