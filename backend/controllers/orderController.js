// Order management controller
const { Op } = require('sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Dish = require('../models/Dish');
const User = require('../models/User');
const Chef = require('../models/Chef');
const { createNotification } = require('../services/notificationService');

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

    if (req.query.status) {
      if (req.query.status === 'in-progress') {
        where.status = { [Op.in]: ['preparing', 'on_the_way'] };
      } else {
        const values = req.query.status.split(',').map((value) => value.trim()).filter(Boolean);
        if (values.length > 0) {
          where.status = values.length === 1 ? values[0] : { [Op.in]: values };
        }
      }
    }

    const orders = await Order.findAll({
      where,
      include: [
        { model: User, attributes: ['name', 'email'] },
        { model: Chef, attributes: ['name', 'id'] },
        { 
          model: OrderItem, 
          include: [{ model: Dish, attributes: ['name', 'price', 'image'] }] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const payload = orders.map((order) => {
      const data = order.toJSON();
      const items = data.OrderItems || data.orderItems || [];
      const dishNames = items
        .map((item) => item.Dish?.name)
        .filter(Boolean);
      const dishImage = items.find((item) => item.Dish?.image)?.Dish?.image || null;
      return {
        ...data,
        dishName: dishNames.join(', '),
        dishImage
      };
    });

    res.json(payload);
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

    const data = order.toJSON();
    const items = data.OrderItems || data.orderItems || [];
    const dishNames = items
      .map((item) => item.Dish?.name)
      .filter(Boolean);
    const dishImage = items.find((item) => item.Dish?.image)?.Dish?.image || null;

    res.json({
      ...data,
      dishName: dishNames.join(', '),
      dishImage
    });
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

      await createNotification({
        userId: req.userId,
        orderId: order.id,
        type: 'order_confirmed',
        title: 'Order confirmed',
        body: `Your order #${order.orderNumber} has been placed successfully.`
      });

      await createNotification({
        chefId: order.chefId,
        orderId: order.id,
        type: 'new_order',
        title: 'New order received',
        body: `You received a new order #${order.orderNumber}.`
      });
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

    await createNotification({
      userId: order.userId,
      chefId: null,
      orderId: order.id,
      type: 'order_status_updated',
      title: 'Order status updated',
      body: `Order #${order.orderNumber} is now ${status}.`
    });

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel order (User or Chef)
exports.cancelOrder = async (req, res) => {
  try {
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can cancel orders' });
    }

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

    const allowedStatuses = ['pending', 'confirmed'];
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    await order.update({ status: 'cancelled', cancelledAt: new Date() });
    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

