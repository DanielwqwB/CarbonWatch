const pool = require('../config/database');

// Get all periods (for dropdown / calendar)
const getAllPeriods = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT period_id, month, year, start_date, end_date
       FROM calendar_periods
       ORDER BY year DESC, month DESC`
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get monthly report for a period
const getMonthlyReport = async (req, res) => {
  const { period_id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT mr.report_id, e.name AS establishment_name, e.type AS establishment_type,
              mr.avg_temperature, mr.avg_carbon_level, b.name AS barangay_name
       FROM monthly_reports mr
       JOIN establishments e ON mr.establishment_id = e.establishment_id
       JOIN barangays b ON e.barangay_id = b.barangay_id
       WHERE mr.period_id = ?
       ORDER BY mr.avg_carbon_level DESC`,
      [period_id]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllPeriods,
  getMonthlyReport
};
