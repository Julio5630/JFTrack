const { query } = require('../config/database');
const { hashPassword } = require('../utils/hash');
const { toUserDto } = require('./authController');
const { seedDefaultExercises } = require('../utils/defaultExercises');
const { ensureUserProfiles } = require('../utils/profiles');
const { applyPendingGymInvites } = require('../utils/gymMemberships');

const getUsers = async (req, res) => {
    try {
        const users = await query(
            'SELECT id, name, email, is_admin FROM users ORDER BY created_at DESC'
        );

        res.json(users.map(toUserDto));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar usuarios' });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, email, password, isAdmin = false } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios' });
        }

        const hashed = await hashPassword(password);
        const result = await query(
            'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
            [name, email, hashed, Boolean(isAdmin)]
        );
        await ensureUserProfiles(query, result.insertId, Boolean(isAdmin));
        await applyPendingGymInvites(query, result.insertId, email);
        await seedDefaultExercises(query, result.insertId);
        const profiles = await ensureUserProfiles(query, result.insertId, Boolean(isAdmin));

        res.status(201).json({
            user: {
                id: result.insertId,
                name,
                email,
                isAdmin: Boolean(isAdmin),
                profiles
            }
        });
    } catch (error) {
        console.error(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email ja existe' });
        }

        res.status(500).json({ error: 'Erro ao criar usuario' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, isAdmin = false } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Nome e email sao obrigatorios' });
        }

        if (password) {
            const hashed = await hashPassword(password);
            await query(
                'UPDATE users SET name = ?, email = ?, password = ?, is_admin = ? WHERE id = ?',
                [name, email, hashed, Boolean(isAdmin), id]
            );
        } else {
            await query(
                'UPDATE users SET name = ?, email = ?, is_admin = ? WHERE id = ?',
                [name, email, Boolean(isAdmin), id]
            );
        }

        res.json({ message: 'Usuario atualizado' });
    } catch (error) {
        console.error(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email ja existe' });
        }

        res.status(500).json({ error: 'Erro ao atualizar usuario' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (Number(id) === Number(req.user.id)) {
            return res.status(400).json({ error: 'Nao e possivel remover o proprio usuario' });
        }

        const result = await query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario nao encontrado' });
        }

        res.json({ message: 'Usuario removido' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao remover usuario' });
    }
};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};
