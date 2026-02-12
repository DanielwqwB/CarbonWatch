const express = require('express');
const router = express.Router();
const barangayController = require('../controllers/barangayController');

router.get('/barangay', barangayController.getAllBarangays);
router.get('/barangay/:id', barangayController.getBarangayById);

module.exports = router;
