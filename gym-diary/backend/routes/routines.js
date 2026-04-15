const express = require('express');
const router = express.Router();

const {
    setRoutine,
    getRoutine,
    deleteRoutine
} = require('../controllers/routineController');

// Rotina semanal
router.get('/', getRoutine);
router.post('/', setRoutine);
router.delete('/:day', deleteRoutine);

module.exports = router;