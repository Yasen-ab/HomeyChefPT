// Authentication middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chef = require('../models/Chef');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to request
    req.userId = decoded.userId;
    req.role = decoded.role;
    req.userType = decoded.userType;
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

// Check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    if (req.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

// Check if user is chef
const isChef = async (req, res, next) => {
  try {
    if (req.userType === 'chef') {
      next();
    } else {
      return res.status(403).json({ error: 'Access denied. Chef privileges required.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

// Check if user is chef or admin
const isChefOrAdmin = async (req, res, next) => {
  try {
    if (req.role === 'admin' || req.userType === 'chef') {
      next();
    } else {
      return res.status(403).json({ error: 'Access denied.' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authorization error' });
  }
};

module.exports = { authenticate, isAdmin, isChef, isChefOrAdmin };

