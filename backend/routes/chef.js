const express = require('express');
const { authenticate, isChef } = require('../middleware/auth');
const statisticsController = require('../controllers/statisticsController');

const router = express.Router();

router.get('/statistics', authenticate, isChef, statisticsController.getChefStatistics);

module.exports = router;
