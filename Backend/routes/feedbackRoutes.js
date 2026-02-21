const express    = require('express');
const router     = express.Router();
const feedback   = require('../controllers/feedbackController');

router.post('/create/feedback',                    feedback.createFeedback);
router.get('/feedback',                     feedback.getAllFeedback);
router.get('/feedback/summary',              feedback.getFeedbackSummary);
router.get('/feedback/:category',   feedback.getFeedbackByCategory);
router.get('/feedback/:id',                  feedback.getFeedbackById);
router.delete('/feedback/:id',               feedback.deleteFeedback);

module.exports = router;