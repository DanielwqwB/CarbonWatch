const express = require('express');
const router = express.Router();

const {
  getAllWeeklyTemperatureReports,
  getWeeklyTemperatureReportsByScope,
  createWeeklyTemperatureReport,
  getTemperatureReportWeeks
} = require('../controllers/weeklyTemperatureReportsController');

// ============================================
// Weekly Temperature Reports Routes
// ============================================

// 📊 Get all weekly temperature reports
// GET /api/reports/temperature
router.get('/', getAllWeeklyTemperatureReports);

// 🔍 Get weekly temperature reports by scope
// GET /api/reports/temperature?scope=CITY
// GET /api/reports/temperature?scope=BARANGAY&scope_id=3
// GET /api/reports/temperature?scope=ESTABLISHMENT&scope_id=5
router.get('/filter', getWeeklyTemperatureReportsByScope);

// ➕ Create weekly temperature report
// POST /api/reports/temperature
router.post('/', createWeeklyTemperatureReport);

// 📅 Get available weeks for calendar dropdown
// GET /api/reports/temperature/weeks
router.get('/weeks', getTemperatureReportWeeks);

module.exports = router;
