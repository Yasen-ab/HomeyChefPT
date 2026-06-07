// Database configuration using Sequelize ORM
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Create connection to MySQL database
const sequelize = new Sequelize(
  process.env.DB_NAME || 'homeychef',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000, //30 seconds
      idle: 10000    //10 seconds
      //idle: we use this to specify the maximum time, in milliseconds, that a connection can be idle before being released.
    }
  }
);

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection successful');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

module.exports = sequelize;

