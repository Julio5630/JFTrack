const { query } = require('../config/database');
const { activateUserProfile, getUserProfiles } = require('../utils/profiles');
const { toUserDto } = require('./authController');

const toGymDto = (gym) => ({
    id: gym.id,
    ownerUserId: gym.owner_user_id,
    name: gym.name,
    phone: gym.phone,
    email: gym.email,
    address: gym.address,
    responsible: gym.responsible,
    status: gym.status,
    createdAt: gym.created_at,
    updatedAt: gym.updated_at
});

const toMembershipDto = (membership) => ({
    id: membership.id,
    gymId: membership.gym_id,
    userId: membership.user_id,
    invitedEmail: membership.invited_email,
    role: membership.role,
    status: membership.status,
    createdAt: membership.created_at,
    updatedAt: membership.updated_at,
    user: membership.user_id ? {
        id: membership.user_id,
        name: membership.user_name,
        email: membership.user_email
    } : null
});

const normalizeRole = (role) => (role === 'personal' ? 'personal' : 'student');

const getOwnedGym = async (userId) => {
    const gyms = await query(
        'SELECT * FROM gyms WHERE owner_user_id = ? LIMIT 1',
        [userId]
    );

    return gyms[0] || null;
};

const getMyGym = async (req, res) => {
    try {
        const gyms = await query(
            'SELECT * FROM gyms WHERE owner_user_id = ? LIMIT 1',
            [req.user.id]
        );

        res.json({ gym: gyms[0] ? toGymDto(gyms[0]) : null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar academia' });
    }
};

const upsertMyGym = async (req, res) => {
    try {
        const { name, phone = '', email = '', address = '', responsible = '', status = 'active' } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Nome da academia e obrigatorio' });
        }

        const normalizedStatus = status === 'inactive' ? 'inactive' : 'active';

        await query(
            `INSERT INTO gyms (owner_user_id, name, phone, email, address, responsible, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                phone = VALUES(phone),
                email = VALUES(email),
                address = VALUES(address),
                responsible = VALUES(responsible),
                status = VALUES(status),
                updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, name.trim(), phone.trim(), email.trim(), address.trim(), responsible.trim(), normalizedStatus]
        );

        await query(
            `INSERT INTO user_profiles (user_id, profile_type, status)
             VALUES (?, 'gym', 'active')
             ON DUPLICATE KEY UPDATE status = VALUES(status)`,
            [req.user.id]
        );

        const gyms = await query(
            'SELECT * FROM gyms WHERE owner_user_id = ? LIMIT 1',
            [req.user.id]
        );

        const profiles = await getUserProfiles(query, req.user.id, Boolean(req.user.is_admin));

        res.status(201).json({
            gym: toGymDto(gyms[0]),
            user: toUserDto({ ...req.user, profiles })
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar academia' });
    }
};

const getMyGymMembers = async (req, res) => {
    try {
        const gym = await getOwnedGym(req.user.id);
        if (!gym) {
            return res.status(404).json({ error: 'Academia nao configurada' });
        }

        const role = normalizeRole(req.query.role);
        const memberships = await query(
            `SELECT gm.*, u.name AS user_name, u.email AS user_email
             FROM gym_memberships gm
             LEFT JOIN users u ON u.id = gm.user_id
             WHERE gm.gym_id = ? AND gm.role = ? AND gm.status <> 'removed'
             ORDER BY gm.status ASC, gm.created_at DESC`,
            [gym.id, role]
        );

        res.json({ members: memberships.map(toMembershipDto) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar vinculos da academia' });
    }
};

const addMyGymMember = async (req, res) => {
    try {
        const gym = await getOwnedGym(req.user.id);
        if (!gym) {
            return res.status(404).json({ error: 'Configure a academia antes de adicionar usuarios' });
        }

        const email = String(req.body.email || '').trim().toLowerCase();
        const role = normalizeRole(req.body.role);

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'E-mail valido e obrigatorio' });
        }

        const users = await query(
            'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
            [email]
        );
        const foundUser = users[0] || null;
        const status = foundUser ? 'active' : 'pending';

        await query(
            `INSERT INTO gym_memberships (gym_id, user_id, invited_email, role, status)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                user_id = COALESCE(VALUES(user_id), gym_memberships.user_id),
                status = VALUES(status),
                updated_at = CURRENT_TIMESTAMP`,
            [gym.id, foundUser?.id || null, email, role, status]
        );

        if (foundUser) {
            await activateUserProfile(query, foundUser.id, role);
        }

        const memberships = await query(
            `SELECT gm.*, u.name AS user_name, u.email AS user_email
             FROM gym_memberships gm
             LEFT JOIN users u ON u.id = gm.user_id
             WHERE gm.gym_id = ? AND gm.invited_email = ? AND gm.role = ?
             LIMIT 1`,
            [gym.id, email, role]
        );

        res.status(201).json({
            member: toMembershipDto(memberships[0]),
            createdInvitation: !foundUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar usuario a academia' });
    }
};

const removeMyGymMember = async (req, res) => {
    try {
        const gym = await getOwnedGym(req.user.id);
        if (!gym) {
            return res.status(404).json({ error: 'Academia nao configurada' });
        }

        const result = await query(
            `UPDATE gym_memberships
             SET status = 'removed', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND gym_id = ?`,
            [req.params.id, gym.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Vinculo nao encontrado' });
        }

        res.json({ message: 'Vinculo removido' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao remover vinculo' });
    }
};

module.exports = {
    getMyGym,
    upsertMyGym,
    getMyGymMembers,
    addMyGymMember,
    removeMyGymMember
};
