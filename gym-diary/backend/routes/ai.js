const express = require('express');

const { suggestWorkout, summarizeAssessment, generateAssessmentPlan } = require('../controllers/aiController');

const router = express.Router();

router.post('/workout-suggestion', suggestWorkout);
router.post('/assessment-summary', summarizeAssessment);
router.post('/assessment-plan', generateAssessmentPlan);

module.exports = router;
