const { query } = require('../config/database');

const hasProfile = (user, profileType) => (
    user?.profiles?.some((profile) => profile.type === profileType || profile.profile_type === profileType)
);

const isAcademyStudent = async (userId) => {
    const memberships = await query(
        `SELECT id
         FROM gym_memberships
         WHERE user_id = ? AND role = 'student' AND status = 'active'
         LIMIT 1`,
        [userId]
    );

    return memberships.length > 0;
};

const requireProfile = (profileType) => (req, res, next) => {
    if (!hasProfile(req.user, profileType) || (req.activeProfile && req.activeProfile !== profileType)) {
        return res.status(403).json({ error: 'Perfil sem permissao para esta acao' });
    }

    next();
};

const canManageOwnTraining = async (req, res, next) => {
    try {
        if (req.user?.is_admin && req.activeProfile === 'admin') {
            return next();
        }

        if (hasProfile(req.user, 'personal') && req.activeProfile === 'personal') {
            return next();
        }

        if (!hasProfile(req.user, 'student') || req.activeProfile !== 'student') {
            return res.status(403).json({ error: 'Perfil sem permissao para gerenciar treinos' });
        }

        if (req.get('X-Student-Training-Mode') === 'academy' && await isAcademyStudent(req.user.id)) {
            return res.status(403).json({ error: 'Aluno vinculado a academia nao pode criar ou alterar treinos e exercicios' });
        }

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao validar permissoes' });
    }
};

module.exports = {
    hasProfile,
    isAcademyStudent,
    requireProfile,
    canManageOwnTraining
};
