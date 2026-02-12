const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const { first_name, last_name, phone_number, password } = req.body;

    try {
        // 1. Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Insert user into database
        const [rows] = await pool.query(
            'INSERT INTO users (first_name, last_name, phone_number, password) VALUES (?, ?, ?, ?)',
            [first_name, last_name, phone_number, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        // Handle duplicate phone_number or other database errors
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Phone number already exists' });
        }
        res.status(500).json({ error: 'Database error', details: error.message });
    }
};

const login = async (req, res) => {
    const { phone_number, password } = req.body;

    try {
        // 1. Find the user by phone number
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE phone_number = ?',
            [phone_number]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        const user = rows[0];

        // 2. Compare password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        // 3. Sign JWT token
        const token = jwt.sign(
            { userId: user.user_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
        );

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Database error', details: error.message });
    }
};

module.exports = { register, login };
