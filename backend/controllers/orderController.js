// Order management controller
const { Op } = require('sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Dish = require('../models/Dish');
const User = require('../models/User');
const Chef = require('../models/Chef');

// Get all orders (Admin or Chef can see their orders)
exports.getAllOrders = async (req, res) => {
  try {
    let where = {};
    
    // Chefs can only see their own orders
    if (req.userType === 'chef') {
      where.chefId = req.userId;
    }
    
    // Users can only see their own orders
    if (req.role === 'user') {
      where.userId = req.userId;
    }

    const orders = await Order.findAll({
      where,
      include: [
        { model: User, attributes: ['name', 'email'] },
        { model: Chef, attributes: ['name', 'id'] },
        { 
          model: OrderItem, 
          include: [{ model: Dish, attributes: ['name', 'price'] }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ['name', 'email', 'phone', 'address'] },
        { model: Chef, attributes: ['name', 'id', 'phone'] },
        { 
          model: OrderItem, 
          include: [{ model: Dish, attributes: ['name', 'price', 'image'] }] 
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access permissions
    if (req.userType === 'chef' && order.chefId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (req.role === 'user' && order.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create order (Users)
exports.createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, deliveryDate, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order items required' });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of items) {
      const dish = await Dish.findByPk(item.dishId);
      if (!dish || !dish.isAvailable) {
        return res.status(400).json({ error: `Dish ${item.dishId} not available` });
      }

      const subtotal = dish.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        dishId: dish.id,
        quantity: item.quantity,
        price: dish.price,
        subtotal
      });
    }

    // Group items by chef
    const chefGroups = {};
    for (const item of items) {
      const dish = await Dish.findByPk(item.dishId);
      if (!chefGroups[dish.chefId]) {
        chefGroups[dish.chefId] = [];
      }
      chefGroups[dish.chefId].push({
        dishId: dish.id,
        quantity: item.quantity,
        price: dish.price,
        subtotal: dish.price * item.quantity
      });
    }

    // Create separate orders for each chef
    const createdOrders = [];
    
    for (const chefId in chefGroups) {
      const chefItems = chefGroups[chefId];
      const chefTotal = chefItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
      
      const order = await Order.create({
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: req.userId,
        chefId: parseInt(chefId),
        status: 'pending',
        totalAmount: chefTotal,
        deliveryAddress,
        deliveryDate,
        notes
      });

      // Create order items
      for (const item of chefItems) {
        await OrderItem.create({
          orderId: order.id,
          dishId: item.dishId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        });
      }

      createdOrders.push(order);
    }

    res.status(201).json({ message: 'Order created successfully', orders: createdOrders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update order status (Chef or Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Chef can only update their own orders
    if (req.userType === 'chef' && order.chefId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await order.update({ status });
    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel order (User or Chef)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // User can only cancel their own orders
    if (req.role === 'user' && order.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Chef can only cancel their own orders
    if (req.userType === 'chef' && order.chefId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await order.update({ status: 'cancelled' });
    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

