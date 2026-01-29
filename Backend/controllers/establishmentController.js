const pool = require('../config/database');

// ============================================
// Get all establishments
// ============================================
const getAllEstablishments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
          e.establishment_id,
          e.establishment_name,
          e.establishment_type,
          e.latitude,
          e.longitude,
          e.density,
          e.temperature_c,
          b.name AS barangay_name
       FROM establishments e
       JOIN barangays b ON e.barangay_id = b.barangay_id
       ORDER BY e.establishment_id ASC`
    );

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// ============================================
// Get establishment by ID
// ============================================
const getEstablishmentById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM establishments WHERE establishment_id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Establishment not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
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
      `INSERT INTO establishments 
       (establishment_name, establishment_type, barangay_id, latitude, longitude)
       VALUES (?, ?, ?, ?, ?)`,
      [establishment_name, establishment_type, barangay_id, latitude, longitude]
    );

    res.status(201).json({
      message: 'Establishment created successfully',
      establishment_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
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
      `UPDATE establishments
       SET establishment_name = ?,
           establishment_type = ?,
           barangay_id = ?,
           latitude = ?,
           longitude = ?
       WHERE establishment_id = ?`,
      [
        establishment_name,
        establishment_type,
        barangay_id,
        latitude,
        longitude,
        id
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Establishment not found' });
    }

    res.status(200).json({ message: 'Establishment updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

// ============================================
// Delete establishment
// ============================================
const deleteEstablishment = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM establishments WHERE establishment_id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Establishment not found' });
    }

    res.status(200).json({ message: 'Establishment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message });
  }
};

module.exports = {
  getAllEstablishments,
  getEstablishmentById,
  createEstablishment,
  updateEstablishment,
  deleteEstablishment
};
