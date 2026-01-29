// routes/barangayRoutes.js
const express = require('express');
const router = express.Router();
const barangayController = require('../controllers/barangayController');

// Get all barangays
router.get('/barangay', barangayController.getAllBarangays);

// Get a single barangay by ID
router.get('/barangay/:id', barangayController.getBarangayById);

module.exports = router;
