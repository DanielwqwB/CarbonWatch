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
        console.error('DB Connection Error:', err);
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
    } = req.body;

        if (
            sensor_id === undefined ||
            co2_density === undefined ||
            temperature_c === undefined ||
            humidity === undefined ||
            heat_index_c === undefined ||
            !carbon_level
        ) {
    return res.status(400).json({ error: 'Missing required fields' });
}


    const sql = `
        INSERT INTO sensor_data
        (sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        sensor_id,
        co2_density,
        temperature_c,
        humidity,
        heat_index_c,
        carbon_level
    ], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.status(201).json({
            success: true,
            data_id: result.insertId
        });
    });
});


// ========================
// Start server
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  
});
