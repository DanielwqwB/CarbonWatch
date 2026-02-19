const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ========================
// MySQL connection
// ========================

db.connect(err => {
    if (err) {
        console.error('❌ DB Connection Error:', err);
    } else {
        console.log('✅ MySQL Connected');
    }
});

// ========================
// POST: Insert sensor data
// ========================
app.post('/create/sensor-data', (req, res) => {
    const {
        sensor_id,
        co2_density,
        temperature_c,
        humidity,
        heat_index_c,
        carbon_level
        // ✅ minute_stamp removed from body — server generates it
    } = req.body;

    // ✅ Validate (no minute_stamp required from IoT)
    if (
        sensor_id === undefined ||
        co2_density === undefined ||
        temperature_c === undefined ||
        humidity === undefined ||
        heat_index_c === undefined ||
        !carbon_level
    ) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            required: ['sensor_id', 'co2_density', 'temperature_c', 'humidity', 'heat_index_c', 'carbon_level']
        });
    }

    // ✅ Step 1: Check if sensor_id exists
    db.query('SELECT sensor_id FROM sensor WHERE sensor_id = ?', [sensor_id], (err, rows) => {
        if (err) {
            console.error('Sensor check error:', err);
            return res.status(500).json({
                success: false,
                error: 'Database error during sensor check',
                details: err.message  // ✅ actual error shown
            });
        }

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Sensor ID "${sensor_id}" not found. Register the sensor first.`
            });
        }

        // ✅ Step 2: Generate minute_stamp on the server
        const now = new Date();
        now.setSeconds(0, 0);
        const minute_stamp = now.toISOString().slice(0, 19).replace('T', ' '); // MySQL DATETIME format

        const sql = `
            INSERT INTO sensor_data
            (sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level, minute_stamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(sql, [
            sensor_id,
            parseFloat(co2_density),
            parseFloat(temperature_c),
            parseFloat(humidity),
            parseFloat(heat_index_c),
            carbon_level,
            minute_stamp
        ], (err, result) => {
            if (err) {
                // ✅ Handle duplicate minute entry
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        error: 'Sensor already submitted data for this minute'
                    });
                }

                console.error('Insert error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'Database insert error',
                    details: err.message  // ✅ actual error shown
                });
            }

            res.status(201).json({
                success: true,
                message: 'Sensor data saved',
                data_id: result.insertId,
                minute_stamp  // ✅ echo back so IoT knows what was recorded
            });
        });
    });
});

// ========================
// GET: Latest reading by sensor
// ========================
app.get('/sensor-data/:sensor_id', (req, res) => {
    const { sensor_id } = req.params; // ✅ fixed from req.params (was broken before)

    const sql = `
        SELECT * FROM sensor_data
        WHERE sensor_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    `;

    db.query(sql, [sensor_id], (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: 'Database error',
                details: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No data found for this sensor'
            });
        }

        res.json({ success: true, data: results[0] });
    });
});

// ========================
// Start server
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});