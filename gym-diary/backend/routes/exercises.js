const express = require('express');
const router = express.Router();

const {
    createExercise,
    getExercises,
    updateExercise,
    deleteExercise
} = require('../controllers/exerciseController');
const { canManageOwnTraining } = require('../middlewares/permissions');

// Todas protegidas
router.get('/', getExercises);
router.post('/', canManageOwnTraining, createExercise);
router.put('/:id', canManageOwnTraining, updateExercise);
router.delete('/:id', canManageOwnTraining, deleteExercise);

module.exports = router;
