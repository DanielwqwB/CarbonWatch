const pool = require('../config/database');

// Get all barangays
const getAllBarangays = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT barangay_id, barangay_name, latitude, longitude, city, density, temperature_c
       FROM barangay
       ORDER BY barangay_id ASC`
    );

    res.status(200).json({
      message: 'Barangays fetched successfully',
      data: rows
    });
  } catch (error) {
    console.error('Database error full:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.sqlMessage || error.message || JSON.stringify(error)
    });
  }
};

// Get single barangay by ID
const getBarangayById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT barangay_id, barangay_name, latitude, longitude, city, density, temperature_c
       FROM barangay
       WHERE barangay_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Barangay not found' });
    }

    res.status(200).json({
      message: 'Barangay fetched successfully',
      data: rows[0]
    });
  } catch (error) {
    console.error('Database error full:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.sqlMessage || error.message || JSON.stringify(error)
    });
  }
};

module.exports = {
  getAllBarangays,
  getBarangayById
};
