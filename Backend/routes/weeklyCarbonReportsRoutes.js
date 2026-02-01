const express = require('express');
const router = express.Router();
const {
  getAllWeeklyCarbonReports,
  getWeeklyCarbonReportsByScope,
  createWeeklyCarbonReport,
  getCarbonReportWeeks
} = require('../controllers/weeklyCarbonReportsController');

// ==================================================
// GET all weekly carbon reports (latest first)
// ==================================================
router.get('/', getAllWeeklyCarbonReports);

// ==================================================
// GET weekly carbon reports by scope
// Example: /api/reports/carbon?scope=ESTABLISHMENT&scope_id=3
// ==================================================
router.get('/scope', getWeeklyCarbonReportsByScope);

// ==================================================
// CREATE weekly carbon report
// Usually called by a CRON / backend job
// ==================================================
router.post('/', createWeeklyCarbonReport);

// ==================================================
// GET available weeks (for dropdown/calendar)
// ==================================================
router.get('/weeks', getCarbonReportWeeks);

module.exports = router;
