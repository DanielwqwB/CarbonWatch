const pool = require('../config/database'); // MySQL pool

// GET reports (all or by type)
exports.getReports = async (req, res) => {
    try {
        const type = req.query.type; // 'carbon' or 'temperature'
        let table = '';
        if (type === 'carbon') table = 'weekly_carbon_reports';
        else if (type === 'temperature') table = 'weekly_temperature_reports';
        else return res.status(400).json({ error: "Please provide type='carbon' or 'temperature'" });

        const [results] = await db.query(`SELECT * FROM ${table} ORDER BY week_start DESC`);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE report (type in body)
exports.createReport = async (req, res) => {
    try {
        const { type, scope, scope_id, week_start, week_end, avg_value, min_value, max_value, total_co2_tons, change_vs_last_week } = req.body;

        if (type === 'carbon') {
            const [result] = await db.query(
                `INSERT INTO weekly_carbon_reports 
                (scope, scope_id, week_start, week_end, avg_co2_density, total_co2_tons, change_vs_last_week)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [scope, scope_id, week_start, week_end, avg_value, total_co2_tons, change_vs_last_week]
            );
            res.status(201).json({ message: "Carbon report created", carbon_report_id: result.insertId });
        } else if (type === 'temperature') {
            const [result] = await db.query(
                `INSERT INTO weekly_temperature_reports 
                (scope, scope_id, week_start, week_end, avg_temperature_c, min_temperature_c, max_temperature_c, change_vs_last_week)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [scope, scope_id, week_start, week_end, avg_value, min_value, max_value, change_vs_last_week]
            );
            res.status(201).json({ message: "Temperature report created", temperature_report_id: result.insertId });
        } else {
            return res.status(400).json({ error: "Report type must be 'carbon' or 'temperature'" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
