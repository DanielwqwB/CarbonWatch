const pool = require('../config/database');

// ==================================================
// GET all weekly carbon reports (latest first)
// ==================================================
const getAllWeeklyCarbonReports = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM weekly_carbon_reports
      ORDER BY week_start DESC
    `);

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};

// ==================================================
// GET weekly carbon reports by scope
// example: /api/reports/carbon?scope=ESTABLISHMENT&scope_id=3
// ==================================================
const getWeeklyCarbonReportsByScope = async (req, res) => {
  const { scope, scope_id } = req.query;

  if (!scope) {
    return res.status(400).json({
      error: 'scope is required (ESTABLISHMENT, BARANGAY, CITY)'
    });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT *
      FROM weekly_carbon_reports
      WHERE scope = ?
      AND (? IS NULL OR scope_id = ?)
      ORDER BY week_start DESC
      `,
      [scope, scope_id || null, scope_id || null]
    );

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};

// ==================================================
// CREATE weekly carbon report
// (usually called by a CRON / backend job, not ESP32)
// ==================================================
const createWeeklyCarbonReport = async (req, res) => {
  const {
    scope,
    scope_id,
    week_start,
    week_end,
    avg_co2_density,
    total_co2_tons,
    change_vs_last_week
  } = req.body;

  if (!scope || !week_start || !week_end || !total_co2_tons) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO weekly_carbon_reports
      (scope, scope_id, week_start, week_end,
       avg_co2_density, total_co2_tons, change_vs_last_week)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        scope,
        scope_id || null,
        week_start,
        week_end,
        avg_co2_density,
        total_co2_tons,
        change_vs_last_week
      ]
    );

    res.status(201).json({
      message: 'Weekly carbon report created',
      carbon_report_id: result.insertId
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};

// ==================================================
// GET available weeks (for calendar dropdown)
// ==================================================
const getCarbonReportWeeks = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT week_start, week_end
      FROM weekly_carbon_reports
      ORDER BY week_start DESC
    `);
      
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({
      error: 'Database error',
      details: error.message
    });
  }
};

module.exports = {
  getAllWeeklyCarbonReports,
  getWeeklyCarbonReportsByScope,
  createWeeklyCarbonReport,
  getCarbonReportWeeks
};
