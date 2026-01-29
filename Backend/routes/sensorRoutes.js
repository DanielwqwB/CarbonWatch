const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// Create a new sensor
router.post('/create/sensors', sensorController.createSensor);

// Get all sensors
router.get('/sensors', sensorController.getAllSensors);

// Get a sensor by ID
router.get('/sensors/:sensor_id', sensorController.getSensorById);

// Update a sensor
router.put('/sensors/:sensor_id', sensorController.updateSensor);

module.exports = router;
