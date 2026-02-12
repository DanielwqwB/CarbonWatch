const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

router.get('/reports/monthly', reportsController.getMonthlyReport);
router.get('/reports/weekly', reportsController.getWeeklyReport);

module.exports = router