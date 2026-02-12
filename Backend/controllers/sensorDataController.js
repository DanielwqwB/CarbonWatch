const pool = require('../config/database');

// CREATE sensor data
exports.createSensorData = async (req, res) => {
    try {
        const { sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level } = req.body;

        // Validate all required fields
        if (
            sensor_id === undefined ||
            co2_density === undefined ||
            temperature_c === undefined ||
            humidity === undefined ||
            heat_index_c === undefined ||
            !carbon_level
        ) {
            return res.status(400).json({ 
                message: 'All fields are required: sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level' 
            });
        }

        const sql = `
            INSERT INTO sensor_data 
            (sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level];

        const [result] = await pool.execute(sql, values);

        res.status(201).json({
            message: 'Sensor data saved',
            data_id: result.insertId
        });

    } catch (error) {
        console.error('SensorData Error:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};

// GET all sensor data
exports.getAllSensorData = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM sensor_data ORDER BY created_at DESC'
        );

        res.json(rows);
    } catch (error) {
        console.error('SensorData Error:', error);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
};
