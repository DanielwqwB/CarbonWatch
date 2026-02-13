const pool = require('../config/database');


// ============================================
// Get all establishments (with clean sensor metrics)
// ============================================
const getAllEstablishments = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        e.establishment_id,
        e.establishment_name,
        e.establishment_type,
        e.latitude,
        e.longitude,
        b.barangay_name,

        -- Clean 2 decimal float values
        COALESCE(ROUND(AVG(sd.temperature_c), 2), 0) AS avg_temperature_c,
        COALESCE(ROUND(AVG(sd.co2_density), 2), 0) AS avg_co2_density

      FROM establishment e
      LEFT JOIN barangay b 
        ON e.barangay_id = b.barangay_id

      LEFT JOIN sensor s 
        ON s.establishment_id = e.establishment_id

      LEFT JOIN sensor_data sd 
        ON sd.sensor_id = s.sensor_id

      GROUP BY 
        e.establishment_id,
        e.establishment_name,
        e.establishment_type,
        e.latitude,
        e.longitude,
        b.barangay_name

      ORDER BY avg_co2_density DESC
    `);

    res.status(200).json(rows);

  } catch (error) {
    console.error('Establishment Error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};


// ============================================
// Get establishment by ID (with sensor metrics)
// ============================================
const getEstablishmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT
        e.establishment_id,
        e.establishment_name,
        e.establishment_type,
        e.latitude,
        e.longitude,
        b.barangay_name,

        COALESCE(ROUND(AVG(sd.temperature_c), 2), 0) AS avg_temperature_c,
        COALESCE(ROUND(AVG(sd.co2_density), 2), 0) AS avg_co2_density

      FROM establishment e
      LEFT JOIN barangay b 
        ON e.barangay_id = b.barangay_id

      LEFT JOIN sensor s 
        ON s.establishment_id = e.establishment_id

      LEFT JOIN sensor_data sd 
        ON sd.sensor_id = s.sensor_id

      WHERE e.establishment_id = ?

      GROUP BY 
        e.establishment_id,
        e.establishment_name,
        e.establishment_type,
        e.latitude,
        e.longitude,
        b.barangay_name
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Establishment not found' });
    }

    res.status(200).json(rows[0]);

  } catch (error) {
    console.error('Establishment Error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};


// ============================================
// Create establishment
// ============================================
const createEstablishment = async (req, res) => {
  const {
    establishment_name,
    establishment_type,
    barangay_id,
    latitude,
    longitude
  } = req.body;

  if (!establishment_name || !barangay_id) {
    return res.status(400).json({
      error: 'establishment_name and barangay_id are required'
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO establishment 
       (establishment_name, establishment_type, barangay_id, latitude, longitude)
       VALUES (?, ?, ?, ?, ?)`,
      [establishment_name, establishment_type, barangay_id, latitude, longitude]
    );

    res.status(201).json({
      message: 'Establishment created successfully',
      establishment_id: result.insertId
    });

  } catch (error) {
    console.error('Establishment Error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};


// ============================================
// Update establishment
// ============================================
const updateEstablishment = async (req, res) => {
  const { id } = req.params;
  const {
    establishment_name,
    establishment_type,
    barangay_id,
    latitude,
    longitude
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE establishment
       SET establishment_name = ?,
           establishment_type = ?,
           barangay_id = ?,
           latitude = ?,
           longitude = ?
       WHERE establishment_id = ?`,
      [establishment_name, establishment_type, barangay_id, latitude, longitude, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Establishment not found' });
    }

    res.status(200).json({ message: 'Establishment updated successfully' });

  } catch (error) {
    console.error('Establishment Error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};


// ============================================
// Delete establishment
// ============================================
const deleteEstablishment = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM establishment WHERE establishment_id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Establishment not found' });
    }

    res.status(200).json({ message: 'Establishment deleted successfully' });

  } catch (error) {
    console.error('Establishment Error:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};


module.exports = {
  getAllEstablishments,
  getEstablishmentById,
  createEstablishment,
  updateEstablishment,
  deleteEstablishment
};
