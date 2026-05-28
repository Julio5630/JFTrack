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

// Templates
router.get('/', getTemplates);
router.post('/', createTemplate);
router.get('/:id', getTemplateDetails);
router.put('/:id', updateTemplate);
router.delete('/:id', deleteTemplate);

// Adicionar exercício ao template
router.post('/:templateId/exercises', addExerciseToTemplate);

module.exports = router;
