const { Op } = require('sequelize');
const Notification = require('../models/Notification');
const Order = require('../models/Order');

function buildNotificationScope(req) {
  if (req.userType === 'chef') {
    return { chefId: req.userId };
  }
  return { userId: req.userId };
}

exports.getNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const scope = buildNotificationScope(req);

    const where = { ...scope };

    if (req.query.unread === 'true') {
      where.read = false;
    }

    if (req.query.filter === 'order-status') {
      where.type = {
        [Op.in]: ['order_confirmed', 'order_status_updated']
      };
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      include: [{ model: Order, attributes: ['id', 'orderNumber', 'status'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      notifications: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const scope = buildNotificationScope(req);
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        ...scope
      }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.update({ read: true });
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
