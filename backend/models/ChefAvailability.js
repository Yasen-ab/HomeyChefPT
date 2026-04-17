const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChefAvailability = sequelize.define('ChefAvailability', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chefId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('slot', 'holiday'),
    allowNull: false,
    defaultValue: 'slot'
  },
  dayOfWeek: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 6
    }
  },
  startTime: {
    type: DataTypes.STRING,
    allowNull: true
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'chef_availability'
});

module.exports = ChefAvailability;
