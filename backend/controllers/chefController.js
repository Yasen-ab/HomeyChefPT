// Chef management controller
const sequelize = require('../config/database');
const Chef = require('../models/Chef');
const Dish = require('../models/Dish');
const Review = require('../models/Review');
const Order = require('../models/Order');

// Get all chefs
exports.getAllChefs = async (req, res) => {
  try {
    const chefs = await Chef.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });
    res.json(chefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single chef
exports.getChefById = async (req, res) => {
  try {
    const chef = await Chef.findByPk(req.params.id);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }
    res.json(chef);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update chef (own profile or admin)
exports.updateChef = async (req, res) => {
  try {
    // Chef can only update their own profile, admin can update any
    if (req.userType !== 'chef' && req.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.userType === 'chef' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, phone, address, bio, specialties } = req.body;
    const chef = await Chef.findByPk(req.params.id);
    
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    await chef.update({ name, phone, address, bio, specialties });
    res.json({ message: 'Chef updated successfully', chef });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete chef (Admin only)
exports.deleteChef = async (req, res) => {
  try {
    const chef = await Chef.findByPk(req.params.id);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    await chef.destroy();
    res.json({ message: 'Chef deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get chef's dishes
exports.getChefDishes = async (req, res) => {
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

    const dishes = await Dish.findAll({
      where: { chefId: req.params.id },
      attributes: { include: ratingAttributes },
      include: [
        {
          model: Review,
          as: 'reviews',
          attributes: ['id', 'rating', 'comment', 'userId', 'createdAt'],
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

// Get chef's orders
exports.getChefOrders = async (req, res) => {
  try {
    // Chef can only access their own orders, admin can access any
    if (req.userType !== 'chef' && req.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.userType === 'chef' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await Order.findAll({
      where: { chefId: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

