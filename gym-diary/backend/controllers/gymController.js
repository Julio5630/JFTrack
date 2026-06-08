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

const toStudentMembershipDto = (membership) => ({
    id: membership.id,
    gymId: membership.gym_id,
    role: membership.role,
    status: membership.status,
    gym: {
        id: membership.gym_id,
        name: membership.gym_name,
        status: membership.gym_status,
        responsible: membership.gym_responsible
    }
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

const getMyGymReports = async (req, res) => {
    try {
        const gym = await getOwnedGym(req.user.id);
        if (!gym) {
            return res.status(404).json({ error: 'Academia nao configurada' });
        }

        const [
            activeStudents,
            activePersonals,
            assessmentsThisMonth,
            studentsWithAssessment,
            studentReports,
            personalReports,
            busyDays,
            busyHours
        ] = await Promise.all([
            query(
                `SELECT COUNT(*) AS total
                 FROM gym_memberships
                 WHERE gym_id = ? AND role = 'student' AND status = 'active' AND user_id IS NOT NULL`,
                [gym.id]
            ),
            query(
                `SELECT COUNT(*) AS total
                 FROM gym_memberships
                 WHERE gym_id = ? AND role = 'personal' AND status = 'active' AND user_id IS NOT NULL`,
                [gym.id]
            ),
            query(
                `SELECT COUNT(*) AS total
                 FROM physical_assessments
                 WHERE gym_id = ?
                   AND status = 'completed'
                   AND assessment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
                [gym.id]
            ),
            query(
                `SELECT COUNT(DISTINCT student_user_id) AS total
                 FROM physical_assessments
                 WHERE gym_id = ? AND status = 'completed'`,
                [gym.id]
            ),
            query(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    COALESCE(
                        GROUP_CONCAT(DISTINCT linked_personal.name ORDER BY linked_personal.name SEPARATOR ', '),
                        GROUP_CONCAT(DISTINCT assignment_personal.name ORDER BY assignment_personal.name SEPARATOR ', '),
                        GROUP_CONCAT(DISTINCT assessment_personal.name ORDER BY assessment_personal.name SEPARATOR ', ')
                    ) AS personal_names,
                    COUNT(DISTINCT CASE WHEN wh.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN wh.id END) AS weekly_frequency,
                    COUNT(DISTINCT CASE WHEN wh.date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN wh.id END) AS monthly_frequency,
                    DATE_FORMAT(MAX(pa.assessment_date), '%Y-%m-%d') AS last_assessment_date
                 FROM gym_memberships gm
                 JOIN users u ON u.id = gm.user_id
                 LEFT JOIN personal_student_links psl
                    ON psl.student_user_id = u.id AND psl.gym_id = gm.gym_id AND psl.status = 'active'
                 LEFT JOIN users linked_personal ON linked_personal.id = psl.personal_user_id
                 LEFT JOIN personal_workout_assignments pwa
                    ON pwa.student_user_id = u.id AND pwa.gym_id = gm.gym_id AND pwa.status = 'active'
                 LEFT JOIN users assignment_personal ON assignment_personal.id = pwa.personal_user_id
                 LEFT JOIN physical_assessments pa ON pa.student_user_id = u.id AND pa.gym_id = gm.gym_id
                 LEFT JOIN users assessment_personal ON assessment_personal.id = pa.personal_user_id
                 LEFT JOIN workout_history wh ON wh.user_id = u.id AND wh.gym_id = gm.gym_id
                 WHERE gm.gym_id = ? AND gm.role = 'student' AND gm.status = 'active' AND gm.user_id IS NOT NULL
                 GROUP BY u.id, u.name, u.email
                 ORDER BY u.name ASC`,
                [gym.id]
            ),
            query(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    COUNT(DISTINCT psl.student_user_id) AS linked_students,
                    COUNT(DISTINCT pa.id) AS assessments_done,
                    COUNT(DISTINCT CASE WHEN pa.assessment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN pa.id END) AS assessments_this_month,
                    ROUND(COUNT(DISTINCT CASE WHEN wh.date >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN wh.id END) / NULLIF(COUNT(DISTINCT psl.student_user_id), 0), 1) AS average_monthly_frequency
                 FROM gym_memberships gm
                 JOIN users u ON u.id = gm.user_id
                 LEFT JOIN personal_student_links psl
                    ON psl.personal_user_id = u.id AND psl.gym_id = gm.gym_id AND psl.status = 'active'
                 LEFT JOIN physical_assessments pa
                    ON pa.personal_user_id = u.id AND pa.gym_id = gm.gym_id AND pa.status = 'completed'
                 LEFT JOIN workout_history wh
                    ON wh.user_id = psl.student_user_id AND wh.gym_id = gm.gym_id
                 WHERE gm.gym_id = ? AND gm.role = 'personal' AND gm.status = 'active' AND gm.user_id IS NOT NULL
                 GROUP BY u.id, u.name, u.email
                 ORDER BY u.name ASC`,
                [gym.id]
            ),
            query(
                `SELECT DAYNAME(date) AS day_name, DAYOFWEEK(date) AS day_order, COUNT(*) AS total
                 FROM workout_history
                 WHERE gym_id = ?
                 GROUP BY DAYNAME(date), DAYOFWEEK(date)
                 ORDER BY total DESC, day_order ASC
                 LIMIT 5`,
                [gym.id]
            ),
            query(
                `SELECT HOUR(created_at) AS hour, COUNT(*) AS total
                 FROM workout_history
                 WHERE gym_id = ?
                 GROUP BY HOUR(created_at)
                 ORDER BY total DESC, hour ASC
                 LIMIT 5`,
                [gym.id]
            )
        ]);

        const totalActiveStudents = Number(activeStudents[0]?.total || 0);
        const totalAssessedStudents = Number(studentsWithAssessment[0]?.total || 0);

        res.json({
            summary: {
                totalActiveStudents,
                totalActivePersonals: Number(activePersonals[0]?.total || 0),
                assessmentsThisMonth: Number(assessmentsThisMonth[0]?.total || 0),
                pendingAssessmentStudents: Math.max(totalActiveStudents - totalAssessedStudents, 0)
            },
            students: studentReports.map((student) => ({
                id: student.id,
                name: student.name,
                email: student.email,
                personalNames: student.personal_names || 'Sem personal responsavel',
                weeklyFrequency: Number(student.weekly_frequency || 0),
                monthlyFrequency: Number(student.monthly_frequency || 0),
                lastAssessmentDate: student.last_assessment_date || null
            })),
            personals: personalReports.map((personal) => ({
                id: personal.id,
                name: personal.name,
                email: personal.email,
                linkedStudents: Number(personal.linked_students || 0),
                assessmentsDone: Number(personal.assessments_done || 0),
                assessmentsThisMonth: Number(personal.assessments_this_month || 0),
                averageMonthlyFrequency: Number(personal.average_monthly_frequency || 0)
            })),
            busyDays: busyDays.map((item) => ({
                dayName: item.day_name,
                total: Number(item.total || 0)
            })),
            busyHours: busyHours.map((item) => ({
                hour: Number(item.hour),
                total: Number(item.total || 0)
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatorios da academia' });
    }
};

const getMyStudentContext = async (req, res) => {
    try {
        const memberships = await query(
            `SELECT gm.*, g.name AS gym_name, g.status AS gym_status, g.responsible AS gym_responsible
             FROM gym_memberships gm
             JOIN gyms g ON g.id = gm.gym_id
             WHERE gm.user_id = ? AND gm.role = 'student' AND gm.status = 'active'
             ORDER BY gm.updated_at DESC`,
            [req.user.id]
        );

        res.json({
            isAcademyStudent: memberships.length > 0,
            memberships: memberships.map(toStudentMembershipDto)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar contexto do aluno' });
    }
};

const getStudentWorkouts = async (req, res) => {
    try {
        const selectedGymId = req.get('X-Selected-Student-Gym-Id') || null;
        const params = [req.user.id];
        const gymClause = selectedGymId ? 'AND pwa.gym_id = ?' : '';
        if (selectedGymId) params.push(selectedGymId);

        const templates = await query(
            `SELECT wt.*, u.name AS trainer_name, pwa.id AS assignment_id,
                    pwa.gym_id AS assignment_gym_id, pwa.notes AS assignment_notes
             FROM personal_workout_assignments pwa
             JOIN workout_templates wt ON wt.id = pwa.template_id
             JOIN users u ON u.id = pwa.personal_user_id
             WHERE pwa.student_user_id = ? AND pwa.status = 'active' ${gymClause}
             ORDER BY pwa.updated_at DESC`,
            params
        );

        if (templates.length === 0) {
            return res.json({ templates: [], exercises: [] });
        }

        const templateIds = templates.map((template) => template.id);
        const templateExercises = await query(
            `SELECT
                te.template_id,
                te.exercise_id AS id,
                te.default_sets AS defaultSets,
                te.default_reps AS defaultReps,
                te.position,
                e.name,
                e.category,
                e.gif_url AS gifUrl,
                e.user_id AS ownerUserId
             FROM template_exercises te
             JOIN exercises e ON e.id = te.exercise_id
             WHERE te.template_id IN (?)
             ORDER BY te.template_id, te.position ASC`,
            [templateIds]
        );

        const exerciseMap = new Map();
        templateExercises.forEach((exercise) => {
            if (!exerciseMap.has(exercise.id)) {
                exerciseMap.set(exercise.id, {
                    id: exercise.id,
                    user_id: exercise.ownerUserId,
                    name: exercise.name,
                    category: exercise.category,
                    gifUrl: exercise.gifUrl,
                    gif_url: exercise.gifUrl
                });
            }
        });

        res.json({
            templates: templates.map((template) => ({
                ...template,
                ownerUserId: template.user_id,
                creatorName: template.trainer_name,
                trainerName: template.trainer_name,
                assignmentId: template.assignment_id,
                gymId: template.assignment_gym_id || template.gym_id || null,
                assignmentNotes: template.assignment_notes || '',
                canEdit: false,
                exercises: templateExercises
                    .filter((exercise) => exercise.template_id === template.id)
                    .map(({ template_id, position, name, category, gifUrl, ownerUserId, ...exercise }) => exercise)
            })),
            exercises: Array.from(exerciseMap.values())
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar treinos do aluno' });
    }
};

const getStudentAssessments = async (req, res) => {
    try {
        const selectedGymId = req.get('X-Selected-Student-Gym-Id') || null;
        const params = [req.user.id];
        const gymClause = selectedGymId ? 'AND pa.gym_id = ?' : '';
        if (selectedGymId) params.push(selectedGymId);

        const assessments = await query(
            `SELECT pa.*, DATE_FORMAT(pa.assessment_date, '%Y-%m-%d') AS assessment_date,
                    u.name AS personal_name, g.name AS gym_name
             FROM physical_assessments pa
             JOIN users u ON u.id = pa.personal_user_id
             LEFT JOIN gyms g ON g.id = pa.gym_id
             WHERE pa.student_user_id = ? ${gymClause}
             ORDER BY pa.assessment_date DESC, pa.created_at DESC`,
            params
        );

        res.json({
            assessments: assessments.map((assessment) => ({
                id: assessment.id,
                assessmentDate: assessment.assessment_date,
                goal: assessment.goal || '',
                workoutSuggestion: assessment.workout_suggestion || '',
                bmi: assessment.bmi !== null ? Number(assessment.bmi) : null,
                medicalAlert: Boolean(assessment.medical_alert),
                medicalAlertMessage: assessment.medical_alert_message || '',
                personal: { name: assessment.personal_name },
                gym: assessment.gym_name ? { name: assessment.gym_name } : null
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar avaliacoes do aluno' });
    }
};

module.exports = {
    getMyGym,
    upsertMyGym,
    getMyGymMembers,
    addMyGymMember,
    removeMyGymMember,
    getMyGymReports,
    getMyStudentContext,
    getStudentWorkouts,
    getStudentAssessments
};
