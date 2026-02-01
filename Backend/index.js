const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
    host: 'mysql-32f781d8-gbox-6009.h.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_ZqGKBUdWc2m5Ys2X2qr',
    database: 'defaultdb'
});

db.connect(err => {
    if (err) {
        console.error('DB Connection Error:', err);
    } else {
        console.log('✅ MySQL Connected');
    }
});


// Helper: Carbon level logic
function getCarbonLevel(co2) {
    if (co2 >= 0.2) return 'VERY HIGH';
    if (co2 >= 0.15) return 'HIGH';
    if (co2 >= 0.08) return 'NORMAL';
    return 'LOW';
}


// POST: Insert sensor data
app.post('/sensor-data', (req, res) => {
    const {
        sensor_id,
        mq2_analog,
        methane_ppm,
        co2_density,
        temperature_c,
        humidity
    } = req.body;

    if (!sensor_id || !mq2_analog || !temperature_c || !humidity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const temperature_f = (temperature_c * 9/5) + 32;
    const carbon_level = getCarbonLevel(co2_density);

    const sql = `
        INSERT INTO sensor_data
        (sensor_id, mq2_analog, methane_ppm, co2_density,
         temperature_c, temperature_f, humidity, carbon_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
        sensor_id,
        mq2_analog,
        methane_ppm,
        co2_density,
        temperature_c,
        temperature_f,
        humidity,
        carbon_level
    ], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true, data_id: result.insertId });
    });
});


// GET: Latest sensor data
app.get('/sensor-data/latest/:sensor_id', (req, res) => {
    const { sensor_id } = req.params;

    const sql = `
        SELECT *
        FROM sensor_data
        WHERE sensor_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1
    `;

    db.query(sql, [sensor_id], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results[0]);
    });
});

// Start server

app.listen(3000, () => {
    console.log('Server running on port 3000');
});