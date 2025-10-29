// Chef management routes
const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate, isAdmin, isChef } = require('../middleware/auth');
const Chef = require('../models/Chef');
const Dish = require('../models/Dish');
const Order = require('../models/Order');

const router = express.Router();

// Get all chefs
router.get('/', async (req, res) => {
  try {
    const chefs = await Chef.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });
    res.json(chefs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single chef
router.get('/:id', async (req, res) => {
  try {
    const chef = await Chef.findByPk(req.params.id);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }
    res.json(chef);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update chef (own profile or admin)
router.put('/:id', authenticate, async (req, res) => {
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
});

// Delete chef (Admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
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
});

// Get chef's dishes
router.get('/:id/dishes', async (req, res) => {
  try {
    const dishes = await Dish.findAll({
      where: { chefId: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chef's orders
router.get('/:id/orders', authenticate, async (req, res) => {
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
});

module.exports = router;

