const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/hash');
const { seedDefaultExercises } = require('../utils/defaultExercises');
const { ensureUserProfiles, getUserProfiles, normalizeProfiles } = require('../utils/profiles');
const { applyPendingGymInvites } = require('../utils/gymMemberships');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const toUserDto = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.is_admin),
    profiles: normalizeProfiles(user.profiles || (user.is_admin ? ['student', 'admin'] : ['student']))
});

// LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const users = await query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];

        const validPassword = await comparePassword(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
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

// REGISTER
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const hashed = await hashPassword(password);

        const result = await query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashed]
        );
        await ensureUserProfiles(query, result.insertId);
        await applyPendingGymInvites(query, result.insertId, email);
        await seedDefaultExercises(query, result.insertId);

        res.status(201).json({ message: 'Usuário criado' });
    } catch (error) {
        console.error(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email já existe' });
        }

        res.status(500).json({ error: 'Erro ao registrar' });
    }
};

module.exports = { login, register, toUserDto };
