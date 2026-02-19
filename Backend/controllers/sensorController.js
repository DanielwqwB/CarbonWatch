const pool = require('../config/database');

/**
 * CREATE SENSOR
 * Barangay-level OR Establishment-level
 */
exports.createSensor = async (req, res) => {
    const { sensor_name, barangay_id, establishment_id } = req.body;

    if (!sensor_name || !barangay_id) {
        return res.status(400).json({
            message: 'sensor_name and barangay_id are required'
        });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO sensor (sensor_name, barangay_id, establishment_id)
             VALUES (?, ?, ?)`,
            [sensor_name, barangay_id, establishment_id || null]
        );

        res.status(201).json({
            message: 'Sensor created successfully',
            sensor_id: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create sensor' });
    }
};

/**
 * GET ALL SENSORS (WITH RESOLVED LOCATION)
 */
exports.getAllSensors = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                s.sensor_id,
                s.sensor_name,
                s.installed_on,

                b.barangay_name,
                COALESCE(e.establishment_name, 'Barangay Level') AS establishment_name,

                COALESCE(e.latitude, b.latitude) AS latitude,
                COALESCE(e.longitude, b.longitude) AS longitude

            FROM sensor s
            JOIN barangay b ON s.barangay_id = b.barangay_id
            LEFT JOIN establishment e ON s.establishment_id = e.establishment_id
            ORDER BY s.sensor_id DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch sensors' });
    }
};

/**
 * GET SENSOR BY ID
 */
exports.getSensorById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.execute(`
            SELECT 
                s.sensor_id,
                s.sensor_name,
                s.installed_on,

                b.barangay_name,
                e.establishment_name,

                COALESCE(e.latitude, b.latitude) AS latitude,
                COALESCE(e.longitude, b.longitude) AS longitude

            FROM sensor s
            JOIN barangay b ON s.barangay_id = b.barangay_id
            LEFT JOIN establishment e ON s.establishment_id = e.establishment_id
            WHERE s.sensor_id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Sensor not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch sensor' });
    }
};

/**
 * UPDATE SENSOR
 */
exports.updateSensor = async (req, res) => {
    const { id } = req.params;
    const { sensor_name, barangay_id, establishment_id } = req.body;

    try {
        const [result] = await pool.execute(
            `UPDATE sensor
             SET sensor_name = ?, barangay_id = ?, establishment_id = ?
             WHERE sensor_id = ?`,
            [sensor_name, barangay_id, establishment_id || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sensor not found' });
        }

        res.json({ message: 'Sensor updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update sensor' });
    }
};

/**
 * DELETE SENSOR
 */
exports.deleteSensor = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await pool.execute(
            `DELETE FROM sensor WHERE sensor_id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Sensor not found' });
        }

        res.json({ message: 'Sensor deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete sensor' });
    }
};

/**
 * GET SENSOR DATA (LATEST READINGS)
 */
exports.getSensorData = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.execute(`
            SELECT *
            FROM sensor_data
            WHERE sensor_id = ?
            ORDER BY recorded_at DESC
        `, [id]);

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch sensor data' });
    }
};