const express = require('express');
const router = express.Router();
const { getWeeklyPrediction } = require('../controllers/weatherController');

// GET weekly weather + carbon prediction
router.get('/weekly/:barangay_id', getWeeklyPrediction);

module.exports = router;
