const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordReset = sequelize.define('PasswordReset', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  token: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'password_resets',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['token'], unique: true },
    { fields: ['expires_at'] }
  ]
});

module.exports = PasswordReset;

