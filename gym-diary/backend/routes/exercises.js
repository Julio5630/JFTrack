const express = require('express');
const router = express.Router();

const {
    createExercise,
    getExercises,
    updateExercise,
    deleteExercise
} = require('../controllers/exerciseController');

// Todas protegidas
router.get('/', getExercises);
router.post('/', createExercise);
router.put('/:id', updateExercise);
router.delete('/:id', deleteExercise);

module.exports = router;