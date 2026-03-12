// Statistics routes
const express = require('express');
const { authenticate, isChefOrAdmin } = require('../middleware/auth');
const statisticsController = require('../controllers/statisticsController');

const router = express.Router();

// Get sales statistics (Admin or Chef)
router.get('/', authenticate, isChefOrAdmin, statisticsController.getStatistics);

module.exports = router;
