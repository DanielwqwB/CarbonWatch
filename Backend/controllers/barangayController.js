const pool = require('../config/database');

// ✅ Get all barangays with LIVE averages
const getAllBarangays = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        b.barangay_id,
        b.barangay_name,
        b.latitude,
        b.longitude,
        b.city,

        -- LIVE computed averages
        COALESCE(ROUND(AVG(sd.temperature_c), 2), 0) AS avg_temperature_c,
        COALESCE(ROUND(AVG(sd.co2_density), 2), 0) AS avg_co2_density

      FROM barangay b
      LEFT JOIN establishment e ON e.barangay_id = b.barangay_id
      LEFT JOIN sensor s ON s.establishment_id = e.establishment_id
      LEFT JOIN sensor_data sd ON sd.sensor_id = s.sensor_id

      GROUP BY b.barangay_id
      ORDER BY avg_co2_density DESC
    `);

    res.status(200).json({
      message: 'Barangays fetched successfully',
      data: rows
    });

  } catch (error) {
    console.error('Database error full:', error);
    res.status(500).json({
      error: 'Database error',
      details: error.sqlMessage || error.message
    });
  }
};



// ✅ Get single barangay by ID with LIVE data
const getBarangayById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT 
        b.barangay_id,
        b.barangay_name,
        b.latitude,
        b.longitude,
        b.city,

        COALESCE(ROUND(AVG(sd.temperature_c), 2), 0) AS avg_temperature_c,
        COALESCE(ROUND(AVG(sd.co2_density), 2), 0) AS avg_co2_density

      FROM barangay b
      LEFT JOIN establishment e ON e.barangay_id = b.barangay_id
      LEFT JOIN sensor s ON s.establishment_id = e.establishment_id
      LEFT JOIN sensor_data sd ON sd.sensor_id = s.sensor_id

      WHERE b.barangay_id = ?
      GROUP BY b.barangay_id
    `, [id]);

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
      details: error.sqlMessage || error.message
    });
  }
};

module.exports = {
  getAllBarangays,
  getBarangayById
};
