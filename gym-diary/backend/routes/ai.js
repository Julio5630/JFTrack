const express = require('express');

const { suggestWorkout, summarizeAssessment } = require('../controllers/aiController');

const router = express.Router();

router.post('/workout-suggestion', suggestWorkout);
router.post('/assessment-summary', summarizeAssessment);

module.exports = router;
