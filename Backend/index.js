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
const db = mysql.createConnection({
    host: 'mmysql-360d30a7-gbox-6009.a.aivencloud.com',
    user: 'avnadmin',
    password: 'AVNS_xRg_1Ymj9oje4V_wSeq',
    database: 'defaultdb',
    port: 11105
});

db.connect(err => {
    if (err) {
        console.error('DB Connection Error:', err);
    } else {
        console.log('✅ MySQL Connected');
    }
});

// ========================
// Helper: Carbon level logic
// ========================
function getCarbonLevel(co2) {
    if (co2 === null || co2 === undefined) return null;
    if (co2 >= 0.2) return 'VERY HIGH';
    if (co2 >= 0.15) return 'HIGH';
    if (co2 >= 0.08) return 'NORMAL';
    return 'LOW';
}

// ========================
// Helper: Heat index calculation (optional)
// ========================
function calculateHeatIndex(temperature_c, humidity) {
    if (temperature_c === undefined || humidity === undefined) return null;
    // simple approximation formula
    const T = temperature_c;
    const R = humidity;
    const HI = 0.5 * (T + 61.0 + ((T-68.0)*1.2) + (R*0.094));
    return parseFloat(HI.toFixed(2));
}

// ========================
// POST: Insert sensor data
// ========================
app.post('/sensor-data', (req, res) => {
    const {
        sensor_id,
        co2_density = null,
        temperature_c = null,
        humidity = null
    } = req.body;

    // Validate required field
    if (!sensor_id) {
        return res.status(400).json({ 
            error: 'Missing required field: sensor_id' 
        });
    }

    const heat_index_c = calculateHeatIndex(temperature_c, humidity);
    const carbon_level = getCarbonLevel(co2_density);

    const sql = `
        INSERT INTO sensor_data
        (sensor_id, co2_density, temperature_c, humidity, heat_index_c, carbon_level)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
        sensor_id,
        co2_density,
        temperature_c,
        humidity,
        heat_index_c,
        carbon_level
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('DB Insert Error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        res.status(201).json({ success: true, data_id: result.insertId });
    });
});

// ========================
// GET: Latest sensor data for a sensor
// ========================
app.get('/sensor-data/latest/:sensor_id', (req, res) => {
    const { sensor_id } = req.params;

    if (!sensor_id) return res.status(400).json({ error: 'sensor_id is required' });

    const sql = `
        SELECT *
        FROM sensor_data
        WHERE sensor_id = ?
        ORDER BY recorded_at DESC
        LIMIT 1
    `;

    db.query(sql, [sensor_id], (err, results) => {
        if (err) {
            console.error('DB Query Error:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        if (results.length === 0) return res.status(404).json({ message: 'No data found for this sensor' });
        res.json(results[0]);
    });
});

// ========================
// Start server
// ========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
