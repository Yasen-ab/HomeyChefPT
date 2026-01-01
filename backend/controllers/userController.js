// User management controller
const User = require('../models/User');
const Order = require('../models/Order');

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single user
exports.getUserById = async (req, res) => {
  try {
    // Users can only access their own profile, admin can access any
    if (req.role !== 'admin' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user (own profile or admin)
exports.updateUser = async (req, res) => {
  try {
    // Users can only update their own profile, admin can update any
    if (req.role !== 'admin' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, phone, address, email, role, isActive } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update payload. Admins can update email/role/isActive, regular users only their own basic fields.
    const updateData = { name, phone, address };
    if (req.role === 'admin') {
      if (typeof email !== 'undefined') updateData.email = email;
      if (typeof role !== 'undefined') updateData.role = role;
      if (typeof isActive !== 'undefined') updateData.isActive = isActive;
    }

    await user.update(updateData);
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Patch user status (activate/deactivate) - Admin only
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = !!isActive;
    await user.save();

    res.json({ message: 'User status updated', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    // Users can only access their own orders, admin can access any
    if (req.role !== 'admin' && req.userId.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await Order.findAll({
      where: { userId: req.params.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

