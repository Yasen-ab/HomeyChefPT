// Sales statistics controller
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const User = require('../models/User');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Dish = require('../models/Dish');
const Chef = require('../models/Chef');

const ALLOWED_RANGES = new Set(['today', 'week', 'month', 'year', 'all']);
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'on_the_way', 'ready', 'delivered', 'cancelled'];

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

function getDateRangeFilter(startDateValue, endDateValue) {
  const createdAt = {};

  if (startDateValue) {
    const startDate = new Date(startDateValue);
    if (Number.isNaN(startDate.getTime())) {
      return { error: 'Invalid startDate' };
    }
    startDate.setHours(0, 0, 0, 0);
    createdAt[Op.gte] = startDate;
  }

  if (endDateValue) {
    const endDate = new Date(endDateValue);
    if (Number.isNaN(endDate.getTime())) {
      return { error: 'Invalid endDate' };
    }
    endDate.setHours(23, 59, 59, 999);
    createdAt[Op.lte] = endDate;
  }

  if (createdAt[Op.gte] && createdAt[Op.lte] && createdAt[Op.gte] > createdAt[Op.lte]) {
    return { error: 'startDate cannot be after endDate' };
  }

  return Reflect.ownKeys(createdAt).length > 0 ? { createdAt } : {};
}

function buildStatusCounts(rows) {
  const counts = ORDER_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  rows.forEach((row) => {
    counts[row.status] = Number(row.count || 0);
  });

  return counts;
}

function buildChefStatusBreakdown(statusCounts) {
  return {
    pending:
      Number(statusCounts.pending || 0) +
      Number(statusCounts.confirmed || 0) +
      Number(statusCounts.preparing || 0) +
      Number(statusCounts.on_the_way || 0) +
      Number(statusCounts.ready || 0),
    completed: Number(statusCounts.delivered || 0),
    cancelled: Number(statusCounts.cancelled || 0)
  };
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

exports.getChefStatistics = async (req, res) => {
  try {
    const dateFilter = getDateRangeFilter(req.query.startDate, req.query.endDate);
    if (dateFilter.error) {
      return res.status(400).json({ error: dateFilter.error });
    }

    const where = {
      chefId: req.userId,
      ...dateFilter
    };

    const [totalOrders, totalRevenueRaw, topDishesRaw, statusRows] = await Promise.all([
      Order.count({ where }),
      Order.sum('totalAmount', {
        where: { ...where, status: 'delivered' }
      }),
      OrderItem.findAll({
        attributes: [
          [sequelize.col('Dish.id'), 'dish_id'],
          [sequelize.col('Dish.name'), 'dish_name'],
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('Order.id'))), 'order_count'],
          [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'quantity_sold'],
          [sequelize.fn('SUM', sequelize.col('OrderItem.subtotal')), 'revenue']
        ],
        include: [
          { model: Dish, attributes: [] },
          {
            model: Order,
            attributes: [],
            where: { ...where, status: { [Op.ne]: 'cancelled' } }
          }
        ],
        group: ['Dish.id', 'Dish.name'],
        order: [[sequelize.literal('order_count'), 'DESC'], [sequelize.literal('quantity_sold'), 'DESC']],
        limit: 5,
        raw: true
      }),
      Order.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('Order.id')), 'count']
        ],
        where,
        group: ['status'],
        raw: true
      })
    ]);

    const statusCounts = buildStatusCounts(statusRows);

    res.json({
      total_orders: totalOrders,
      total_revenue: Number(totalRevenueRaw || 0),
      top_dishes: topDishesRaw.map((row) => ({
        dish_id: row.dish_id,
        dish_name: row.dish_name,
        order_count: Number(row.order_count || 0),
        quantity_sold: Number(row.quantity_sold || 0),
        revenue: Number(row.revenue || 0)
      })),
      orders_breakdown: buildChefStatusBreakdown(statusCounts)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminStatistics = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalUsers, totalChefs, totalOrders, totalRevenueRaw, newUsersThisMonth, topChefsRaw, statusRows] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      Chef.count(),
      Order.count(),
      Order.sum('totalAmount', {
        where: { status: { [Op.ne]: 'cancelled' } }
      }),
      User.count({
        where: {
          role: 'user',
          createdAt: { [Op.gte]: startOfMonth }
        }
      }),
      Order.findAll({
        attributes: [
          'chefId',
          [sequelize.fn('COUNT', sequelize.col('Order.id')), 'total_orders'],
          [sequelize.fn('SUM', sequelize.col('Order.totalAmount')), 'total_revenue']
        ],
        include: [{ model: Chef, attributes: ['name'] }],
        where: {
          chefId: { [Op.not]: null },
          status: { [Op.ne]: 'cancelled' }
        },
        group: ['chefId', 'Chef.id', 'Chef.name'],
        order: [[sequelize.literal('total_orders'), 'DESC']],
        limit: 5,
        raw: true
      }),
      Order.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('Order.id')), 'count']
        ],
        group: ['status'],
        raw: true
      })
    ]);

    res.json({
      total_users: totalUsers,
      total_chefs: totalChefs,
      total_orders: totalOrders,
      total_revenue: Number(totalRevenueRaw || 0),
      new_users_this_month: newUsersThisMonth,
      top_chefs: topChefsRaw.map((row) => ({
        chef_id: row.chefId,
        chef_name: row['Chef.name'],
        total_orders: Number(row.total_orders || 0),
        total_revenue: Number(row.total_revenue || 0)
      })),
      orders_breakdown: buildStatusCounts(statusRows)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
