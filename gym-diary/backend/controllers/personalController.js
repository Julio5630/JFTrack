const { pool, query } = require('../config/database');

const getPersonalGymIds = async (personalUserId) => {
    const memberships = await query(
        `SELECT gym_id
         FROM gym_memberships
         WHERE user_id = ? AND role = 'personal' AND status = 'active'`,
        [personalUserId]
    );

    return memberships.map((membership) => membership.gym_id);
};

const getRequestedGymId = (req) => req.query.gymId || req.body.gymId || null;

const getPersonalGyms = async (personalUserId) => query(
    `SELECT g.id, g.name
     FROM gym_memberships gm
     JOIN gyms g ON g.id = gm.gym_id
     WHERE gm.user_id = ? AND gm.role = 'personal' AND gm.status = 'active'
     ORDER BY g.name ASC`,
    [personalUserId]
);

const getPersonalStudents = async (personalUserId, search = '', gymId = null) => {
    const gymIds = await getPersonalGymIds(personalUserId);
    if (gymIds.length === 0) return [];

    const scopedGymIds = gymId && gymIds.some((id) => Number(id) === Number(gymId))
        ? [Number(gymId)]
        : gymIds;
    const normalizedSearch = `%${String(search || '').trim().toLowerCase()}%`;
    const gymPlaceholders = scopedGymIds.map(() => '?').join(', ');
    const params = [...scopedGymIds];
    let searchClause = '';

    if (String(search || '').trim()) {
        searchClause = 'AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)';
        params.push(normalizedSearch, normalizedSearch);
    }

    return query(
        `SELECT DISTINCT
            u.id,
            u.name,
            u.email,
            g.id AS gym_id,
            g.name AS gym_name
         FROM gym_memberships gm
         JOIN users u ON u.id = gm.user_id
         JOIN gyms g ON g.id = gm.gym_id
         WHERE gm.gym_id IN (${gymPlaceholders}) AND gm.role = 'student' AND gm.status = 'active' ${searchClause}
         ORDER BY u.name ASC`,
        params
    );
};

const ensureStudentAccess = async (personalUserId, studentUserId, gymId = null) => {
    const students = await getPersonalStudents(personalUserId, '', gymId);
    return students.some((student) => Number(student.id) === Number(studentUserId));
};

const getSharedGymId = async (personalUserId, studentUserId) => {
    const rows = await query(
        `SELECT ps.gym_id
         FROM gym_memberships ps
         JOIN gym_memberships st ON st.gym_id = ps.gym_id
         WHERE ps.user_id = ? AND ps.role = 'personal' AND ps.status = 'active'
           AND st.user_id = ? AND st.role = 'student' AND st.status = 'active'
         LIMIT 1`,
        [personalUserId, studentUserId]
    );

    return rows[0]?.gym_id || null;
};

const resolvePersonalGymId = async (personalUserId, requestedGymId = null) => {
    const gyms = await getPersonalGyms(personalUserId);
    if (gyms.length === 0) return null;

    if (requestedGymId) {
        const gym = gyms.find((item) => Number(item.id) === Number(requestedGymId));
        return gym?.id || null;
    }

    return gyms.length === 1 ? gyms[0].id : null;
};

const findStudentByEmail = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) return null;

    const students = await query(
        `SELECT u.id, u.name, u.email
         FROM users u
         WHERE LOWER(u.email) = ?
         LIMIT 1`,
        [normalizedEmail]
    );

    return students[0] || null;
};

const parseJsonField = (value, fallback = {}) => {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const stringifyField = (value) => JSON.stringify(value || {});

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const calculateBmi = (weight, height) => {
    const numericWeight = toNumberOrNull(weight);
    const numericHeight = toNumberOrNull(height);
    if (!numericWeight || !numericHeight) return null;
    const heightInMeters = numericHeight > 3 ? numericHeight / 100 : numericHeight;
    if (!heightInMeters) return null;
    return Number((numericWeight / (heightInMeters * heightInMeters)).toFixed(2));
};

const hasMedicalAlert = (medicalHistory = {}) => {
    const riskFields = [
        'heartProblem',
        'chestPain',
        'dizziness',
        'highBloodPressure',
        'diabetes',
        'highCholesterol',
        'continuousMedication',
        'recentSurgery',
        'injuries',
        'jointPain'
    ];

    return riskFields.some((field) => Boolean(medicalHistory[field]));
};

const MEDICAL_RISK_FIELDS = new Set([
    'heartProblem',
    'chestPain',
    'dizziness',
    'highBloodPressure',
    'diabetes',
    'highCholesterol',
    'continuousMedication',
    'recentSurgery',
    'injuries',
    'jointPain'
]);

const FIELD_LABELS = {
    fullName: 'Nome completo',
    birthDate: 'Data de nascimento',
    phone: 'Telefone / WhatsApp',
    email: 'E-mail',
    mainGoal: 'Objetivo principal',
    heartProblem: 'Algum medico ja disse que possui problema no coracao?',
    chestPain: 'Sente dor no peito ao praticar atividade fisica?',
    dizziness: 'Ja teve tontura ou perda de consciencia?',
    highBloodPressure: 'Possui pressao alta?',
    diabetes: 'Possui diabetes?',
    highCholesterol: 'Possui colesterol alto?',
    continuousMedication: 'Usa medicamento continuo?',
    medicationName: 'Qual medicamento?',
    recentSurgery: 'Fez cirurgia nos ultimos 2 anos?',
    injuries: 'Possui lesoes?',
    jointPain: 'Possui dores articulares?',
    trainedBefore: 'Ja treinou em academia?',
    trainingTime: 'Ha quanto tempo?',
    currentLevel: 'Nivel atual',
    hadPersonal: 'Ja teve acompanhamento com personal?',
    likedExercises: 'Exercicios que gosta',
    dislikedExercises: 'Exercicios que nao gosta',
    smokes: 'Fuma?',
    sleepHours: 'Horas de sono por noite',
    stressLevel: 'Nivel de estresse',
    workRoutine: 'Rotina de trabalho',
    nutrition: 'Alimentacao',
    availableDays: 'Dias disponiveis para treino',
    idealTime: 'Horario ideal para treinar',
    daysPerWeek: 'Quantos dias por semana pretende treinar?',
    sessionDuration: 'Tempo disponivel por treino'
};

const MEASUREMENT_LABELS = {
    weight: { label: 'Peso', unit: 'kg' },
    height: { label: 'Altura', unit: 'cm' },
    bmi: { label: 'IMC calculado', unit: 'kg/m2' },
    abdominalCircumference: { label: 'Circunferencia abdominal', unit: 'cm' },
    chestCircumference: { label: 'Circunferencia toracica', unit: 'cm' },
    rightArm: { label: 'Braco direito', unit: 'cm' },
    leftArm: { label: 'Braco esquerdo', unit: 'cm' },
    rightThigh: { label: 'Coxa direita', unit: 'cm' },
    leftThigh: { label: 'Coxa esquerda', unit: 'cm' },
    hip: { label: 'Quadril', unit: 'cm' },
    bodyFat: { label: 'Percentual de gordura', unit: '%' },
    generalObservations: { label: 'Observacoes gerais', unit: '' }
};

const serializeAnswer = (value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
    return String(value);
};

const syncAssessmentResponses = async (assessmentId, sections) => {
    await query('DELETE FROM assessment_questionnaire_responses WHERE assessment_id = ?', [assessmentId]);

    for (const [section, answers] of Object.entries(sections)) {
        for (const [questionKey, answer] of Object.entries(answers || {})) {
            await query(
                `INSERT INTO assessment_questionnaire_responses
                 (assessment_id, section, question_key, question_label, answer, risk_flag)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    assessmentId,
                    section,
                    questionKey,
                    FIELD_LABELS[questionKey] || questionKey,
                    serializeAnswer(answer),
                    section === 'medicalHistory' && MEDICAL_RISK_FIELDS.has(questionKey) && Boolean(answer)
                ]
            );
        }
    }
};

const syncPhysicalMeasurements = async (assessmentId, measurements = {}, bmi = null) => {
    await query('DELETE FROM physical_measurements WHERE assessment_id = ?', [assessmentId]);
    const values = { ...measurements, bmi };

    for (const [measurementKey, metadata] of Object.entries(MEASUREMENT_LABELS)) {
        const rawValue = values[measurementKey];
        const numericValue = toNumberOrNull(rawValue);
        const notes = measurementKey === 'generalObservations' ? String(rawValue || '').trim() : '';

        if (numericValue === null && !notes) continue;

        await query(
            `INSERT INTO physical_measurements
             (assessment_id, measurement_key, label, value, unit, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                assessmentId,
                measurementKey,
                metadata.label,
                numericValue,
                metadata.unit,
                notes
            ]
        );
    }
};

const toStudentDto = (student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    gym: {
        id: student.gym_id,
        name: student.gym_name
    }
});

const toAssignmentDto = (assignment) => ({
    id: assignment.id,
    personalUserId: assignment.personal_user_id,
    studentUserId: assignment.student_user_id,
    gymId: assignment.gym_id || null,
    templateId: assignment.template_id,
    status: assignment.status,
    editableByStudent: Boolean(assignment.editable_by_student),
    notes: assignment.notes || '',
    displayOrder: Number(assignment.display_order) || 0,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
    student: assignment.student_name ? {
        id: assignment.student_user_id,
        name: assignment.student_name,
        email: assignment.student_email
    } : null,
    template: assignment.template_name ? {
        id: assignment.template_id,
        name: assignment.template_name
    } : null
});

const toAssessmentDto = (assessment) => ({
    id: assessment.id,
    personalUserId: assessment.personal_user_id,
    studentUserId: assessment.student_user_id,
    gymId: assessment.gym_id,
    assessmentDate: assessment.assessment_date,
    weight: assessment.weight !== null ? Number(assessment.weight) : null,
    height: assessment.height !== null ? Number(assessment.height) : null,
    bodyFat: assessment.body_fat !== null ? Number(assessment.body_fat) : null,
    goal: assessment.goal || '',
    questionnaire: assessment.questionnaire || '',
    workoutSuggestion: assessment.workout_suggestion || '',
    personalData: parseJsonField(assessment.personal_data),
    medicalHistory: parseJsonField(assessment.medical_history),
    activityHistory: parseJsonField(assessment.activity_history),
    lifestyle: parseJsonField(assessment.lifestyle),
    availability: parseJsonField(assessment.availability),
    measurements: parseJsonField(assessment.measurements),
    bmi: assessment.bmi !== null ? Number(assessment.bmi) : null,
    medicalAlert: Boolean(assessment.medical_alert),
    medicalAlertMessage: assessment.medical_alert_message || '',
    status: assessment.status,
    createdAt: assessment.created_at,
    updatedAt: assessment.updated_at,
    student: assessment.student_name ? {
        id: assessment.student_user_id,
        name: assessment.student_name,
        email: assessment.student_email
    } : null
});

const getAssignments = async (personalUserId, gymId = null) => {
    const params = [personalUserId];
    const gymClause = gymId ? 'AND pwa.gym_id = ?' : '';
    if (gymId) params.push(gymId);

    return query(
    `SELECT pwa.*, u.name AS student_name, u.email AS student_email, wt.name AS template_name
     FROM personal_workout_assignments pwa
     JOIN users u ON u.id = pwa.student_user_id
     JOIN workout_templates wt ON wt.id = pwa.template_id
     WHERE pwa.personal_user_id = ? ${gymClause}
     ORDER BY u.name ASC, pwa.display_order ASC, pwa.created_at ASC`,
    params
    );
};

const getAssessments = async (personalUserId, studentId = null, gymId = null) => {
    const params = [personalUserId];
    let studentClause = '';
    let gymClause = '';
    if (studentId) {
        studentClause = 'AND pa.student_user_id = ?';
        params.push(studentId);
    }
    if (gymId) {
        gymClause = 'AND pa.gym_id = ?';
        params.push(gymId);
    }

    return query(
        `SELECT pa.*, DATE_FORMAT(pa.assessment_date, '%Y-%m-%d') AS assessment_date,
                u.name AS student_name, u.email AS student_email
         FROM physical_assessments pa
         JOIN users u ON u.id = pa.student_user_id
         WHERE pa.personal_user_id = ? ${studentClause} ${gymClause}
         ORDER BY pa.assessment_date DESC, pa.created_at DESC`,
        params
    );
};

const getSummary = async (req, res) => {
    try {
        const personalUserId = req.user.id;
        const gymId = getRequestedGymId(req);
        const [students, templates, assignments, assessments] = await Promise.all([
            getPersonalStudents(personalUserId, '', gymId),
            query('SELECT id FROM workout_templates WHERE user_id = ?', [personalUserId]),
            getAssignments(personalUserId, gymId),
            getAssessments(personalUserId, null, gymId)
        ]);

        const activeStudentIds = new Set(
            assignments
                .filter((assignment) => assignment.status === 'active')
                .map((assignment) => assignment.student_user_id)
        );
        const assessedStudentIds = new Set(assessments.map((assessment) => assessment.student_user_id));

        res.json({
            totalStudents: students.length,
            recentAssessments: assessments.slice(0, 5).map(toAssessmentDto),
            totalTemplates: templates.length,
            pendingAssessments: students.filter((student) => !assessedStudentIds.has(student.id)).length,
            studentsWithActiveWorkout: activeStudentIds.size
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar resumo do personal' });
    }
};

const listStudents = async (req, res) => {
    try {
        const students = await getPersonalStudents(req.user.id, req.query.search, getRequestedGymId(req));
        res.json({ students: students.map(toStudentDto) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar alunos do personal' });
    }
};

const listGyms = async (req, res) => {
    try {
        const gyms = await getPersonalGyms(req.user.id);
        res.json({ gyms });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar academias do personal' });
    }
};

const addStudentByEmail = async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const gymId = await resolvePersonalGymId(req.user.id, req.body.gymId);

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'E-mail do aluno e obrigatorio' });
        }

        if (!gymId) {
            return res.status(400).json({ error: 'Selecione uma academia valida para vincular o aluno' });
        }

        const student = await findStudentByEmail(email);
        if (!student) {
            return res.status(404).json({ error: 'Aluno nao encontrado. Peça para ele se cadastrar primeiro.' });
        }

        const existingMemberships = await query(
            `SELECT id
             FROM gym_memberships
             WHERE gym_id = ? AND user_id = ? AND role = 'student' AND status = 'active'
             LIMIT 1`,
            [gymId, student.id]
        );

        if (existingMemberships.length > 0) {
            await query(
                `INSERT INTO personal_student_links (personal_user_id, student_user_id, gym_id, status)
                 VALUES (?, ?, ?, 'active')
                 ON DUPLICATE KEY UPDATE status = 'active', updated_at = CURRENT_TIMESTAMP`,
                [req.user.id, student.id, gymId]
            );

            return res.json({
                message: 'Este aluno ja esta matriculado nesta academia.',
                student,
                alreadyEnrolled: true
            });
        }

        await query(
            `INSERT INTO gym_memberships (gym_id, user_id, invited_email, role, status)
             VALUES (?, ?, ?, 'student', 'active')
             ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), status = 'active', updated_at = CURRENT_TIMESTAMP`,
            [gymId, student.id, email]
        );

        await query(
            `INSERT INTO user_profiles (user_id, profile_type, status)
             VALUES (?, 'student', 'active')
             ON DUPLICATE KEY UPDATE status = 'active'`,
            [student.id]
        );

        await query(
            `INSERT INTO personal_student_links (personal_user_id, student_user_id, gym_id, status)
             VALUES (?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE status = 'active', updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, student.id, gymId]
        );

        res.status(201).json({ message: 'Aluno vinculado a academia', student });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao vincular aluno' });
    }
};

const getStudentProfile = async (req, res) => {
    try {
        const studentId = req.params.id;
        const gymId = getRequestedGymId(req);
        const hasAccess = await ensureStudentAccess(req.user.id, studentId, gymId);
        if (!hasAccess) {
            return res.status(404).json({ error: 'Aluno nao encontrado' });
        }

        const students = await getPersonalStudents(req.user.id, '', gymId);
        const student = students.find((item) => Number(item.id) === Number(studentId));
        const [history, assignments, assessments] = await Promise.all([
            query(
                `SELECT id, template_id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date, created_at
                 FROM workout_history
                 WHERE user_id = ? ${gymId ? 'AND gym_id = ?' : ''}
                 ORDER BY date DESC, created_at DESC
                 LIMIT 20`,
                gymId ? [studentId, gymId] : [studentId]
            ),
            query(
                `SELECT pwa.*, wt.name AS template_name
                 FROM personal_workout_assignments pwa
                 JOIN workout_templates wt ON wt.id = pwa.template_id
                 WHERE pwa.personal_user_id = ? AND pwa.student_user_id = ? ${gymId ? 'AND pwa.gym_id = ?' : ''}
                 ORDER BY pwa.display_order ASC, pwa.created_at ASC`,
                gymId ? [req.user.id, studentId, gymId] : [req.user.id, studentId]
            ),
            getAssessments(req.user.id, studentId, gymId)
        ]);

        res.json({
            student: toStudentDto(student),
            history,
            assignments: assignments.map((assignment) => toAssignmentDto({
                ...assignment,
                student_name: student.name,
                student_email: student.email
            })),
            assessments: assessments.map(toAssessmentDto)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao abrir perfil do aluno' });
    }
};

const listAssignments = async (req, res) => {
    try {
        const assignments = await getAssignments(req.user.id, getRequestedGymId(req));
        res.json({ assignments: assignments.map(toAssignmentDto) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar treinos atribuidos' });
    }
};

const assignWorkout = async (req, res) => {
    try {
        const { studentId, studentEmail = '', templateId, notes = '', gymId: requestedGymId = null } = req.body;
        if ((!studentId && !studentEmail) || !templateId) {
            return res.status(400).json({ error: 'E-mail do aluno e treino sao obrigatorios' });
        }

        let resolvedStudentId = studentId;
        if (!resolvedStudentId && studentEmail) {
            const student = await findStudentByEmail(studentEmail);
            resolvedStudentId = student?.id;
        }

        if (!resolvedStudentId) {
            return res.status(404).json({ error: 'Aluno nao encontrado. Peça para ele se cadastrar primeiro.' });
        }

        const hasAccess = await ensureStudentAccess(req.user.id, resolvedStudentId, requestedGymId);
        if (!hasAccess) {
            return res.status(404).json({ error: 'Aluno nao vinculado a sua academia' });
        }

        const templates = await query(
            'SELECT id FROM workout_templates WHERE id = ? AND user_id = ?',
            [templateId, req.user.id]
        );
        if (templates.length === 0) {
            return res.status(404).json({ error: 'Treino nao encontrado' });
        }

        const gymId = requestedGymId
            ? await resolvePersonalGymId(req.user.id, requestedGymId)
            : await getSharedGymId(req.user.id, resolvedStudentId);

        if (!gymId) {
            return res.status(400).json({ error: 'Selecione uma academia valida para atribuir o treino' });
        }

        const existingActiveAssignment = await query(
            `SELECT id
             FROM personal_workout_assignments
             WHERE personal_user_id = ? AND student_user_id = ? AND gym_id = ? AND template_id = ? AND status = 'active'
             LIMIT 1`,
            [req.user.id, resolvedStudentId, gymId, templateId]
        );

        if (existingActiveAssignment.length > 0) {
            return res.status(409).json({ error: 'Este treino ja esta ativo para este aluno.' });
        }

        const activeAssignments = await query(
            `SELECT COUNT(*) AS total
             FROM personal_workout_assignments
             WHERE student_user_id = ? AND gym_id = ? AND status = 'active'`,
            [resolvedStudentId, gymId]
        );

        if (Number(activeAssignments[0]?.total || 0) >= 7) {
            return res.status(400).json({ error: 'O aluno ja possui 7 treinos ativos nesta academia.' });
        }

        await query(
            `INSERT INTO personal_student_links (personal_user_id, student_user_id, gym_id, status)
             VALUES (?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE status = 'active', updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, resolvedStudentId, gymId]
        );

        await query(
            `UPDATE workout_templates
             SET created_by_profile = 'personal',
                 gym_id = COALESCE(gym_id, ?),
                 status = 'active',
                 editable_by_student = FALSE
             WHERE id = ? AND user_id = ?`,
            [gymId, templateId, req.user.id]
        );

        const nextOrder = await query(
            `SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order
             FROM personal_workout_assignments
             WHERE personal_user_id = ? AND student_user_id = ? AND gym_id = ?`,
            [req.user.id, resolvedStudentId, gymId]
        );

        await query(
            `INSERT INTO personal_workout_assignments
             (personal_user_id, student_user_id, gym_id, template_id, status, editable_by_student, notes, display_order)
             VALUES (?, ?, ?, ?, 'active', FALSE, ?, ?)
             ON DUPLICATE KEY UPDATE
                gym_id = VALUES(gym_id),
                status = 'active',
                editable_by_student = FALSE,
                notes = VALUES(notes),
                updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, resolvedStudentId, gymId, templateId, String(notes || '').trim(), Number(nextOrder[0]?.next_order) || 1]
        );

        res.status(201).json({ message: 'Treino atribuido ao aluno' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atribuir treino' });
    }
};

const reorderAssignments = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { studentId, assignmentIds = [], gymId: requestedGymId = null } = req.body;
        if (!studentId || !Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            return res.status(400).json({ error: 'Aluno e ordem dos treinos sao obrigatorios' });
        }

        const gymId = await resolvePersonalGymId(req.user.id, requestedGymId);
        if (!gymId) return res.status(400).json({ error: 'Academia invalida' });

        const [ownedAssignments] = await connection.query(
            `SELECT id FROM personal_workout_assignments
             WHERE personal_user_id = ? AND student_user_id = ? AND gym_id = ?`,
            [req.user.id, studentId, gymId]
        );
        const ownedIds = new Set(ownedAssignments.map((assignment) => Number(assignment.id)));
        const normalizedIds = assignmentIds.map(Number);

        if (normalizedIds.length !== ownedIds.size || normalizedIds.some((id) => !ownedIds.has(id))) {
            return res.status(400).json({ error: 'A ordem enviada nao corresponde aos treinos do aluno' });
        }

        await connection.beginTransaction();
        for (const [index, assignmentId] of normalizedIds.entries()) {
            await connection.execute(
                `UPDATE personal_workout_assignments
                 SET display_order = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND personal_user_id = ? AND student_user_id = ? AND gym_id = ?`,
                [index + 1, assignmentId, req.user.id, studentId, gymId]
            );
        }
        await connection.commit();
        res.json({ message: 'Ordem dos treinos atualizada' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erro ao ordenar treinos do aluno' });
    } finally {
        connection.release();
    }
};

const updateAssignment = async (req, res) => {
    try {
        const status = req.body.status === 'inactive' ? 'inactive' : 'active';
        const result = await query(
            `UPDATE personal_workout_assignments
             SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND personal_user_id = ?`,
            [status, String(req.body.notes || '').trim(), req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Atribuicao nao encontrada' });
        }

        res.json({ message: 'Atribuicao atualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar atribuicao' });
    }
};

const listAssessments = async (req, res) => {
    try {
        const assessments = await getAssessments(req.user.id, req.query.studentId || null, getRequestedGymId(req));
        res.json({ assessments: assessments.map(toAssessmentDto) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar avaliacoes' });
    }
};

const createAssessment = async (req, res) => {
    try {
        const {
            studentId,
            assessmentDate,
            personalData = {},
            medicalHistory = {},
            activityHistory = {},
            lifestyle = {},
            availability = {},
            measurements = {},
            workoutSuggestion = '',
            status = 'completed'
        } = req.body;

        if (!studentId || !assessmentDate) {
            return res.status(400).json({ error: 'Aluno e data da avaliacao sao obrigatorios' });
        }

        const requestedGymId = getRequestedGymId(req);
        const hasAccess = await ensureStudentAccess(req.user.id, studentId, requestedGymId);
        if (!hasAccess) {
            return res.status(404).json({ error: 'Aluno nao encontrado' });
        }

        const gymId = requestedGymId
            ? await resolvePersonalGymId(req.user.id, requestedGymId)
            : await getSharedGymId(req.user.id, studentId);

        if (!gymId) {
            return res.status(400).json({ error: 'Selecione uma academia valida para a avaliacao' });
        }
        const weight = toNumberOrNull(measurements.weight);
        const height = toNumberOrNull(measurements.height);
        const bodyFat = toNumberOrNull(measurements.bodyFat);
        const bmi = calculateBmi(weight, height);
        const medicalAlert = hasMedicalAlert(medicalHistory);
        const alertMessage = medicalAlert
            ? 'Atenção: recomendada liberação médica antes de treinos intensos.'
            : '';
        const goal = personalData.mainGoal || '';
        const questionnaire = stringifyField({
            personalData,
            medicalHistory,
            activityHistory,
            lifestyle,
            availability,
            measurements
        });

        const result = await query(
            `INSERT INTO physical_assessments
             (personal_user_id, student_user_id, gym_id, assessment_date, weight, height, body_fat, goal, questionnaire,
              workout_suggestion, personal_data, medical_history, activity_history, lifestyle, availability, measurements,
              bmi, medical_alert, medical_alert_message, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                studentId,
                gymId,
                assessmentDate,
                weight,
                height,
                bodyFat,
                String(goal || '').trim(),
                questionnaire,
                String(workoutSuggestion || '').trim(),
                stringifyField(personalData),
                stringifyField(medicalHistory),
                stringifyField(activityHistory),
                stringifyField(lifestyle),
                stringifyField(availability),
                stringifyField({ ...measurements, bmi }),
                bmi,
                medicalAlert,
                alertMessage,
                status === 'draft' ? 'draft' : 'completed'
            ]
        );

        await syncAssessmentResponses(result.insertId, {
            personalData,
            medicalHistory,
            activityHistory,
            lifestyle,
            availability
        });
        await syncPhysicalMeasurements(result.insertId, measurements, bmi);

        res.status(201).json({ message: 'Avaliacao criada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar avaliacao' });
    }
};

const updateAssessment = async (req, res) => {
    try {
        const {
            assessmentDate,
            personalData = {},
            medicalHistory = {},
            activityHistory = {},
            lifestyle = {},
            availability = {},
            measurements = {},
            workoutSuggestion = '',
            status = 'completed'
        } = req.body;

        const weight = toNumberOrNull(measurements.weight);
        const height = toNumberOrNull(measurements.height);
        const bodyFat = toNumberOrNull(measurements.bodyFat);
        const bmi = calculateBmi(weight, height);
        const medicalAlert = hasMedicalAlert(medicalHistory);
        const alertMessage = medicalAlert
            ? 'Atenção: recomendada liberação médica antes de treinos intensos.'
            : '';
        const goal = personalData.mainGoal || '';
        const questionnaire = stringifyField({
            personalData,
            medicalHistory,
            activityHistory,
            lifestyle,
            availability,
            measurements
        });

        const result = await query(
            `UPDATE physical_assessments
             SET assessment_date = ?, weight = ?, height = ?, body_fat = ?, goal = ?, questionnaire = ?,
                 workout_suggestion = ?, personal_data = ?, medical_history = ?, activity_history = ?, lifestyle = ?,
                 availability = ?, measurements = ?, bmi = ?, medical_alert = ?, medical_alert_message = ?,
                 status = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND personal_user_id = ?`,
            [
                assessmentDate,
                weight,
                height,
                bodyFat,
                String(goal || '').trim(),
                questionnaire,
                String(workoutSuggestion || '').trim(),
                stringifyField(personalData),
                stringifyField(medicalHistory),
                stringifyField(activityHistory),
                stringifyField(lifestyle),
                stringifyField(availability),
                stringifyField({ ...measurements, bmi }),
                bmi,
                medicalAlert,
                alertMessage,
                status === 'draft' ? 'draft' : 'completed',
                req.params.id,
                req.user.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Avaliacao nao encontrada' });
        }

        await syncAssessmentResponses(req.params.id, {
            personalData,
            medicalHistory,
            activityHistory,
            lifestyle,
            availability
        });
        await syncPhysicalMeasurements(req.params.id, measurements, bmi);

        res.json({ message: 'Avaliacao atualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar avaliacao' });
    }
};

module.exports = {
    getSummary,
    listGyms,
    listStudents,
    addStudentByEmail,
    getStudentProfile,
    listAssignments,
    assignWorkout,
    reorderAssignments,
    updateAssignment,
    listAssessments,
    createAssessment,
    updateAssessment
};
