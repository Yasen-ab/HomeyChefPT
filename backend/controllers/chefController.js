// Chef management controller
const sequelize = require('../config/database');
const Chef = require('../models/Chef');
const ChefAvailability = require('../models/ChefAvailability');
const Dish = require('../models/Dish');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { Op } = require('sequelize');
const OrderItem = require('../models/OrderItem');
const { createNotification } = require('../services/notificationService');
const { ACTIVE_STATUS, applyAccountStatus } = require('../utils/accountStatus');
const CHEF_APPROVAL_PENDING = 'pending';
const CHEF_APPROVAL_APPROVED = 'approved';
const CHEF_APPROVAL_REJECTED = 'rejected';

function normalizeChefApprovalStatus(chef) {
  return chef?.approvalStatus || CHEF_APPROVAL_APPROVED;
}

function isChefApproved(chef) {
  return normalizeChefApprovalStatus(chef) === CHEF_APPROVAL_APPROVED;
}

function isChefVisibleToCustomers(chef) {
  return Boolean(chef?.isActive) && isChefApproved(chef);
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateOnly(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function isValidTime(value) {
  return typeof value === 'string' && TIME_REGEX.test(value);
}

function isValidAvailabilityPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!['slot', 'holiday'].includes(payload.type)) return false;
  if (payload.type === 'slot') {
    const dayStart = Number(payload.dayOfWeekStart ?? payload.dayOfWeek);
    const dayEnd = Number(payload.dayOfWeekEnd ?? payload.dayOfWeek);
    if (!Number.isInteger(dayStart) || dayStart < 0 || dayStart > 6) return false;
    if (!Number.isInteger(dayEnd) || dayEnd < 0 || dayEnd > 6) return false;
    if (dayStart > dayEnd) return false;
    return isValidTime(payload.startTime) && isValidTime(payload.endTime) && payload.startTime < payload.endTime;
  }
  if (payload.type === 'holiday') {
    return DATE_REGEX.test(payload.date);
  }
  return false;
}

function serializeAvailability(slot) {
  return {
    id: slot.id,
    type: slot.type,
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    date: slot.date,
    description: slot.description,
    createdAt: slot.createdAt,
    updatedAt: slot.updatedAt
  };
}

function hasAnySlotRules(availability) {
  return availability.some((item) => item.type === 'slot');
}

function getSlotsForDay(availability, dayOfWeek) {
  return availability.filter((item) => item.type === 'slot' && item.dayOfWeek === dayOfWeek);
}

function isChefAvailableAt(availability, requestedDate, allowFutureToday = true) {
  if (!requestedDate) {
    requestedDate = new Date();
  }

  const dateOnly = normalizeDateOnly(requestedDate);
  if (!dateOnly) return false;

  if (availability.some((item) => item.type === 'holiday' && item.date === dateOnly)) {
    return false;
  }

  const dayOfWeek = requestedDate.getDay();
  const slots = getSlotsForDay(availability, dayOfWeek);

  if (!slots.length) {
    return !hasAnySlotRules(availability);
  }

  const isToday = dateOnly === normalizeDateOnly(new Date());
  if (!isToday) {
    return true;
  }

  const currentTime = requestedDate.toTimeString().slice(0, 5);
  if (allowFutureToday) {
    return slots.some((slot) => slot.endTime >= currentTime);
  }
  return slots.some((slot) => slot.startTime <= currentTime && slot.endTime >= currentTime);
}

function buildAvailabilityResponse(availability) {
  return {
    isAvailable: isChefAvailableAt(availability, new Date()),
    slots: availability.filter((item) => item.type === 'slot').map(serializeAvailability),
    disabledDays: availability.filter((item) => item.type === 'holiday').map(serializeAvailability)
  };
}

function serializeChefForAdmin(chef) {
  const approvalStatus = normalizeChefApprovalStatus(chef);

  return {
    id: chef.id,
    name: chef.name,
    email: chef.email,
    phone: chef.phone,
    address: chef.address,
    bio: chef.bio,
    specialties: chef.specialties,
    profileImage: chef.profileImage,
    location: chef.location,
    rating: chef.rating,
    responseTime: chef.responseTime,
    isActive: chef.isActive,
    approvalStatus,
    status: approvalStatus,
    createdAt: chef.createdAt,
    updatedAt: chef.updatedAt
  };
}

// Get all chefs
exports.getAllChefs = async (req, res) => {
  try {
    const chefs = await Chef.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { approvalStatus: CHEF_APPROVAL_APPROVED },
          { approvalStatus: null }
        ]
      },
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
    const chefId = Number(req.params.id || req.params.chefId);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 50);
    const offset = (page - 1) * limit;

    const chef = await Chef.findByPk(chefId);
    if (!chef || !isChefVisibleToCustomers(chef)) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    const [reviewStats] = await Review.findAll({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('AVG', sequelize.col('Review.rating')), 0), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('Review.id')), 'reviewCount']
      ],
      include: [
        {
          model: Dish,
          as: 'dish',
          attributes: [],
          where: { chefId }
        }
      ],
      raw: true
    });

    const { rows: dishes, count: totalDishes } = await Dish.findAndCountAll({
      where: { chefId },
      attributes: ['id', 'name', 'price', 'image', 'isAvailable'],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    const avgRatingFromReviews = Number(reviewStats?.avgRating || 0);
    const reviewCount = Number(reviewStats?.reviewCount || 0);

    const availabilityRules = await ChefAvailability.findAll({
      where: { chefId }
    });

    const chefPayload = {
      id: chef.id,
      name: chef.name,
      bio: chef.bio,
      avatarUrl: chef.profileImage ? (chef.profileImage.startsWith('/uploads') ? chef.profileImage : `/uploads/${chef.profileImage}`) : null,
      rating: {
        avgRating: avgRatingFromReviews > 0 ? avgRatingFromReviews : Number(chef.rating || 0),
        reviewCount
      },
      availability: {
        isAvailable: Boolean(chef.isActive) && isChefApproved(chef) && isChefAvailableAt(availabilityRules, new Date()),
        slots: availabilityRules.filter((item) => item.type === 'slot').map(serializeAvailability),
        disabledDays: availabilityRules.filter((item) => item.type === 'holiday').map(serializeAvailability)
      }
    };

    const payload = {
      ...chefPayload,
      chef: chefPayload,
      dishes: dishes.map((dish) => ({
        id: dish.id,
        name: dish.name,
        price: dish.price,
        thumbnail: dish.image,
        isAvailable: dish.isAvailable
      })),
      pagination: {
        page,
        limit,
        total: totalDishes,
        totalPages: Math.ceil(totalDishes / limit)
      }
    };

    res.json(payload);
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

exports.deactivateChef = async (req, res) => {
  try {
    const chef = await Chef.findByPk(req.params.id);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    applyAccountStatus(chef, 'inactive');
    await chef.save();

    res.json({ message: 'Chef deactivated successfully', chef });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reactivateChef = async (req, res) => {
  try {
    const chef = await Chef.findByPk(req.params.id);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    if (!isChefApproved(chef)) {
      return res.status(400).json({ error: 'Only approved chefs can be reactivated' });
    }

    applyAccountStatus(chef, ACTIVE_STATUS);
    await chef.save();

    res.json({ message: 'Chef reactivated successfully', chef });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminChefs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim().toLowerCase();
    const sort = (req.query.sort || 'newest').trim().toLowerCase();
    const where = {};
    const filters = [];

    if (search) {
      filters.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { specialties: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    if ([CHEF_APPROVAL_PENDING, CHEF_APPROVAL_APPROVED, CHEF_APPROVAL_REJECTED].includes(status)) {
      if (status === CHEF_APPROVAL_APPROVED) {
        filters.push({
          [Op.or]: [
            { approvalStatus: CHEF_APPROVAL_APPROVED },
            { approvalStatus: null }
          ]
        });
      } else {
        where.approvalStatus = status;
      }
    } else if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (filters.length) {
      where[Op.and] = filters;
    }

    let order = [['createdAt', 'DESC']];
    if (sort === 'oldest') {
      order = [['createdAt', 'ASC']];
    } else if (sort === 'name') {
      order = [['name', 'ASC']];
    }

    const [{ rows, count }, totalChefs, activeChefs, pendingChefs] = await Promise.all([
      Chef.findAndCountAll({
        where,
        order,
        limit,
        offset
      }),
      Chef.count(),
      Chef.count({ where: { isActive: true } }),
      Chef.count({ where: { approvalStatus: CHEF_APPROVAL_PENDING } })
    ]);

    res.json({
      chefs: rows.map(serializeChefForAdmin),
      totalCount: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      summary: {
        totalChefs,
        activeChefs,
        pendingChefs
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAdminChefById = async (req, res) => {
  try {
    const chef = await Chef.findByPk(req.params.id);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    const [dishesCount, ordersCount] = await Promise.all([
      Dish.count({ where: { chefId: chef.id } }),
      Order.count({ where: { chefId: chef.id } })
    ]);

    res.json({
      ...serializeChefForAdmin(chef),
      dishesCount,
      ordersCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reviewChefRegistration = async (req, res) => {
  try {
    const requestedDecision = (req.body.decision || req.body.status || '').trim().toLowerCase();

    if (!['approve', 'approved', 'reject', 'rejected'].includes(requestedDecision)) {
      return res.status(400).json({ error: 'Decision must be approve or reject' });
    }

    const chef = await Chef.findByPk(req.params.id);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    const isApproval = requestedDecision.startsWith('approve');
    chef.approvalStatus = isApproval ? CHEF_APPROVAL_APPROVED : CHEF_APPROVAL_REJECTED;
    chef.isActive = isApproval;
    await chef.save();

    await createNotification({
      chefId: chef.id,
      type: isApproval ? 'chef_registration_approved' : 'chef_registration_rejected',
      title: isApproval ? 'Chef registration approved' : 'Chef registration rejected',
      body: isApproval
        ? 'Your chef account has been approved. You can now log in and start using HomeyChef.'
        : 'Your chef registration was rejected by the admin team.'
    });

    res.json({
      message: isApproval ? 'Chef approved successfully' : 'Chef rejected successfully',
      chef: serializeChefForAdmin(chef)
    });
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

// Get own chef profile (Chef only)
exports.getChefProfile = async (req, res) => {
  try {
    if (req.userType !== 'chef') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chef = await Chef.findByPk(req.userId);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    const availabilityRules = await ChefAvailability.findAll({
      where: { chefId: chef.id }
    });

    res.json({
      chef: {
        id: chef.id,
        name: chef.name,
        email: chef.email,
        phone: chef.phone,
        bio: chef.bio,
        profileImage: chef.profileImage,
        availability: buildAvailabilityResponse(availabilityRules)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChefAvailability = async (req, res) => {
  try {
    if (req.userType !== 'chef') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const availabilityRules = await ChefAvailability.findAll({
      where: { chefId: req.userId },
      order: [['type', 'ASC'], ['dayOfWeek', 'ASC'], ['startTime', 'ASC'], ['date', 'ASC']]
    });

    res.json({
      availability: buildAvailabilityResponse(availabilityRules)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getChefAvailabilityById = async (req, res) => {
  try {
    const chefId = Number(req.params.id);
    const chef = await Chef.findByPk(chefId);

    if (!chef || !isChefVisibleToCustomers(chef)) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    const availabilityRules = await ChefAvailability.findAll({
      where: { chefId },
      order: [['type', 'ASC'], ['dayOfWeek', 'ASC'], ['startTime', 'ASC'], ['date', 'ASC']]
    });

    res.json({
      availability: buildAvailabilityResponse(availabilityRules)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createChefAvailability = async (req, res) => {
  try {
    if (req.userType !== 'chef') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const payload = req.body;
    if (!isValidAvailabilityPayload(payload)) {
      return res.status(400).json({ error: 'Invalid availability payload' });
    }

    if (payload.type === 'slot') {
      const startDay = Number(payload.dayOfWeekStart ?? payload.dayOfWeek);
      const endDay = Number(payload.dayOfWeekEnd ?? payload.dayOfWeek);
      const slots = [];

      for (let day = startDay; day <= endDay; day += 1) {
        slots.push({
          chefId: req.userId,
          type: 'slot',
          dayOfWeek: day,
          startTime: payload.startTime,
          endTime: payload.endTime,
          description: payload.description ? String(payload.description).trim() : null
        });
      }

      const createdAvailability = await ChefAvailability.bulkCreate(slots);
      res.status(201).json({
        message: 'Availability slots created successfully',
        availability: createdAvailability.map(serializeAvailability)
      });
      return;
    }

    const newAvailability = await ChefAvailability.create({
      chefId: req.userId,
      type: payload.type,
      dayOfWeek: null,
      startTime: null,
      endTime: null,
      date: payload.type === 'holiday' ? payload.date : null,
      description: payload.description ? String(payload.description).trim() : null
    });

    res.status(201).json({
      message: 'Availability record created successfully',
      availability: serializeAvailability(newAvailability)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateChefAvailability = async (req, res) => {
  try {
    if (req.userType !== 'chef') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const slotId = Number(req.params.slotId);
    const availability = await ChefAvailability.findByPk(slotId);
    if (!availability || availability.chefId !== req.userId) {
      return res.status(404).json({ error: 'Availability record not found' });
    }

    const payload = req.body;
    if (!isValidAvailabilityPayload(payload)) {
      return res.status(400).json({ error: 'Invalid availability payload' });
    }

    await availability.update({
      type: payload.type,
      dayOfWeek: payload.type === 'slot' ? Number(payload.dayOfWeek) : null,
      startTime: payload.type === 'slot' ? payload.startTime : null,
      endTime: payload.type === 'slot' ? payload.endTime : null,
      date: payload.type === 'holiday' ? payload.date : null,
      description: payload.description ? String(payload.description).trim() : null
    });

    res.json({
      message: 'Availability record updated successfully',
      availability: serializeAvailability(availability)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteChefAvailability = async (req, res) => {
  try {
    if (req.userType !== 'chef') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const slotId = Number(req.params.slotId);
    const availability = await ChefAvailability.findByPk(slotId);
    if (!availability || availability.chefId !== req.userId) {
      return res.status(404).json({ error: 'Availability record not found' });
    }

    await availability.destroy();
    res.json({ message: 'Availability record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update own chef profile (Chef only)
exports.updateChefProfile = async (req, res) => {
  try {
    if (req.userType !== 'chef') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chef = await Chef.findByPk(req.userId);
    if (!chef) {
      return res.status(404).json({ error: 'Chef not found' });
    }

    const fullName = (req.body.fullName || req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const phone = (req.body.phone || '').trim();
    const bio = (req.body.bio || '').trim();

    if (!fullName) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const existingEmail = await Chef.findOne({
      where: {
        email,
        id: { [Op.ne]: chef.id }
      }
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const updateData = {
      name: fullName,
      email,
      phone,
      bio
    };

    if (req.file) {
      updateData.profileImage = `/uploads/${req.file.filename}`;
    }

    await chef.update(updateData);

    res.json({
      message: 'Profile updated successfully',
      chef: {
        id: chef.id,
        name: chef.name,
        email: chef.email,
        phone: chef.phone,
        bio: chef.bio,
        profileImage: chef.profileImage
      }
    });
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
      include: [
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

