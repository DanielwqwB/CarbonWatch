const express = require('express');
const app = express();

app.use(express.json());

// Sensor data route
const sensorRoutes = require('./routes/sensorRoutes');
app.use('/api/sensor-data', sensorRoutes);

// Alerts route
const alertsRoutes = require('./routes/alertsRoutes');
app.use('/api/alerts', alertsRoutes);

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));
