// Dish management controller
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Dish = require('../models/Dish');
const Chef = require('../models/Chef');
const Review = require('../models/Review');
const User = require('../models/User');

// Get all dishes (with filters)
exports.getAllDishes = async (req, res) => {
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

    const ratingAttributes = [
      [
        sequelize.literal('(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.dishId = Dish.id)'),
        'averageRating'
      ],
      [
        sequelize.literal('(SELECT COUNT(*) FROM reviews r WHERE r.dishId = Dish.id)'),
        'reviewCount'
      ]
    ];

    const dishes = await Dish.findAll({
      where,
      attributes: { include: ratingAttributes },
      include: [
        { model: Chef, as: 'Chef', attributes: ['name', 'id'] },
        {
          model: Review,
          as: 'reviews',
          attributes: ['id', 'rating', 'comment', 'userId', 'createdAt'],
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
          separate: true,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const serialized = dishes.map(dish => {
      const data = dish.toJSON();
      data.ratings = data.reviews || [];
      data.averageRating = Number(data.averageRating || 0);
      data.reviewCount = Number(data.reviewCount || 0);
      return data;
    });

    res.json(serialized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single dish
exports.getDishById = async (req, res) => {
  try {
    const ratingAttributes = [
      [
        sequelize.literal('(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.dishId = Dish.id)'),
        'averageRating'
      ],
      [
        sequelize.literal('(SELECT COUNT(*) FROM reviews r WHERE r.dishId = Dish.id)'),
        'reviewCount'
      ]
    ];

    // Find dish by ID
    const dish = await Dish.findByPk(req.params.id, {
      attributes: { include: ratingAttributes },
      include: [
        { model: Chef, as: 'Chef', attributes: ['name', 'id', 'bio'] },
        {
          model: Review,
          as: 'reviews',
          attributes: ['id', 'rating', 'comment', 'userId', 'createdAt'],
          include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
          separate: true,
          order: [['createdAt', 'DESC']]
        }
      ]
    });
    
    // If dish not found
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }
    
    // Serialize dish data
    const data = dish.toJSON();
    data.ratings = data.reviews || [];
    data.averageRating = Number(data.averageRating || 0);
    data.reviewCount = Number(data.reviewCount || 0);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Rate a dish (create or update review) - Users only
exports.rateDish = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can submit ratings' });
    }

    const dishId = req.params.id;
    const { rating, comment } = req.body;

    const dish = await Dish.findByPk(dishId);
    if (!dish) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    // Validate rating
    const r = parseInt(rating, 10);
    if (!r || r < 1 || r > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // Check if review exists -> update, else create
    const Review = require('../models/Review');
    const existing = await Review.findOne({ where: { userId: req.userId, dishId } });
    let review;
    if (existing) {
      await existing.update({ rating: r, comment });
      review = existing;
    } else {
      review = await Review.create({ userId: req.userId, dishId, rating: r, comment });
    }

    res.json({ message: 'Rating submitted', review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create dish (Chef or Admin)
exports.createDish = async (req, res) => {
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
};

// Update dish (Chef or Admin)
exports.updateDish = async (req, res) => {
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
};

// Delete dish (Chef or Admin)
exports.deleteDish = async (req, res) => {
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
};

