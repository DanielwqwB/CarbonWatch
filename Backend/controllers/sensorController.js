const pool = require('../config/database'); // MySQL pool

// ============================================
// Create a new sensor
// ============================================
const createSensor = async (req, res) => {
  const { sensor_name, barangay_id, establishment_id, latitude, longitude } = req.body;

  // Validate required fields
  if (!sensor_name || !latitude || !longitude) {
    return res.status(400).json({
      error: 'sensor_name, latitude, and longitude are required'
    });
  }

  // Must belong to at least a barangay or establishment
  if (!barangay_id && !establishment_id) {
    return res.status(400).json({
      error: 'Sensor must belong to a barangay or an establishment'
    });
  }

  try {
    let finalBarangayId = barangay_id;

    // If establishment is provided, validate it
    if (establishment_id) {
      const [estRows] = await pool.query(
        'SELECT barangay_id FROM establishments WHERE establishment_id = ?',
        [establishment_id]
      );

      if (estRows.length === 0) {
        return res.status(400).json({ error: 'Invalid establishment_id' });
      }

      // Auto-set barangay_id from establishment if not provided
      if (!finalBarangayId) {
        finalBarangayId = estRows[0].barangay_id;
      }
    }

    const [result] = await pool.query(
      `INSERT INTO sensors (sensor_name, barangay_id, establishment_id, latitude, longitude)
       VALUES (?, ?, ?, ?, ?)`,
      [sensor_name, finalBarangayId || null, establishment_id || null, latitude, longitude]
    );

    res.status(201).json({
      message: 'Sensor created successfully',
      sensor_id: result.insertId
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// ============================================
// Get all sensors with barangay and establishment info
// ============================================
const getAllSensors = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          s.sensor_id,
          s.sensor_name,
          s.latitude,
          s.longitude,
          s.installed_on,
          s.barangay_id,
          b.name AS barangay_name,
          s.establishment_id,
          e.establishment_name
       FROM sensors s
       LEFT JOIN barangays b ON s.barangay_id = b.barangay_id
       LEFT JOIN establishments e ON s.establishment_id = e.establishment_id
       ORDER BY s.sensor_id ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// ============================================
// Get a single sensor by ID
// ============================================
const getSensorById = async (req, res) => {
  const { sensor_id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
          s.sensor_id,
          s.sensor_name,
          s.latitude,
          s.longitude,
          s.installed_on,
          s.barangay_id,
          b.name AS barangay_name,
          s.establishment_id,
          e.establishment_name
       FROM sensors s
       LEFT JOIN barangays b ON s.barangay_id = b.barangay_id
       LEFT JOIN establishments e ON s.establishment_id = e.establishment_id
       WHERE s.sensor_id = ?`,
      [sensor_id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// ============================================
// Update a sensor
// ============================================
const updateSensor = async (req, res) => {
  const { sensor_id } = req.params;
  const { sensor_name, barangay_id, establishment_id, latitude, longitude } = req.body;

  if (!barangay_id && !establishment_id) {
    return res.status(400).json({
      error: 'Sensor must belong to a barangay or an establishment'
    });
  }

  try {
    let finalBarangayId = barangay_id;

    if (establishment_id) {
      const [estRows] = await pool.query(
        'SELECT barangay_id FROM establishments WHERE establishment_id = ?',
        [establishment_id]
      );

      if (estRows.length === 0) {
        return res.status(400).json({ error: 'Invalid establishment_id' });
      }

      // Auto-set barangay_id from establishment if not provided
      if (!finalBarangayId) {
        finalBarangayId = estRows[0].barangay_id;
      }
    }

    const [result] = await pool.query(
      `UPDATE sensors
       SET sensor_name = ?, barangay_id = ?, establishment_id = ?, latitude = ?, longitude = ?
       WHERE sensor_id = ?`,
      [sensor_name, finalBarangayId || null, establishment_id || null, latitude, longitude, sensor_id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    res.status(200).json({ message: 'Sensor updated successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

module.exports = {
  createSensor,
  getAllSensors,
  getSensorById,
  updateSensor
};
