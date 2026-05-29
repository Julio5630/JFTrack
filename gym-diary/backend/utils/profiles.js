const PROFILE_LABELS = {
    student: 'Aluno',
    personal: 'Personal',
    gym: 'Academia',
    admin: 'Admin'
};

const VALID_PROFILES = Object.keys(PROFILE_LABELS);

const normalizeProfiles = (profiles = []) => {
    const unique = new Set();

    profiles.forEach((profile) => {
        const value = typeof profile === 'string' ? profile : profile?.profile_type || profile?.type;
        if (VALID_PROFILES.includes(value)) {
            unique.add(value);
        }
    });

    if (unique.size === 0) {
        unique.add('student');
    }

    return Array.from(unique).map((type) => ({
        type,
        label: PROFILE_LABELS[type]
    }));
};

const getUserProfiles = async (query, userId, isAdmin = false) => {
    const rows = await query(
        'SELECT profile_type FROM user_profiles WHERE user_id = ? AND status = ? ORDER BY profile_type',
        [userId, 'active']
    );

    const profileTypes = rows.map((row) => row.profile_type);
    if (isAdmin && !profileTypes.includes('admin')) {
        profileTypes.push('admin');
    }

    return normalizeProfiles(profileTypes);
};

const ensureUserProfiles = async (query, userId, isAdmin = false) => {
    await query(
        `INSERT INTO user_profiles (user_id, profile_type, status)
         VALUES (?, 'student', 'active')
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [userId]
    );

    if (isAdmin) {
        await query(
            `INSERT INTO user_profiles (user_id, profile_type, status)
             VALUES (?, 'admin', 'active')
             ON DUPLICATE KEY UPDATE status = VALUES(status)`,
            [userId]
        );
    }

    return getUserProfiles(query, userId, isAdmin);
};

const activateUserProfile = async (query, userId, profileType) => {
    if (!VALID_PROFILES.includes(profileType)) {
        throw new Error('Perfil invalido');
    }

    await query(
        `INSERT INTO user_profiles (user_id, profile_type, status)
         VALUES (?, ?, 'active')
         ON DUPLICATE KEY UPDATE status = VALUES(status)`,
        [userId, profileType]
    );
};

module.exports = {
    PROFILE_LABELS,
    VALID_PROFILES,
    normalizeProfiles,
    getUserProfiles,
    ensureUserProfiles,
    activateUserProfile
};
