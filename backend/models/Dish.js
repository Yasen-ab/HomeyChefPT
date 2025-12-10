// Dish model
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Dish = sequelize.define('Dish', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ingredients: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  chefId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'chefs',
      key: 'id'
    }
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  preparationTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time in minutes'
  }
}, {
  timestamps: true,
  tableName: 'dishes'
});

Dish.associate = function(models) {
  Dish.belongsTo(models.Chef, { foreignKey: 'chefId', as: 'Chef' });
  Dish.hasMany(models.Review, { foreignKey: 'dishId', as: 'reviews' });
  Dish.hasMany(models.OrderItem, { foreignKey: 'dishId' });
};


module.exports = Dish;

