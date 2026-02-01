const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

// Single endpoint to get reports (optionally filtered by type)
router.get('/', reportsController.getReports);

// Single endpoint to create a report (type defined in body)
router.post('/', reportsController.createReport);

module.exports = router;
