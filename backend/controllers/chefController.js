// Chef management controller
const sequelize = require('../config/database');
const Chef = require('../models/Chef');
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
        isAvailable: Boolean(chef.isActive),
        openHours: null
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

    res.json({
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

