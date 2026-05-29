const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const exerciseRoutes = require('./exercises');
const templateRoutes = require('./templates');
const routineRoutes = require('./routines');
const historyRoutes = require('./history');
const userRoutes = require('./users');
const gymRoutes = require('./gyms');

const { authenticateToken, isAdmin } = require('../middlewares/auth');
const { toUserDto } = require('../controllers/authController');

// Públicas
router.use('/auth', authRoutes);

// Protegidas
router.use('/exercises', authenticateToken, exerciseRoutes);
router.use('/templates', authenticateToken, templateRoutes);
router.use('/routines', authenticateToken, routineRoutes);
router.use('/history', authenticateToken, historyRoutes);
router.use('/gyms', authenticateToken, gymRoutes);
router.use('/users', authenticateToken, isAdmin, userRoutes);

// Usuário logado
router.get('/me', authenticateToken, (req, res) => {
    res.json({ user: toUserDto(req.user) });
});

// Health
router.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

module.exports = router;
