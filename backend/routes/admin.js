const express = require('express');
const { authenticate, isAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');
const chefController = require('../controllers/chefController');
const statisticsController = require('../controllers/statisticsController');

const router = express.Router();

router.get('/chefs', authenticate, isAdmin, chefController.getAdminChefs);
router.get('/chefs/:id', authenticate, isAdmin, chefController.getAdminChefById);
router.patch('/chefs/:id/approval', authenticate, isAdmin, chefController.reviewChefRegistration);
router.patch('/users/:id/deactivate', authenticate, isAdmin, userController.deactivateUser);
router.patch('/users/:id/reactivate', authenticate, isAdmin, userController.reactivateUser);
router.patch('/chefs/:id/deactivate', authenticate, isAdmin, chefController.deactivateChef);
router.patch('/chefs/:id/reactivate', authenticate, isAdmin, chefController.reactivateChef);
router.get('/statistics', authenticate, isAdmin, statisticsController.getAdminStatistics);

module.exports = router;
