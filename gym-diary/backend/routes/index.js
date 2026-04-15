const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const exerciseRoutes = require('./exercises');
const templateRoutes = require('./templates');
const routineRoutes = require('./routines');
const historyRoutes = require('./history');

const { authenticateToken } = require('../middlewares/auth');

// Públicas
router.use('/auth', authRoutes);

// Protegidas
router.use('/exercises', authenticateToken, exerciseRoutes);
router.use('/templates', authenticateToken, templateRoutes);
router.use('/routines', authenticateToken, routineRoutes);
router.use('/history', authenticateToken, historyRoutes);

// Usuário logado
router.get('/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Health
router.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

module.exports = router;