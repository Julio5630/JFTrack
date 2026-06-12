const express = require('express');
const { requireProfile } = require('../middlewares/permissions');
const { listBodyMetrics, createBodyMetric, deleteBodyMetric } = require('../controllers/bodyMetricsController');

const router = express.Router();

router.use(requireProfile('student'));
router.use((req, res, next) => {
    if (req.activeProfile !== 'student') {
        return res.status(403).json({ error: 'Metricas corporais disponiveis apenas no perfil de aluno' });
    }
    next();
});
router.get('/', listBodyMetrics);
router.post('/', createBodyMetric);
router.delete('/:id', deleteBodyMetric);

module.exports = router;
