const express = require('express');
const router = express.Router();

const {
    createTemplate,
    getTemplates,
    updateTemplate,
    addExerciseToTemplate,
    getTemplateDetails,
    deleteTemplate
} = require('../controllers/templateController');
const { canManageOwnTraining } = require('../middlewares/permissions');

// Templates
router.get('/', getTemplates);
router.post('/', canManageOwnTraining, createTemplate);
router.get('/:id', getTemplateDetails);
router.put('/:id', canManageOwnTraining, updateTemplate);
router.delete('/:id', canManageOwnTraining, deleteTemplate);

// Adicionar exercício ao template
router.post('/:templateId/exercises', canManageOwnTraining, addExerciseToTemplate);

module.exports = router;
