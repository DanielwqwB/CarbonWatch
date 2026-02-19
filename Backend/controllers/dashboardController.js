const pool = require('../config/database');

exports.getDashboardData = async (req, res) => {
    try {

        // 🔥 1. Heat Stress Cases (Heat Index >= 40 this month)
        const [heatStress] = await pool.query(`
            SELECT COUNT(*) AS total
            FROM sensor_data
            WHERE heat_index_c >= 40
            AND MONTH(recorded_at) = MONTH(CURRENT_DATE())
            AND YEAR(recorded_at) = YEAR(CURRENT_DATE())
        `);

        // 🌫 2. Total CO2 Emission (this month)
        const [emission] = await pool.query(`
            SELECT IFNULL(SUM(co2_density), 0) AS total
            FROM sensor_data
            WHERE MONTH(recorded_at) = MONTH(CURRENT_DATE())
            AND YEAR(recorded_at) = YEAR(CURRENT_DATE())
        `);

        // 📉 3. Inspection Drop %
        const [inspection] = await pool.query(`
            SELECT 
                IFNULL(
                    (
                        1 - (
                            COUNT(CASE WHEN status = 'PASSED' THEN 1 END) 
                            / NULLIF(COUNT(*), 0)
                        )
                    ) * 100,
                0) AS percent
            FROM inspections
            WHERE MONTH(inspection_date) = MONTH(CURRENT_DATE())
            AND YEAR(inspection_date) = YEAR(CURRENT_DATE())
        `);

        // 👥 4. Total Users
        const [users] = await pool.query(`
            SELECT COUNT(*) AS total FROM users
        `);

        // 🏆 5. Top 5 Barangays by CO2 Emission
        const [topBarangays] = await pool.query(`
            SELECT 
                b.barangay_name,
                IFNULL(SUM(sd.co2_density), 0) AS total_emission
            FROM sensor_data sd
            JOIN sensor s ON sd.sensor_id = s.sensor_id
            JOIN barangay b ON s.barangay_id = b.barangay_id
            GROUP BY b.barangay_id, b.barangay_name
            ORDER BY total_emission DESC
            LIMIT 5
        `);

        // 📅 6. Monthly CO2 Comparison (STRICT MODE SAFE)
        const [monthlyCO2] = await pool.query(`
            SELECT 
                MONTH(recorded_at) AS month_number,
                DATE_FORMAT(MIN(recorded_at), '%b') AS month,
                IFNULL(SUM(co2_density), 0) AS total
            FROM sensor_data
            WHERE YEAR(recorded_at) = YEAR(CURRENT_DATE())
            GROUP BY YEAR(recorded_at), MONTH(recorded_at)
            ORDER BY YEAR(recorded_at), MONTH(recorded_at)
        `);

        res.json({
            heatStressCases: heatStress[0].total,
            totalEmission: emission[0].total,
            inspectionDropPercent: inspection[0].percent,
            totalUsers: users[0].total,
            topBarangays,
            monthlyCO2Comparison: monthlyCO2
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};