const pool = require('../config/database');

// CREATE sensor data (1 per minute per sensor)
exports.createSensorData = async (req, res) => {
    try {
        const { sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level } = req.body;

        // Validate required fields
        if (
            sensor_id == null ||
            co2_density == null ||
            temperature_c == null ||
            humidity == null ||
            heat_index_c == null ||
            !carbon_level
        ) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Generate minute-level timestamp (removes seconds)
        const now = new Date();
        now.setSeconds(0, 0);

        const sql = `
            INSERT INTO sensor_data 
            (sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level, minute_stamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            sensor_id,
            parseFloat(co2_density),
            parseFloat(temperature_c),
            parseFloat(humidity),
            parseFloat(heat_index_c),
            carbon_level,
            now
        ];

        const [result] = await pool.execute(sql, values);

        res.status(201).json({
            success: true,
            message: 'Sensor data saved successfully (1 per minute enforced)',
            data_id: result.insertId
        });

    } catch (error) {

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'This sensor already submitted data for this minute'
            });
        }

        console.error('Create Sensor Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};


// GET all sensor data
exports.getAllSensorData = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM sensor_data ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('Get Sensor Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};
