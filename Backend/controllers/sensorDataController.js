const pool = require('../config/database');

// CREATE sensor data (1 per minute per sensor)
exports.createSensorData = async (req, res) => {
    try {
        const {
            sensor_id,
            co2_density,
            temperature_c,
            humidity,
            heat_index_c,
            carbon_level
        } = req.body;

        // Validate required fields
        if (
            sensor_id == null ||
            co2_density == null ||
            temperature_c == null ||
            humidity == null ||
            heat_index_c == null ||
            carbon_level == null ||
            carbon_level === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
                required: ['sensor_id',  'co2_density', 'temperature_c', 'humidity', 'heat_index_c', 'carbon_level']
            });
        }

        // ✅ Validate numeric fields — reject NaN silently inserting
        const parsed = {
            co2_density:   parseFloat(co2_density),
            temperature_c: parseFloat(temperature_c),
            humidity:      parseFloat(humidity),
            heat_index_c:  parseFloat(heat_index_c),
        };

        if (Object.values(parsed).some(v => isNaN(v))) {
            return res.status(400).json({
                success: false,
                message: 'co2_density, temperature_c, humidity, heat_index_c must be valid numbers'
            });
        }

        // ✅ Check if sensor_id exists
        const [sensorCheck] = await pool.execute(
            'SELECT sensor_id FROM sensor WHERE sensor_id = ?',
            [sensor_id]
        );

        if (sensorCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Sensor with ID "${sensor_id}" does not exist. Register the sensor first.`
            });
        }

        // ✅ Generate minute_stamp as MySQL DATETIME string (fixes timezone/format issues)
        const now = new Date();
        now.setSeconds(0, 0);
        const minute_stamp = now.toISOString().slice(0, 19).replace('T', ' ');

        const sql = `
            INSERT INTO sensor_data 
            (sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level, minute_stamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.execute(sql, [
            sensor_id,
            parsed.co2_density,
            parsed.temperature_c,
            parsed.humidity,
            parsed.heat_index_c,
            carbon_level,
            minute_stamp  // ✅ proper string format: "2026-02-18 10:34:00"
        ]);

        res.status(201).json({
            success: true,
            message: 'Sensor data saved successfully',
            data_id: result.insertId,
            minute_stamp  // ✅ echo back so IoT/Postman can verify
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'This sensor already submitted data for this minute'
            });
        }

        console.error('Create Sensor Data Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message  // ✅ actual error visible
        });
    }
};

// GET all sensor data
exports.getAllSensorData = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM sensor_data ORDER BY minute_stamp DESC'  // ✅ fixed column name
        );

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('Get All Sensor Data Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};