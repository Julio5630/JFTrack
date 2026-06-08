const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hash');
const { seedDefaultExercises } = require('../utils/defaultExercises');
const { ensureUserProfiles, getUserProfiles, normalizeProfiles, activateUserProfile } = require('../utils/profiles');
const { applyPendingGymInvites } = require('../utils/gymMemberships');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const toUserDto = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.is_admin),
    profiles: normalizeProfiles(user.profiles || (user.is_admin ? ['student', 'admin'] : ['student']))
});

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const users = await query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciais invalidas' });
        }

        const user = users[0];
        const validPassword = await comparePassword(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais invalidas' });
        }

        const token = jwt.sign(
            { id: user.id, is_admin: user.is_admin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        const profiles = await getUserProfiles(query, user.id, Boolean(user.is_admin));

        res.json({
            token,
            user: toUserDto({ ...user, profiles })
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro no login' });
    }
};

const register = async (req, res) => {
    try {
        const { name, email, password, accountType = 'student', gymName = '' } = req.body;
        const normalizedAccountType = accountType === 'gym' ? 'gym' : 'student';

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, e-mail e senha sao obrigatorios' });
        }

        if (normalizedAccountType === 'gym' && !String(gymName).trim()) {
            return res.status(400).json({ error: 'Nome da academia e obrigatorio' });
        }

        const hashed = await hashPassword(password);
        const normalizedEmail = String(email).trim().toLowerCase();
        const normalizedName = String(name).trim();

        const result = await query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [normalizedName, normalizedEmail, hashed]
        );

        if (normalizedAccountType === 'gym') {
            await activateUserProfile(query, result.insertId, 'gym');
            await query(
                `INSERT INTO gyms (owner_user_id, name, email, responsible, status)
                 VALUES (?, ?, ?, ?, 'active')
                 ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    email = VALUES(email),
                    responsible = VALUES(responsible),
                    status = 'active',
                    updated_at = CURRENT_TIMESTAMP`,
                [result.insertId, String(gymName).trim(), normalizedEmail, normalizedName]
            );
        } else {
            await ensureUserProfiles(query, result.insertId);
            await applyPendingGymInvites(query, result.insertId, normalizedEmail);
            await seedDefaultExercises(query, result.insertId);
        }

        res.status(201).json({ message: 'Usuario criado' });
    } catch (error) {
        console.error(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email ja existe' });
        }

        res.status(500).json({ error: 'Erro ao registrar' });
    }
};

module.exports = { login, register, toUserDto };
