const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorDataController');

// ESP32 sends data
router.post('/post-sensor-data', sensorController.postSensorData);

// ✅ GET ALL SENSOR DATA (THIS FIXES 404)
router.get('/sensor-data', sensorController.getAllSensorData);

// Get latest reading per sensor
router.get('/sensor-data/latest/:sensor_id', sensorController.getLatestSensorData);

// Get all readings for one sensor
router.get('/sensor-data/:sensor_id', sensorController.getSensorData);

module.exports = router;
