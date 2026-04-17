const Dish = require('../models/Dish');
const Chef = require('../models/Chef');
const { createNotification } = require('../services/notificationService');
const { createOrdersForUser } = require('./orderController');

const userCartState = new Map();

function getRawCart(userId) {
  return userCartState.get(userId) || { chefId: null, items: [] };
}

function saveRawCart(userId, cart) {
  if (!cart.items.length) {
    userCartState.delete(userId);
    return;
  }

  userCartState.set(userId, cart);
}

async function serializeCart(cart) {
  const dishIds = cart.items.map((item) => item.dishId);
  const dishes = dishIds.length
    ? await Dish.findAll({
      where: { id: dishIds },
      include: [{ model: Chef, as: 'Chef', attributes: ['id', 'name'] }]
    })
    : [];

  const dishMap = new Map(dishes.map((dish) => [dish.id, dish]));
  const items = cart.items
    .map((item) => {
      const dish = dishMap.get(item.dishId);
      if (!dish) return null;

      const unitPrice = Number(dish.price);
      const subtotal = unitPrice * item.quantity;
      const image = dish.image
        ? (dish.image.startsWith('/uploads') ? dish.image : `/uploads/${dish.image}`)
        : null;

      return {
        dishId: dish.id,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        dish: {
          id: dish.id,
          name: dish.name,
          description: dish.description,
          image,
          isAvailable: dish.isAvailable,
          chefId: dish.chefId,
          chefName: dish.Chef?.name || null
        }
      };
    })
    .filter(Boolean);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    chefId: cart.chefId,
    items,
    summary: {
      totalItems,
      totalAmount
    }
  };
}

async function getSerializedCartForUser(userId) {
  const rawCart = getRawCart(userId);
  return serializeCart(rawCart);
}

exports.getCart = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can access cart' });
    }

    const cart = await getSerializedCartForUser(req.userId);
    res.json({ cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can add items to cart' });
    }

    const { dishId, quantity = 1 } = req.body;
    const normalizedDishId = Number(dishId);
    const normalizedQuantity = Number(quantity) || 0;

    if (!normalizedDishId) {
      return res.status(400).json({ error: 'dishId is required' });
    }

    if (normalizedQuantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const dish = await Dish.findByPk(normalizedDishId);
    if (!dish || !dish.isAvailable) {
      return res.status(400).json({ error: 'Dish is not available' });
    }

    const current = getRawCart(req.userId);

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
    const itemIndex = current.items.findIndex((item) => item.dishId === normalizedDishId);

    if (itemIndex >= 0) {
      current.items[itemIndex].quantity += normalizedQuantity;
    } else {
      current.items.push({ dishId: normalizedDishId, quantity: normalizedQuantity });
    }

    saveRawCart(req.userId, current);
    const cart = await serializeCart(current);

    res.json({
      message: 'Dish added to cart',
      cart
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can manage cart' });
    }

    const dishId = Number(req.params.dishId);
    const quantity = Number(req.body.quantity);

    if (!dishId || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const current = getRawCart(req.userId);
    const itemIndex = current.items.findIndex((item) => item.dishId === dishId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    current.items[itemIndex].quantity = quantity;
    saveRawCart(req.userId, current);

    res.json({
      message: 'Cart updated successfully',
      cart: await serializeCart(current)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can manage cart' });
    }

    const dishId = Number(req.params.dishId);
    const current = getRawCart(req.userId);
    const nextItems = current.items.filter((item) => item.dishId !== dishId);

    if (nextItems.length === current.items.length) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    current.items = nextItems;
    current.chefId = nextItems.length ? current.chefId : null;
    saveRawCart(req.userId, current);

    res.json({
      message: 'Item removed from cart',
      cart: await serializeCart(current)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can manage cart' });
    }

    userCartState.delete(req.userId);
    res.json({
      message: 'Cart cleared successfully',
      cart: await serializeCart({ chefId: null, items: [] })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.checkoutCart = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can checkout cart' });
    }

    const rawCart = getRawCart(req.userId);
    if (!rawCart.items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const { deliveryAddress, deliveryDate, notes } = req.body;
    const orders = await createOrdersForUser({
      userId: req.userId,
      items: rawCart.items,
      deliveryAddress,
      deliveryDate,
      notes
    });

    userCartState.delete(req.userId);

    res.status(201).json({
      message: 'Checkout completed successfully',
      orders,
      cart: await serializeCart({ chefId: null, items: [] })
    });
  } catch (error) {
    const statusCode = ['Cart is empty', 'Delivery address is required', 'Order items required', 'Invalid delivery date'].includes(error.message) ||
      error.message.includes('not available') ||
      error.message.includes('valid dishId')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
};
