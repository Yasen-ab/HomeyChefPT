// Script to sync database with models
const sequelize = require('./database');
const User = require('../models/User');
const Chef = require('../models/Chef');
const Dish = require('../models/Dish');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Notification = require('../models/Notification');
const PasswordReset = require('../models/PasswordReset');
const ChefAvailability = require('../models/ChefAvailability');
const bcrypt = require('bcryptjs');

// Define relationships
const setupRelationships = () => {
  // User relationships
  User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
  User.hasMany(Review, { foreignKey: 'userId', onDelete: 'CASCADE', as: 'reviews' });
  User.hasMany(Favorite, { foreignKey: 'userId', onDelete: 'CASCADE' });
  User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
  User.hasMany(PasswordReset, { foreignKey: 'userId', onDelete: 'CASCADE' });

  // Chef relationships
  Chef.hasMany(Dish, { foreignKey: 'chefId', onDelete: 'CASCADE', as: 'dishes' });
  Chef.hasMany(Order, { foreignKey: 'chefId', onDelete: 'SET NULL' });
  Chef.hasMany(Notification, { foreignKey: 'chefId', onDelete: 'CASCADE' });
  Chef.hasMany(ChefAvailability, { foreignKey: 'chefId', onDelete: 'CASCADE', as: 'availabilities' });

  // Chef availability relationships
  ChefAvailability.belongsTo(Chef, { foreignKey: 'chefId', as: 'chef' });

  // Dish relationships
  Dish.belongsTo(Chef, { foreignKey: 'chefId', as: 'Chef' });
  Dish.hasMany(OrderItem, { foreignKey: 'dishId', onDelete: 'CASCADE' });
  Dish.hasMany(Review, { foreignKey: 'dishId', onDelete: 'CASCADE', as: 'reviews' });
  Dish.hasMany(Favorite, { foreignKey: 'dishId', onDelete: 'CASCADE' });

  // Order relationships
  Order.belongsTo(User, { foreignKey: 'userId' });
  Order.belongsTo(Chef, { foreignKey: 'chefId' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId', onDelete: 'CASCADE' });
  Order.hasMany(Notification, { foreignKey: 'orderId', onDelete: 'CASCADE' });

  // OrderItem relationships
  OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
  OrderItem.belongsTo(Dish, { foreignKey: 'dishId' });

  // Review relationships
  Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Review.belongsTo(Dish, { foreignKey: 'dishId', as: 'dish' });

  // Favorite relationships
  Favorite.belongsTo(User, { foreignKey: 'userId' });
  Favorite.belongsTo(Dish, { foreignKey: 'dishId' });

  // Notification relationships
  Notification.belongsTo(User, { foreignKey: 'userId' });
  Notification.belongsTo(Chef, { foreignKey: 'chefId' });
  Notification.belongsTo(Order, { foreignKey: 'orderId' });

  // Password reset relationships
  PasswordReset.belongsTo(User, { foreignKey: 'userId' });
};

// Sync database and create default admin
const syncDatabase = async () => {
  try {
    // Create/Update relationships
    setupRelationships();
    
    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables synced successfully');
    
    // Create default admin if doesn't exist
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin User',
        email: 'admin@homeychef.com',
        password: hashedPassword,
        role: 'admin',
        phone: '1234567890',
        address: 'Admin Address'
      });
      console.log('✅ Default admin created (email: admin@homeychef.com, password: admin123)');
    }
    
    console.log('✅ Database setup complete!');
    return true;
  } catch (error) {
    console.error('❌ Database sync error:', error);
    throw error;
  }
};

module.exports = { syncDatabase, setupRelationships };

