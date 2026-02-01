const pool = require('../config/database');

// ==================================================
// GET all weekly temperature reports (latest first)
// ==================================================
const getAllWeeklyTemperatureReports = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM weekly_temperature_reports
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
// GET weekly temperature reports by scope
// example:
// /api/reports/temperature?scope=BARANGAY&scope_id=12
// ==================================================
const getWeeklyTemperatureReportsByScope = async (req, res) => {
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
      FROM weekly_temperature_reports
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
// CREATE weekly temperature report
// (backend / cron job usage)
// ==================================================
const createWeeklyTemperatureReport = async (req, res) => {
  const {
    scope,
    scope_id,
    week_start,
    week_end,
    avg_temperature_c,
    min_temperature_c,
    max_temperature_c,
    change_vs_last_week
  } = req.body;

  if (!scope || !week_start || !week_end || avg_temperature_c === undefined) {
    return res.status(400).json({
      error: 'Missing required fields'
    });
  }

  try {
    const [result] = await pool.query(
      `
      INSERT INTO weekly_temperature_reports
      (scope, scope_id, week_start, week_end,
       avg_temperature_c, min_temperature_c, max_temperature_c,
       change_vs_last_week)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        scope,
        scope_id || null,
        week_start,
        week_end,
        avg_temperature_c,
        min_temperature_c,
        max_temperature_c,
        change_vs_last_week
      ]
    );

    res.status(201).json({
      message: 'Weekly temperature report created',
      temperature_report_id: result.insertId
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
const getTemperatureReportWeeks = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT week_start, week_end
      FROM weekly_temperature_reports
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
  getAllWeeklyTemperatureReports,
  getWeeklyTemperatureReportsByScope,
  createWeeklyTemperatureReport,
  getTemperatureReportWeeks
};
