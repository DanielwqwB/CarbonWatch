const pool = require('../config/database');

const convertToTons = (co2_density) => co2_density * 0.001; // adjust factor if needed

// -------------------- MONTHLY REPORT --------------------
exports.getMonthlyReport = async (req, res) => {
    try {
        const today = new Date();
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // 1️⃣ Fetch all sensor_data for current month
        const [sensorDataRows] = await pool.query(`
            SELECT sd.*, s.establishment_id
            FROM sensor_data sd
            JOIN sensor s ON sd.sensor_id = s.sensor_id
            WHERE sd.recorded_at >= ? AND sd.recorded_at < ?
            ORDER BY sd.recorded_at ASC
        `, [startDate, endDate]);

        // Convert CO2 densities to tons in each row for frontend
        const sensorData = sensorDataRows.map(row => ({
            ...row,
            co2_emission: convertToTons(row.co2_density)
        }));

        // 2️⃣ Calculate totalEmission
        const totalEmission = sensorData.reduce((sum, row) => sum + row.co2_emission, 0);

        // 3️⃣ Previous Month Total
        const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevEnd = startDate;
        const [previousRows] = await pool.query(`
            SELECT co2_density
            FROM sensor_data
            WHERE recorded_at >= ? AND recorded_at < ?
        `, [prevStart, prevEnd]);
        const previousTotal = previousRows.reduce((sum, row) => sum + convertToTons(row.co2_density), 0);

        // 4️⃣ Percent change (trend)
        const percentChange = previousTotal > 0 ? ((totalEmission - previousTotal) / previousTotal * 100).toFixed(2) : null;

        // 5️⃣ Barangay breakdown
        const [breakdownRows] = await pool.query(`
            SELECT b.barangay_name AS barangay_name, SUM(sd.co2_density) AS total
            FROM sensor_data sd
            JOIN sensor s ON sd.sensor_id = s.sensor_id
            JOIN establishment e ON s.establishment_id = e.establishment_id
            JOIN barangay b ON e.barangay_id = b.barangay_id
            WHERE sd.recorded_at >= ? AND sd.recorded_at < ?
            GROUP BY b.barangay_name
        `, [startDate, endDate]);

        const breakdown = breakdownRows.map(item => ({
            barangay_name: item.barangay_name,
            total: convertToTons(item.total),
            percentage: totalEmission > 0 ? ((convertToTons(item.total) / totalEmission) * 100).toFixed(2) : 0
        }));

        // 6️⃣ Period label
        const period = startDate.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g., "Feb 2026"

        res.json({
            totalEmission,
            previousTotalEmission: previousTotal,
            percentChange,
            period,
            breakdown,
            sensorData
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch monthly report' });
    }
};

// -------------------- WEEKLY REPORT --------------------
exports.getWeeklyReport = async (req, res) => {
    try {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        // 1️⃣ Fetch all sensor_data for current week
        const [sensorDataRows] = await pool.query(`
            SELECT sd.*, s.establishment_id
            FROM sensor_data sd
            JOIN sensor s ON sd.sensor_id = s.sensor_id
            WHERE sd.recorded_at >= ? AND sd.recorded_at < ?
            ORDER BY sd.recorded_at ASC
        `, [startDate, endDate]);

        const sensorData = sensorDataRows.map(row => ({
            ...row,
            co2_emission: convertToTons(row.co2_density)
        }));

        // 2️⃣ Calculate totalEmission
        const totalEmission = sensorData.reduce((sum, row) => sum + row.co2_emission, 0);

        // 3️⃣ Previous week total
        const prevStart = new Date(startDate);
        prevStart.setDate(startDate.getDate() - 7);
        const prevEnd = startDate;

        const [previousRows] = await pool.query(`
            SELECT co2_density
            FROM sensor_data
            WHERE recorded_at >= ? AND recorded_at < ?
        `, [prevStart, prevEnd]);

        const previousTotal = previousRows.reduce((sum, row) => sum + convertToTons(row.co2_density), 0);

        // 4️⃣ Percent change
        const percentChange = previousTotal > 0 ? ((totalEmission - previousTotal) / previousTotal * 100).toFixed(2) : null;

        // 5️⃣ Barangay breakdown
        const [breakdownRows] = await pool.query(`
            SELECT b.barangay_name AS barangay_name, SUM(sd.co2_density) AS total
            FROM sensor_data sd
            JOIN sensor s ON sd.sensor_id = s.sensor_id
            JOIN establishment e ON s.establishment_id = e.establishment_id
            JOIN barangay b ON e.barangay_id = b.barangay_id
            WHERE sd.recorded_at >= ? AND sd.recorded_at < ?
            GROUP BY b.barangay_name
        `, [startDate, endDate]);

        const breakdown = breakdownRows.map(item => ({
            barangay_name: item.barangay_name,
            total: convertToTons(item.total),
            percentage: totalEmission > 0 ? ((convertToTons(item.total) / totalEmission) * 100).toFixed(2) : 0
        }));

        // 6️⃣ Period label
        const weekNumber = Math.ceil((startDate.getDate() - startDate.getDay() + 1) / 7);
        const period = `Week ${weekNumber}, ${startDate.getFullYear()}`;

        res.json({
            totalEmission,
            previousTotalEmission: previousTotal,
            percentChange,
            period,
            breakdown,
            sensorData
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch weekly report' });
    }
};
