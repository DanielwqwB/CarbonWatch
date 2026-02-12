const express = require('express');
const router = express.Router();

const sensorDataController = require('../controllers/sensorDataController');

// POST sensor data
router.post('/create/sensor-data', sensorDataController.createSensorData);

// GET sensor data
router.get('/sensor-data', sensorDataController.getAllSensorData);

module.exports = router;
