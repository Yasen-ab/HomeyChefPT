// Order management controller
const { Op } = require('sequelize');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Dish = require('../models/Dish');
const User = require('../models/User');
const Chef = require('../models/Chef');
const ChefAvailability = require('../models/ChefAvailability');
const { createNotification } = require('../services/notificationService');

async function buildOrderPayload(items) {
  if (!items || items.length === 0) {
    throw new Error('Order items required');
  }

  const normalizedItems = [];

  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    if (!item.dishId || quantity < 1) {
      throw new Error('Each order item must include a valid dishId and quantity');
    }

    const dish = await Dish.findByPk(item.dishId, {
      include: [{ model: Chef, as: 'Chef', attributes: ['id', 'name'] }]
    });
    if (!dish || !dish.isAvailable) {
      throw new Error(`Dish ${item.dishId} not available`);
    }

    normalizedItems.push({
      dishId: dish.id,
      chefId: dish.chefId,
      chefName: dish.Chef?.name || `Chef ${dish.chefId}`,
      quantity,
      price: Number(dish.price),
      subtotal: Number(dish.price) * quantity
    });
  }

  return normalizedItems;
}

// Helper function to create orders for a user, grouped by chef
async function createOrdersForUser({ userId, items, deliveryAddress, deliveryDate = null, notes = null }) {
  if (!deliveryAddress || !String(deliveryAddress).trim()) {
    throw new Error('Delivery address is required');
  }

  const orderItems = await buildOrderPayload(items);
  const chefGroups = {};

  const requestedDate = deliveryDate ? new Date(String(deliveryDate).trim()) : new Date();
  if (isNaN(requestedDate.getTime())) {
    throw new Error('Invalid delivery date');
  }

  const chefIds = Array.from(new Set(orderItems.map((item) => item.chefId)));
  const chefAvailability = await ChefAvailability.findAll({
    where: { chefId: { [Op.in]: chefIds } }
  });

  const availabilityByChef = chefAvailability.reduce((acc, item) => {
    if (!acc[item.chefId]) acc[item.chefId] = [];
    acc[item.chefId].push(item);
    return acc;
  }, {});

  const isChefAvailable = (chefId, targetDate) => {
    const availabilityRules = availabilityByChef[chefId] || [];
    const normalizeDateOnly = (value) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const requestedDateOnly = normalizeDateOnly(targetDate);
    if (!requestedDateOnly) return false;

    const isHoliday = availabilityRules.some((rule) => rule.type === 'holiday' && (rule.specificDate || rule.date) === requestedDateOnly);
    if (isHoliday) return false;

    const specificDateRules = availabilityRules.filter((rule) => rule.type === 'specific_date' && (rule.specificDate || rule.date) === requestedDateOnly);
    const isToday = requestedDateOnly === normalizeDateOnly(new Date());
    if (specificDateRules.length > 0) {
      if (!isToday) {
        return specificDateRules.length > 0;
      }
      const currentTime = new Date().toTimeString().slice(0, 8);
      return specificDateRules.some((slot) => slot.endTime >= currentTime);
    }

    const dayOfWeek = new Date(targetDate).getDay();
    const slotsForDay = availabilityRules.filter((rule) => rule.type === 'weekly_slot' && rule.dayOfWeek === dayOfWeek);
    if (!slotsForDay.length) {
      return false;
    }

    if (!isToday) {
      return slotsForDay.length > 0;
    }

    const currentTime = new Date().toTimeString().slice(0, 8);
    return slotsForDay.some((slot) => slot.endTime >= currentTime);
  };

  for (const item of orderItems) {
    if (!chefGroups[item.chefId]) {
      chefGroups[item.chefId] = [];
    }
    chefGroups[item.chefId].push(item);
  }

  const createdOrders = [];

  for (const chefId of Object.keys(chefGroups)) {
    const chefItems = chefGroups[chefId];
    const chefName = chefItems[0]?.chefName || `Chef ${chefId}`;
    const requestedDateOnly = `${requestedDate.getFullYear()}-${String(requestedDate.getMonth() + 1).padStart(2, '0')}-${String(requestedDate.getDate()).padStart(2, '0')}`;

    if (!isChefAvailable(Number(chefId), requestedDate)) {
      throw new Error(`${chefName} is not available on ${requestedDateOnly}. Please choose a different date or contact the chef.`);
    }
    const chefTotal = chefItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

    const order = await Order.create({
      orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      userId,
      chefId: Number(chefId),
      status: 'pending',
      totalAmount: chefTotal,
      deliveryAddress: String(deliveryAddress).trim(),
      deliveryDate,
      notes
    });

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
      userId,
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

  return createdOrders;
}

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
    if (req.role !== 'user') {
      return res.status(403).json({ error: 'Only users can place orders' });
    }

    const { items, deliveryAddress, deliveryDate, notes } = req.body;
    const createdOrders = await createOrdersForUser({
      userId: req.userId,
      items,
      deliveryAddress,
      deliveryDate,
      notes
    });

    res.status(201).json({ message: 'Order created successfully', orders: createdOrders });
  } catch (error) {
    const statusCode = ['Order items required', 'Delivery address is required'].includes(error.message) ||
      error.message.includes('not available') ||
      error.message.includes('valid dishId')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
};

exports.createOrdersForUser = createOrdersForUser;

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

