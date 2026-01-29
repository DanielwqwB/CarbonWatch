// alertsController.js
const pool = require('../config/db');

/**
 * Insert an alert into the alerts table
 * @param {number} sensor_id
 * @param {number} data_id - ID of the sensor_data row
 * @param {string} type
 * @param {number} value
 * @param {string} level
 */
async function createAlert(sensor_id, data_id, type, value, level) {
  try {
    await pool.query(
      `INSERT INTO alerts (sensor_id, data_id, type, value, level)
       VALUES (?, ?, ?, ?, ?)`,
      [sensor_id, data_id, type, value, level]
    );
    console.log(`Alert saved: ${type} - ${level} (${value}) for data_id ${data_id}`);
  } catch (err) {
    console.error('Error inserting alert:', err.message);
  }
}

/**
 * Process sensor data and generate alerts
 * @param {Object} sensorData
 * @param {number} data_id - ID of the row just inserted in sensor_data
 */
async function processSensorData(sensorData, data_id) {
  const { sensor_id, co2_density, methane_ppm, carbon_level, heat_index_c } = sensorData;

  if (carbon_level && carbon_level !== 'LOW') {
    await createAlert(sensor_id, data_id, 'Carbon Level', co2_density, carbon_level);
  }

  if (heat_index_c >= 35 && heat_index_c < 40) {
    await createAlert(sensor_id, data_id, 'Heat Index', heat_index_c, 'HIGH');
  } else if (heat_index_c >= 40) {
    await createAlert(sensor_id, data_id, 'Heat Index', heat_index_c, 'VERY HIGH');
  }

  if (methane_ppm >= 100 && methane_ppm < 200) {
    await createAlert(sensor_id, data_id, 'Methane', methane_ppm, 'HIGH');
  } else if (methane_ppm >= 200) {
    await createAlert(sensor_id, data_id, 'Methane', methane_ppm, 'VERY HIGH');
  }
}

module.exports = { createAlert, processSensorData };
