const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');


router.post('/create/sensor', sensorController.createSensor); //sensor

// Get all sensors (with resolved location)
router.get('/sensor', sensorController.getAllSensors); //sensor

// Get single sensor by ID
router.get('/sensor/:id', sensorController.getSensorById); //sensor/1

// Update sensor
router.put('/sensor/:id', sensorController.updateSensor); //sensor/1

// Delete sensor
router.delete('/sensor/:id', sensorController.deleteSensor); //sensor/1

// ================================
// SENSOR DATA
// ================================

// Get sensor readings
router.get('/:id/data', sensorController.getSensorData);

module.exports = router;