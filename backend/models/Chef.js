// Chef model
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chef = sequelize.define('Chef', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialties: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'default-chef.jpg'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5
    }
  },
  responseTime: {
    type: DataTypes.INTEGER, // بالدقائق
    defaultValue: 30
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'approved'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'chefs'
});

module.exports = Chef;

