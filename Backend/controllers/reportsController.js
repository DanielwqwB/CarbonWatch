const pool = require('../config/database');

// Adjust conversion factor if needed
const convertToTons = (value) => value ? value * 0.001 : 0;

// =====================================================
// MONTHLY REPORT (with calendar support)
// GET /api/reports/monthly?date=2026-03-01
// =====================================================
exports.getMonthlyReport = async (req, res) => {
    try {
        const selectedDate = req.query.date 
            ? new Date(req.query.date) 
            : new Date();

        const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);

        // 1️⃣ Total emission this month
        const [totalRows] = await pool.query(`
            SELECT SUM(co2_density) AS total
            FROM sensor_data
            WHERE recorded_at >= ? AND recorded_at < ?
        `, [startDate, endDate]);

        const totalEmission = convertToTons(totalRows[0].total);

        // 2️⃣ Previous month
        const prevStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
        const prevEnd = startDate;

        const [prevRows] = await pool.query(`
            SELECT SUM(co2_density) AS total
            FROM sensor_data
            WHERE recorded_at >= ? AND recorded_at < ?
        `, [prevStart, prevEnd]);

        const previousTotal = convertToTons(prevRows[0].total);

        const percentChange = previousTotal > 0
            ? (((totalEmission - previousTotal) / previousTotal) * 100).toFixed(2)
            : 0;

        // 3️⃣ Barangay breakdown
        const [breakdownRows] = await pool.query(`
            SELECT b.barangay_name, SUM(sd.co2_density) AS total
            FROM sensor_data sd
            JOIN sensor s ON sd.sensor_id = s.sensor_id
            JOIN establishment e ON s.establishment_id = e.establishment_id
            JOIN barangay b ON e.barangay_id = b.barangay_id
            WHERE sd.recorded_at >= ? AND sd.recorded_at < ?
            GROUP BY b.barangay_name
        `, [startDate, endDate]);

        const breakdown = breakdownRows.map(item => {
            const tons = convertToTons(item.total);
            return {
                barangay_name: item.barangay_name,
                total: tons,
                percentage: totalEmission > 0
                    ? ((tons / totalEmission) * 100).toFixed(2)
                    : 0
            };
        });

        const period = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        res.json({
            totalEmission,
            previousTotalEmission: previousTotal,
            percentChange,
            period,
            breakdown
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch monthly report' });
    }
};


// =====================================================
// WEEKLY REPORT (with calendar support)
// GET /api/reports/weekly?date=2026-02-07
// =====================================================
exports.getWeeklyReport = async (req, res) => {
    try {
        const selectedDate = req.query.date 
            ? new Date(req.query.date) 
            : new Date();

        const startDate = new Date(selectedDate);
        startDate.setDate(selectedDate.getDate() - selectedDate.getDay());
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        // 1️⃣ Total emission this week
        const [totalRows] = await pool.query(`
            SELECT SUM(co2_density) AS total
            FROM sensor_data
            WHERE recorded_at >= ? AND recorded_at < ?
        `, [startDate, endDate]);

        const totalEmission = convertToTons(totalRows[0].total);

        // 2️⃣ Previous week
        const prevStart = new Date(startDate);
        prevStart.setDate(startDate.getDate() - 7);
        const prevEnd = startDate;

        const [prevRows] = await pool.query(`
            SELECT SUM(co2_density) AS total
            FROM sensor_data
            WHERE recorded_at >= ? AND recorded_at < ?
        `, [prevStart, prevEnd]);

        const previousTotal = convertToTons(prevRows[0].total);

        const percentChange = previousTotal > 0
            ? (((totalEmission - previousTotal) / previousTotal) * 100).toFixed(2)
            : 0;

        // 3️⃣ Barangay breakdown
        const [breakdownRows] = await pool.query(`
            SELECT b.barangay_name, SUM(sd.co2_density) AS total
            FROM sensor_data sd
            JOIN sensor s ON sd.sensor_id = s.sensor_id
            JOIN establishment e ON s.establishment_id = e.establishment_id
            JOIN barangay b ON e.barangay_id = b.barangay_id
            WHERE sd.recorded_at >= ? AND sd.recorded_at < ?
            GROUP BY b.barangay_name
        `, [startDate, endDate]);

        const breakdown = breakdownRows.map(item => {
            const tons = convertToTons(item.total);
            return {
                barangay_name: item.barangay_name,
                total: tons,
                percentage: totalEmission > 0
                    ? ((tons / totalEmission) * 100).toFixed(2)
                    : 0
            };
        });

        const period = `${startDate.toDateString()} - ${new Date(endDate - 1).toDateString()}`;

        res.json({
            totalEmission,
            previousTotalEmission: previousTotal,
            percentChange,
            period,
            breakdown
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch weekly report' });
    }
};
