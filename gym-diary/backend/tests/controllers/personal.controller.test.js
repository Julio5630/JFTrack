const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const personalModulePath = path.join(__dirname, '../../controllers/personalController.js');

const createConnectionMock = () => {
    const calls = [];
    const queryQueue = [];
    const executeQueue = [];

    return {
        calls,
        queryQueue,
        executeQueue,
        async beginTransaction() {
            calls.push({ type: 'beginTransaction' });
        },
        async commit() {
            calls.push({ type: 'commit' });
        },
        async rollback() {
            calls.push({ type: 'rollback' });
        },
        async release() {
            calls.push({ type: 'release' });
        },
        async query(sql, params) {
            calls.push({ type: 'query', sql, params });
            if (queryQueue.length === 0) return [[]];
            const next = queryQueue.shift();
            return typeof next === 'function' ? next(sql, params) : next;
        },
        async execute(sql, params) {
            calls.push({ type: 'execute', sql, params });
            if (executeQueue.length === 0) return [{}];
            const next = executeQueue.shift();
            return typeof next === 'function' ? next(sql, params) : next;
        }
    };
};

test('getSummary aggregates students, templates, treinos ativos e avaliacoes pendentes', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'personal'")) {
            return [{ gym_id: 9 }];
        }

        if (sql.includes('FROM gym_memberships gm') && sql.includes("gm.role = 'student'")) {
            return [
                { id: 11, name: 'Ana', email: 'ana@teste.com', gym_id: 9, gym_name: 'FitCenter' },
                { id: 12, name: 'Bruno', email: 'bruno@teste.com', gym_id: 9, gym_name: 'FitCenter' }
            ];
        }

        if (sql.startsWith('SELECT id FROM workout_templates')) {
            return [{ id: 1 }, { id: 2 }, { id: 3 }];
        }

        if (sql.includes('FROM personal_workout_assignments')) {
            return [
                {
                    id: 100,
                    personal_user_id: 7,
                    student_user_id: 11,
                    gym_id: 9,
                    template_id: 5,
                    status: 'active',
                    editable_by_student: 0,
                    notes: '',
                    display_order: 1,
                    created_at: '2026-06-16 10:00:00',
                    updated_at: '2026-06-16 10:00:00',
                    student_name: 'Ana',
                    student_email: 'ana@teste.com',
                    template_name: 'Treino A'
                }
            ];
        }

        return [
            {
                id: 301,
                personal_user_id: 7,
                student_user_id: 11,
                gym_id: 9,
                assessment_date: '2026-06-15',
                weight: 62,
                height: 165,
                body_fat: 18,
                goal: 'Hipertrofia',
                questionnaire: '{}',
                workout_suggestion: '',
                personal_data: '{}',
                medical_history: '{}',
                activity_history: '{}',
                lifestyle: '{}',
                availability: '{}',
                measurements: '{}',
                bmi: 22.77,
                medical_alert: 0,
                medical_alert_message: '',
                status: 'completed',
                created_at: '2026-06-15 10:00:00',
                updated_at: '2026-06-15 10:00:00',
                student_name: 'Ana',
                student_email: 'ana@teste.com'
            }
        ];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { getSummary } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            query: { gymId: 9 }
        });
        const res = createMockResponse();

        await getSummary(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.totalStudents, 2);
        assert.equal(res.body.totalTemplates, 3);
        assert.equal(res.body.pendingAssessments, 1);
        assert.equal(res.body.studentsWithActiveWorkout, 1);
        assert.equal(res.body.recentAssessments.length, 1);
    } finally {
        harness.restore();
    }
});

test('addStudentByEmail returns 400 when gym is not valid for personal', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('FROM gym_memberships gm') && sql.includes('JOIN gyms g')) return [];
        return [];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { addStudentByEmail } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            body: { email: 'aluno@teste.com', gymId: 9 }
        });
        const res = createMockResponse();

        await addStudentByEmail(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'Selecione uma academia valida para vincular o aluno' });
    } finally {
        harness.restore();
    }
});

test('addStudentByEmail returns existing enrollment response when aluno ja pertence a academia', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes('FROM gym_memberships gm') && sql.includes('JOIN gyms g')) {
            return [{ id: 9, name: 'FitCenter' }];
        }

        if (sql.includes('FROM users u') && sql.includes('LOWER(u.email)')) {
            return [{ id: 22, name: 'Joao', email: 'aluno@teste.com' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'student'")) {
            return [{ id: 501 }];
        }

        if (sql.includes('INSERT INTO personal_student_links')) {
            return { affectedRows: 1 };
        }

        return [];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { addStudentByEmail } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            body: { email: 'aluno@teste.com', gymId: 9 }
        });
        const res = createMockResponse();

        await addStudentByEmail(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.alreadyEnrolled, true);
        assert.equal(res.body.student.name, 'Joao');
        assert.equal(
            calls.some((call) => String(call.sql).includes('INSERT INTO personal_student_links')),
            true
        );
    } finally {
        harness.restore();
    }
});

test('assignWorkout returns 409 when treino ja esta ativo para o aluno', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('SELECT DISTINCT') && sql.includes("gm.role = 'student'")) {
            return [{ id: 22, name: 'Joao', email: 'aluno@teste.com', gym_id: 9, gym_name: 'FitCenter' }];
        }

        if (sql.includes('SELECT g.id, g.name')) {
            return [{ id: 9, name: 'FitCenter' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'personal'")) {
            return [{ gym_id: 9 }];
        }

        if (sql.startsWith('SELECT id FROM workout_templates')) {
            return [{ id: 15 }];
        }

        if (sql.includes('FROM personal_workout_assignments') && sql.includes("status = 'active'")) {
            return [{ id: 800 }];
        }

        return [];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { assignWorkout } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            body: { studentId: 22, templateId: 15, gymId: 9 }
        });
        const res = createMockResponse();

        await assignWorkout(req, res);

        assert.equal(res.statusCode, 409);
        assert.deepEqual(res.body, { error: 'Este treino ja esta ativo para este aluno.' });
    } finally {
        harness.restore();
    }
});

test('assignWorkout creates assignment and updates template metadata', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes('SELECT DISTINCT') && sql.includes("gm.role = 'student'")) {
            return [{ id: 22, name: 'Joao', email: 'aluno@teste.com', gym_id: 9, gym_name: 'FitCenter' }];
        }

        if (sql.includes('SELECT g.id, g.name')) {
            return [{ id: 9, name: 'FitCenter' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'personal'")) {
            return [{ gym_id: 9 }];
        }

        if (sql.startsWith('SELECT id FROM workout_templates')) {
            return [{ id: 15 }];
        }

        if (sql.includes('FROM personal_workout_assignments') && sql.includes('template_id = ?')) {
            return [];
        }

        if (sql.includes('COUNT(*) AS total')) {
            return [{ total: 2 }];
        }

        if (sql.includes('INSERT INTO personal_student_links')) {
            return { affectedRows: 1 };
        }

        if (sql.includes('UPDATE workout_templates')) {
            return { affectedRows: 1 };
        }

        if (sql.includes('MAX(display_order)')) {
            return [{ next_order: 3 }];
        }

        if (sql.includes('INSERT INTO personal_workout_assignments')) {
            return { affectedRows: 1 };
        }

        return [];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { assignWorkout } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            body: {
                studentId: 22,
                templateId: 15,
                gymId: 9,
                notes: 'Priorizar tecnica'
            }
        });
        const res = createMockResponse();

        await assignWorkout(req, res);

        assert.equal(res.statusCode, 201);
        assert.deepEqual(res.body, { message: 'Treino atribuido ao aluno' });

        const templateUpdate = calls.find((call) => String(call.sql).includes('UPDATE workout_templates'));
        const assignmentInsert = calls.find((call) => String(call.sql).includes('INSERT INTO personal_workout_assignments'));

        assert.equal(templateUpdate.params[0], 9);
        assert.equal(assignmentInsert.params[4], 'Priorizar tecnica');
        assert.equal(assignmentInsert.params[5], 3);
    } finally {
        harness.restore();
    }
});

test('reorderAssignments validates assignment ownership before reordering', async () => {
    const connection = createConnectionMock();
    connection.queryQueue.push([[{ id: 50 }, { id: 51 }]]);

    const queryMock = async (sql) => {
        if (sql.includes('FROM gym_memberships gm') && sql.includes('JOIN gyms g')) {
            return [{ id: 9, name: 'FitCenter' }];
        }
        return [];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: queryMock
        }
    });

    try {
        const { reorderAssignments } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            body: {
                studentId: 22,
                gymId: 9,
                assignmentIds: [50, 999]
            }
        });
        const res = createMockResponse();

        await reorderAssignments(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'A ordem enviada nao corresponde aos treinos do aluno' });
        assert.equal(connection.calls.some((call) => call.type === 'beginTransaction'), false);
    } finally {
        harness.restore();
    }
});

test('reorderAssignments updates display order inside transaction', async () => {
    const connection = createConnectionMock();
    connection.queryQueue.push([[{ id: 50 }, { id: 51 }]]);
    connection.executeQueue.push([{ affectedRows: 1 }], [{ affectedRows: 1 }]);

    const queryMock = async (sql) => {
        if (sql.includes('FROM gym_memberships gm') && sql.includes('JOIN gyms g')) {
            return [{ id: 9, name: 'FitCenter' }];
        }
        return [];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: queryMock
        }
    });

    try {
        const { reorderAssignments } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            body: {
                studentId: 22,
                gymId: 9,
                assignmentIds: [51, 50]
            }
        });
        const res = createMockResponse();

        await reorderAssignments(req, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { message: 'Ordem dos treinos atualizada' });
        assert.equal(connection.calls.some((call) => call.type === 'beginTransaction'), true);
        assert.equal(connection.calls.some((call) => call.type === 'commit'), true);

        const updateCalls = connection.calls.filter((call) => call.type === 'execute');
        assert.equal(updateCalls[0].params[0], 1);
        assert.equal(updateCalls[0].params[1], 51);
        assert.equal(updateCalls[1].params[0], 2);
        assert.equal(updateCalls[1].params[1], 50);
    } finally {
        harness.restore();
    }
});

test('updateAssignment returns 404 when atribuicao does not exist', async () => {
    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => ({ affectedRows: 0 })
        }
    });

    try {
        const { updateAssignment } = harness.module;
        const req = createMockRequest({
            params: { id: 81 },
            user: { id: 7 },
            body: { status: 'inactive', notes: 'pausado' }
        });
        const res = createMockResponse();

        await updateAssignment(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Atribuicao nao encontrada' });
    } finally {
        harness.restore();
    }
});

test('createAssessment stores assessment, respostas e medidas calculando IMC', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes('SELECT DISTINCT') && sql.includes("gm.role = 'student'")) {
            return [{ id: 22, name: 'Joao', email: 'aluno@teste.com', gym_id: 9, gym_name: 'FitCenter' }];
        }

        if (sql.includes('SELECT g.id, g.name')) {
            return [{ id: 9, name: 'FitCenter' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'personal'")) {
            return [{ gym_id: 9 }];
        }

        if (sql.includes('INSERT INTO physical_assessments')) {
            return { insertId: 77 };
        }

        if (sql.startsWith('DELETE FROM assessment_questionnaire_responses')) return { affectedRows: 3 };
        if (sql.startsWith('INSERT INTO assessment_questionnaire_responses')) return { affectedRows: 1 };
        if (sql.startsWith('DELETE FROM physical_measurements')) return { affectedRows: 4 };
        if (sql.startsWith('INSERT INTO physical_measurements')) return { affectedRows: 1 };

        return [];
    };

    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { createAssessment } = harness.module;
        const req = createMockRequest({
            user: { id: 7 },
            body: {
                studentId: 22,
                gymId: 9,
                assessmentDate: '2026-06-16',
                personalData: { mainGoal: 'Hipertrofia', fullName: 'Joao Silva' },
                medicalHistory: { heartProblem: true },
                activityHistory: { trainedBefore: true },
                lifestyle: { sleepHours: '8' },
                availability: { daysPerWeek: '4' },
                measurements: {
                    weight: 80,
                    height: 180,
                    bodyFat: 16,
                    abdominalCircumference: 85,
                    generalObservations: 'Boa mobilidade'
                },
                workoutSuggestion: 'Treino ABC'
            }
        });
        const res = createMockResponse();

        await createAssessment(req, res);

        assert.equal(res.statusCode, 201);
        assert.deepEqual(res.body, { message: 'Avaliacao criada' });

        const assessmentInsert = calls.find((call) => String(call.sql).includes('INSERT INTO physical_assessments'));
        assert.equal(assessmentInsert.params[2], 9);
        assert.equal(assessmentInsert.params[7], 'Hipertrofia');
        assert.equal(assessmentInsert.params[16], 24.69);
        assert.equal(assessmentInsert.params[17], true);

        const physicalMeasurementInserts = calls.filter((call) =>
            String(call.sql).includes('INSERT INTO physical_measurements')
        );
        assert.equal(physicalMeasurementInserts.length >= 4, true);
    } finally {
        harness.restore();
    }
});

test('updateAssessment returns 404 when avaliacao does not exist', async () => {
    const harness = loadWithMocks(personalModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async (sql) => {
                if (sql.includes('UPDATE physical_assessments')) {
                    return { affectedRows: 0 };
                }
                return [];
            }
        }
    });

    try {
        const { updateAssessment } = harness.module;
        const req = createMockRequest({
            params: { id: 91 },
            user: { id: 7 },
            body: {
                assessmentDate: '2026-06-16',
                personalData: { mainGoal: 'Condicionamento' },
                measurements: { weight: 70, height: 170 }
            }
        });
        const res = createMockResponse();

        await updateAssessment(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Avaliacao nao encontrada' });
    } finally {
        harness.restore();
    }
});
