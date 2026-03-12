// Sales statistics controller
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Dish = require('../models/Dish');
const Chef = require('../models/Chef');

const ALLOWED_RANGES = new Set(['today', 'week', 'month', 'year', 'all']);

function getRangeDates(range) {
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (range) {
    case 'all':
      return { startDate: null, endDate: null };
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      break;
  }

  return { startDate, endDate };
}

function getGroupKey(range) {
  if (range === 'year' || range === 'all') {
    return sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m');
  }
  return sequelize.fn('DATE', sequelize.col('createdAt'));
}

exports.getStatistics = async (req, res) => {
  try {
    const range = String(req.query.range || 'all').toLowerCase();
    if (!ALLOWED_RANGES.has(range)) {
      return res.status(400).json({ error: 'Invalid range. Use today, week, month, year, or all.' });
    }

    const { startDate, endDate } = getRangeDates(range);
    const baseWhere = {};
    if (startDate && endDate) {
      baseWhere.createdAt = { [Op.between]: [startDate, endDate] };
    }

    // Chefs can only see their own statistics
    if (req.userType === 'chef' && req.role !== 'admin') {
      baseWhere.chefId = req.userId;
    }

    const nonCancelledWhere = { ...baseWhere, status: { [Op.ne]: 'cancelled' } };
    const deliveredWhere = { ...baseWhere, status: 'delivered' };

    const groupKey = getGroupKey(range);

    const [
      totalOrders,
      completedOrders,
      totalRevenueRaw,
      salesByDateRaw,
      topDishesRaw,
      ordersPerChefRaw
    ] = await Promise.all([
      Order.count({ where: nonCancelledWhere }),
      Order.count({ where: deliveredWhere }),
      Order.sum('totalAmount', { where: nonCancelledWhere }),
      Order.findAll({
        attributes: [
          [groupKey, 'date'],
          [sequelize.fn('COUNT', sequelize.col('Order.id')), 'total_orders'],
          [sequelize.fn('SUM', sequelize.col('Order.totalAmount')), 'total_revenue']
        ],
        where: nonCancelledWhere,
        group: [groupKey],
        order: [[sequelize.literal('date'), 'ASC']],
        raw: true
      }),
      OrderItem.findAll({
        attributes: [
          [sequelize.col('Dish.id'), 'dish_id'],
          [sequelize.col('Dish.name'), 'dish_name'],
          [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'quantity'],
          [sequelize.fn('SUM', sequelize.col('OrderItem.subtotal')), 'revenue']
        ],
        include: [
          { model: Dish, attributes: [] },
          { model: Order, attributes: [], where: nonCancelledWhere }
        ],
        group: ['Dish.id', 'Dish.name'],
        order: [[sequelize.literal('quantity'), 'DESC']],
        limit: 5,
        raw: true
      }),
      Order.findAll({
        attributes: [
          'chefId',
          [sequelize.fn('COUNT', sequelize.col('Order.id')), 'total_orders'],
          [sequelize.fn('SUM', sequelize.col('Order.totalAmount')), 'total_revenue']
        ],
        include: [{ model: Chef, attributes: ['name'] }],
        where: { ...nonCancelledWhere, chefId: { [Op.not]: null } },
        group: ['chefId', 'Chef.id', 'Chef.name'],
        order: [[sequelize.literal('total_orders'), 'DESC']],
        raw: true
      })
    ]);

    const totalRevenue = Number(totalRevenueRaw || 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const salesByDate = salesByDateRaw.map((row) => ({
      date: row.date,
      total_orders: Number(row.total_orders || 0),
      total_revenue: Number(row.total_revenue || 0)
    }));

    const topDishes = topDishesRaw.map((row) => ({
      dish_id: row.dish_id,
      dish_name: row.dish_name,
      quantity: Number(row.quantity || 0),
      revenue: Number(row.revenue || 0)
    }));

    const ordersPerChef = ordersPerChefRaw.map((row) => ({
      chef_id: row.chefId,
      chef_name: row['Chef.name'],
      total_orders: Number(row.total_orders || 0),
      total_revenue: Number(row.total_revenue || 0)
    }));

    res.json({
      range,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      completed_orders: completedOrders,
      average_order_value: averageOrderValue,
      sales_by_date: salesByDate,
      top_dishes: topDishes,
      orders_per_chef: ordersPerChef
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
