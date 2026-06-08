const express = require('express');
const router = express.Router();

const {
    getMyGym,
    upsertMyGym,
    getMyGymMembers,
    addMyGymMember,
    removeMyGymMember,
    getMyGymReports,
    getMyStudentContext,
    getStudentWorkouts,
    getStudentAssessments
} = require('../controllers/gymController');
const { requireProfile } = require('../middlewares/permissions');

router.get('/student-context', requireProfile('student'), getMyStudentContext);
router.get('/student-workouts', requireProfile('student'), getStudentWorkouts);
router.get('/student-assessments', requireProfile('student'), getStudentAssessments);
router.get('/me', requireProfile('gym'), getMyGym);
router.put('/me', requireProfile('gym'), upsertMyGym);
router.get('/me/reports', requireProfile('gym'), getMyGymReports);
router.get('/me/members', requireProfile('gym'), getMyGymMembers);
router.post('/me/members', requireProfile('gym'), addMyGymMember);
router.delete('/me/members/:id', requireProfile('gym'), removeMyGymMember);

module.exports = router;
