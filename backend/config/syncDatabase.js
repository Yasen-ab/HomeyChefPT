// Script to sync database with models
const sequelize = require('./database');
const User = require('../models/User');
const Chef = require('../models/Chef');
const Dish = require('../models/Dish');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Review = require('../models/Review');
const bcrypt = require('bcryptjs');

// Define relationships
const setupRelationships = () => {
  // User relationships
  User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
  User.hasMany(Review, { foreignKey: 'userId', onDelete: 'CASCADE' });
  
  // Chef relationships
  Chef.hasMany(Dish, { foreignKey: 'chefId', onDelete: 'CASCADE' });
  Chef.hasMany(Order, { foreignKey: 'chefId', onDelete: 'SET NULL' });
  
  // Dish relationships
  Dish.belongsTo(Chef, { foreignKey: 'chefId' });
  Dish.hasMany(OrderItem, { foreignKey: 'dishId', onDelete: 'CASCADE' });
  Dish.hasMany(Review, { foreignKey: 'dishId', onDelete: 'CASCADE' });
  
  // Order relationships
  Order.belongsTo(User, { foreignKey: 'userId' });
  Order.belongsTo(Chef, { foreignKey: 'chefId' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId', onDelete: 'CASCADE' });
  
  // OrderItem relationships
  OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
  OrderItem.belongsTo(Dish, { foreignKey: 'dishId' });
  
  // Review relationships
  Review.belongsTo(User, { foreignKey: 'userId' });
  Review.belongsTo(Dish, { foreignKey: 'dishId' });
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

