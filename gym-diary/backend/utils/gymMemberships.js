const { activateUserProfile } = require('./profiles');

const applyPendingGymInvites = async (query, userId, email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return;

    const pendingInvites = await query(
        `SELECT id, role
         FROM gym_memberships
         WHERE invited_email = ? AND status = 'pending'`,
        [normalizedEmail]
    );

    for (const invite of pendingInvites) {
        await query(
            `UPDATE gym_memberships
             SET user_id = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [userId, invite.id]
        );
        await activateUserProfile(query, userId, invite.role);
    }
};

module.exports = {
    applyPendingGymInvites
};
