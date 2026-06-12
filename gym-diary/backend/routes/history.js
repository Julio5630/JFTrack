const express = require('express');
const router = express.Router();

const {
    startWorkout,
    addSet,
    getHistory,
    getWorkoutDetails,
    deleteWorkout
} = require('../controllers/historyController');

// Histórico
router.get('/', getHistory);
router.get('/:id', getWorkoutDetails);
router.delete('/:id', deleteWorkout);

// Criar treino
router.post('/', startWorkout);

// Adicionar série
router.post('/:workoutId/sets', addSet);

module.exports = router;
