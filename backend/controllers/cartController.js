const Dish = require('../models/Dish');
const { createNotification } = require('../services/notificationService');

const userCartState = new Map();

exports.addToCart = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can add items to cart' });
    }

    const { dishId, quantity = 1 } = req.body;
    if (!dishId) {
      return res.status(400).json({ error: 'dishId is required' });
    }

    const dish = await Dish.findByPk(dishId);
    if (!dish || !dish.isAvailable) {
      return res.status(400).json({ error: 'Dish is not available' });
    }

    const current = userCartState.get(req.userId) || { chefId: null, items: [] };

    if (current.chefId && current.chefId !== dish.chefId) {
      const notification = await createNotification({
        userId: req.userId,
        type: 'cart_chef_conflict',
        title: 'Cart conflict',
        body: 'Your cart already has dishes from another chef. Complete or clear it before adding this dish.'
      });

      return res.status(409).json({
        error: 'Cannot mix dishes from different chefs in one cart',
        notification
      });
    }

    current.chefId = dish.chefId;
    const itemIndex = current.items.findIndex((item) => item.dishId === Number(dishId));
    if (itemIndex >= 0) {
      current.items[itemIndex].quantity += Number(quantity) || 1;
    } else {
      current.items.push({ dishId: Number(dishId), quantity: Number(quantity) || 1 });
    }

    userCartState.set(req.userId, current);

    res.json({
      message: 'Dish added to cart',
      cart: current
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
