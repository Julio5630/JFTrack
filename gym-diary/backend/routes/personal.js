const express = require('express');
const router = express.Router();

const {
    getSummary,
    listGyms,
    listStudents,
    addStudentByEmail,
    getStudentProfile,
    listAssignments,
    assignWorkout,
    updateAssignment,
    listAssessments,
    createAssessment,
    updateAssessment
} = require('../controllers/personalController');
const { requireProfile } = require('../middlewares/permissions');

router.use(requireProfile('personal'));

router.get('/summary', getSummary);
router.get('/gyms', listGyms);
router.get('/students', listStudents);
router.post('/students', addStudentByEmail);
router.get('/students/:id', getStudentProfile);
router.get('/assignments', listAssignments);
router.post('/assignments', assignWorkout);
router.put('/assignments/:id', updateAssignment);
router.get('/assessments', listAssessments);
router.post('/assessments', createAssessment);
router.put('/assessments/:id', updateAssessment);

module.exports = router;
