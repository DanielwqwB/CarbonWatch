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

        -- Averages computed from pre-aggregated sensor data (no duplicates)
        COALESCE(ROUND(AVG(sensor_avg.avg_temp), 2), 0)  AS avg_temperature_c,
        COALESCE(ROUND(AVG(sensor_avg.avg_co2), 2), 0)   AS avg_co2_density

      FROM barangay b
      LEFT JOIN establishment e ON e.barangay_id = b.barangay_id
      LEFT JOIN (
        -- Pre-aggregate per sensor FIRST, so joining doesn't multiply rows
        SELECT
          s.establishment_id,
          AVG(sd.temperature_c) AS avg_temp,
          AVG(sd.co2_density)   AS avg_co2
        FROM sensor s
        LEFT JOIN sensor_data sd ON sd.sensor_id = s.sensor_id
        GROUP BY s.sensor_id            -- ← key: collapse all readings per sensor
      ) sensor_avg ON sensor_avg.establishment_id = e.establishment_id

      GROUP BY b.barangay_id, b.barangay_name, b.latitude, b.longitude, b.city
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

        COALESCE(ROUND(AVG(sensor_avg.avg_temp), 2), 0)  AS avg_temperature_c,
        COALESCE(ROUND(AVG(sensor_avg.avg_co2), 2), 0)   AS avg_co2_density

      FROM barangay b
      LEFT JOIN establishment e ON e.barangay_id = b.barangay_id
      LEFT JOIN (
        SELECT
          s.establishment_id,
          AVG(sd.temperature_c) AS avg_temp,
          AVG(sd.co2_density)   AS avg_co2
        FROM sensor s
        LEFT JOIN sensor_data sd ON sd.sensor_id = s.sensor_id
        GROUP BY s.sensor_id
      ) sensor_avg ON sensor_avg.establishment_id = e.establishment_id

      WHERE b.barangay_id = ?
      GROUP BY b.barangay_id, b.barangay_name, b.latitude, b.longitude, b.city
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