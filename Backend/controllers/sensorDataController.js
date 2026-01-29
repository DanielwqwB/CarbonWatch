const pool = require('../config/database');

// ================================
// POST sensor data (ESP32 sends readings)
// ================================
const postSensorData = async (req, res) => {
  let {
    sensor_id,
    mq2_analog,
    methane_ppm,
    co2_density,
    carbon_level,
    humidity,
    temperature_c,
    temperature_f,
    heat_index_c,
    heat_index_f
  } = req.body;

  // Normalize ENUM value
  if (carbon_level) {
    carbon_level = carbon_level.toUpperCase();
  }

  // Basic validation
  if (!sensor_id || mq2_analog === undefined || temperature_c === undefined || humidity === undefined) {
    return res.status(400).json({
      error: 'sensor_id, mq2_analog, temperature_c, and humidity are required'
    });
  }

  try {
    // 1️⃣ Insert sensor data
    const [result] = await pool.query(
      `INSERT INTO sensor_data (
        sensor_id,
        mq2_analog,
        methane_ppm,
        co2_density,
        carbon_level,
        humidity,
        temperature_c,
        temperature_f,
        heat_index_c,
        heat_index_f
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sensor_id,
        mq2_analog,
        methane_ppm || null,
        co2_density || null,
        carbon_level || 'NORMAL',
        humidity,
        temperature_c,
        temperature_f || null,
        heat_index_c || null,
        heat_index_f || null
      ]
    );

    const data_id = result.insertId;

    // 2️⃣ Auto-generate alerts
    if (carbon_level === 'HIGH' || carbon_level === 'VERY HIGH') {
      await pool.query(
        `INSERT INTO alerts (data_id, sensor_id, type, value, level)
         VALUES (?, ?, ?, ?, ?)`,
        [data_id, sensor_id, 'Carbon Level', null, carbon_level]
      );
    }

    if (temperature_c >= 35) {
      await pool.query(
        `INSERT INTO alerts (data_id, sensor_id, type, value, level)
         VALUES (?, ?, ?, ?, ?)`,
        [data_id, sensor_id, 'High Temperature', temperature_c, 'HIGH']
      );
    }

    res.status(201).json({
      message: 'Sensor data saved successfully',
      data_id
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};

// ================================
// GET latest sensor data for a sensor
// ================================
const getLatestSensorData = async (req, res) => {
  const { sensor_id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM sensor_data
       WHERE sensor_id = ?
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [sensor_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'No data found for this sensor' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// ================================
// GET all readings for a sensor
// ================================
const getSensorData = async (req, res) => {
  const { sensor_id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM sensor_data
       WHERE sensor_id = ?
       ORDER BY recorded_at DESC`,
      [sensor_id]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// ================================
// GET all sensor data (for /api/sensor-data)
// ================================
const getAllSensorData = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM sensor_data
       ORDER BY recorded_at DESC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

module.exports = {
  postSensorData,
  getLatestSensorData,
  getSensorData,
  getAllSensorData
};
