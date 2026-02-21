const pool = require('../config/database');

// CREATE feedback
exports.createFeedback = async (req, res) => {
    try {
        const { feedback_name, category, rating, message } = req.body;

        // Validate required field
        if (!rating) {
            return res.status(400).json({
                success: false,
                message: 'Rating is required',
                required: ['rating'],
                optional: ['feedback_name', 'category', 'message']
            });
        }

        // Validate rating (1-5)
        const parsedRating = parseInt(rating);
        if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be a number between 1 and 5'
            });
        }

        // Validate category
        const validCategories = ['Report a Bug', 'Improvement', 'General Feedback', 'Others'];
        if (category && !validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category',
                valid_options: validCategories
            });
        }

        const sql = `
            INSERT INTO feedback (feedback_name, category, rating, message)
            VALUES (?, ?, ?, ?)
        `;

        const [result] = await pool.execute(sql, [
            feedback_name || null,
            category      || null,
            parsedRating,
            message       || null
        ]);

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feeback_id: result.insertId
        });

    } catch (error) {
        console.error('Create Feedback Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// GET all feedback
exports.getAllFeedback = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM feedback ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('Get All Feedback Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// GET single feedback by ID
exports.getFeedbackById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await pool.execute(
            'SELECT * FROM feedback WHERE feeback_id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Feedback with ID "${id}" not found`
            });
        }

        res.json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error('Get Feedback By ID Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// GET feedback by category
exports.getFeedbackByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        const validCategories = ['Report a Bug', 'Improvement', 'General Feedback', 'Others'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category',
                valid_options: validCategories
            });
        }

        const [rows] = await pool.execute(
            'SELECT * FROM feedback WHERE category = ? ORDER BY created_at DESC',
            [category]
        );

        res.json({
            success: true,
            category,
            total: rows.length,
            data: rows
        });

    } catch (error) {
        console.error('Get Feedback By Category Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// GET feedback summary
exports.getFeedbackSummary = async (req, res) => {
    try {
        const [summary] = await pool.query(`
            SELECT 
                category,
                COUNT(*)               AS total,
                ROUND(AVG(rating), 1)  AS average_rating,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five_star,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS four_star,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS three_star,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS two_star,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS one_star
            FROM feedback
            GROUP BY category
            ORDER BY category
        `);

        const [overall] = await pool.query(`
            SELECT 
                COUNT(*)              AS total_feedback,
                ROUND(AVG(rating), 1) AS overall_rating
            FROM feedback
        `);

        res.json({
            success: true,
            overall: overall[0],
            by_category: summary
        });

    } catch (error) {
        console.error('Get Feedback Summary Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};

// DELETE feedback by ID
exports.deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;

        const [check] = await pool.execute(
            'SELECT feeback_id FROM feedback WHERE feeback_id = ?',
            [id]
        );

        if (check.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Feedback with ID "${id}" not found`
            });
        }

        await pool.execute('DELETE FROM feedback WHERE feeback_id = ?', [id]);

        res.json({
            success: true,
            message: `Feedback ID "${id}" deleted successfully`
        });

    } catch (error) {
        console.error('Delete Feedback Error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};