const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const templateModulePath = path.join(__dirname, '../../controllers/templateController.js');

const createConnectionMock = () => {
    const calls = [];
    const executeQueue = [];
    const queryQueue = [];

    return {
        calls,
        executeQueue,
        queryQueue,
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
        async execute(sql, params) {
            calls.push({ type: 'execute', sql, params });
            if (executeQueue.length === 0) return [{}];
            const next = executeQueue.shift();
            return typeof next === 'function' ? next(sql, params) : next;
        },
        async query(sql, params) {
            calls.push({ type: 'query', sql, params });
            if (queryQueue.length === 0) return [[]];
            const next = queryQueue.shift();
            return typeof next === 'function' ? next(sql, params) : next;
        }
    };
};

test('createTemplate returns 400 for invalid payload', async () => {
    const connection = createConnectionMock();
    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        }
    });

    try {
        const { createTemplate } = harness.module;
        const req = createMockRequest({
            user: { id: 1, is_admin: 0 },
            activeProfile: 'student',
            body: { name: '', exercises: [] }
        });
        const res = createMockResponse();

        await createTemplate(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'Nome e exercicios sao obrigatorios' });
    } finally {
        harness.restore();
    }
});

test('createTemplate persists cardio and strength exercises with normalized defaults', async () => {
    const connection = createConnectionMock();
    connection.executeQueue.push(
        [{ insertId: 44 }],
        [{ affectedRows: 1 }],
        [{ affectedRows: 1 }]
    );
    connection.queryQueue.push([
        [
            { id: 3, category: 'Cardio' },
            { id: 9, category: 'Peito' }
        ]
    ]);

    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        }
    });

    try {
        const { createTemplate } = harness.module;
        const req = createMockRequest({
            user: { id: 7, is_admin: 0 },
            activeProfile: 'student',
            body: {
                name: 'Treino completo',
                frequency: '4x por semana',
                splitType: 'A/B',
                notes: 'Observacoes',
                exercises: [
                    { id: 3, defaultSets: 4, defaultReps: '10-12', durationMinutes: 25 },
                    { id: 9, defaultSets: 5, defaultReps: '6-8' }
                ]
            }
        });
        const res = createMockResponse();

        await createTemplate(req, res);

        assert.equal(res.statusCode, 201);
        assert.deepEqual(res.body, { message: 'Template criado com sucesso', templateId: 44 });
        assert.equal(connection.calls.some((call) => call.type === 'commit'), true);

        const insertExerciseCalls = connection.calls.filter(
            (call) => call.type === 'execute' && call.sql.includes('INSERT INTO template_exercises')
        );
        assert.equal(insertExerciseCalls.length, 2);
        assert.equal(insertExerciseCalls[0].params[3], 1);
        assert.equal(insertExerciseCalls[0].params[4], '0');
        assert.equal(insertExerciseCalls[0].params[5], 25);
        assert.equal(insertExerciseCalls[1].params[3], 5);
        assert.equal(insertExerciseCalls[1].params[4], '6-8');
        assert.equal(insertExerciseCalls[1].params[5], null);
    } finally {
        harness.restore();
    }
});

test('getTemplates returns templates with grouped exercises', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('FROM workout_templates')) {
            return [
                {
                    id: 1,
                    user_id: 7,
                    creator_name: 'Joao',
                    name: 'Treino A',
                    frequency: '3x',
                    split_type: 'A/B',
                    notes: '',
                    created_by_profile: 'student',
                    assigned_student_user_id: null,
                    gym_id: null,
                    status: 'active',
                    editable_by_student: 1,
                    created_at: '2026-06-16 10:00:00'
                }
            ];
        }

        return [
            {
                template_id: 1,
                id: 22,
                defaultSets: 3,
                defaultReps: '8-12',
                durationMinutes: null,
                position: 0
            }
        ];
    };

    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { getTemplates } = harness.module;
        const req = createMockRequest({
            user: { id: 7 }
        });
        const res = createMockResponse();

        await getTemplates(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.length, 1);
        assert.equal(res.body[0].canEdit, true);
        assert.equal(res.body[0].exercises.length, 1);
        assert.equal(res.body[0].exercises[0].id, 22);
    } finally {
        harness.restore();
    }
});

test('updateTemplate returns 404 when template does not exist', async () => {
    const connection = createConnectionMock();
    connection.executeQueue.push([{ affectedRows: 0 }]);

    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        }
    });

    try {
        const { updateTemplate } = harness.module;
        const req = createMockRequest({
            params: { id: 9 },
            user: { id: 3 },
            body: {
                name: 'Treino A',
                exercises: [{ id: 1 }]
            }
        });
        const res = createMockResponse();

        await updateTemplate(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Template nao encontrado' });
        assert.equal(connection.calls.some((call) => call.type === 'rollback'), true);
    } finally {
        harness.restore();
    }
});

test('updateTemplate replaces exercises and commits changes', async () => {
    const connection = createConnectionMock();
    connection.executeQueue.push(
        [{ affectedRows: 1 }],
        [{ affectedRows: 2 }],
        [{ affectedRows: 1 }],
        [{ affectedRows: 1 }]
    );
    connection.queryQueue.push([
        [
            { id: 1, category: 'Perna' },
            { id: 5, category: 'Cardio' }
        ]
    ]);

    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        }
    });

    try {
        const { updateTemplate } = harness.module;
        const req = createMockRequest({
            params: { id: 12 },
            user: { id: 3 },
            body: {
                name: 'Treino atualizado',
                frequency: '5x',
                splitType: 'A/B/C',
                notes: 'novo',
                status: 'inactive',
                exercises: [
                    { id: 1, defaultSets: 4, defaultReps: '10-12' },
                    { id: 5, durationMinutes: 30 }
                ]
            }
        });
        const res = createMockResponse();

        await updateTemplate(req, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { message: 'Template atualizado' });
        assert.equal(connection.calls.some((call) => call.type === 'commit'), true);
    } finally {
        harness.restore();
    }
});

test('addExerciseToTemplate returns 404 when template is not found', async () => {
    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => []
        }
    });

    try {
        const { addExerciseToTemplate } = harness.module;
        const req = createMockRequest({
            params: { templateId: 12 },
            user: { id: 3 },
            body: { exercise_id: 8, position: 0 }
        });
        const res = createMockResponse();

        await addExerciseToTemplate(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Template nao encontrado' });
    } finally {
        harness.restore();
    }
});

test('addExerciseToTemplate normalizes cardio exercise payload', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });
        if (sql.startsWith('SELECT id FROM workout_templates')) return [{ id: 12 }];
        if (sql.startsWith('SELECT category FROM exercises')) return [{ category: 'Cardio' }];
        if (sql.includes('INSERT INTO template_exercises')) return { affectedRows: 1 };
        return [];
    };

    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { addExerciseToTemplate } = harness.module;
        const req = createMockRequest({
            params: { templateId: 12 },
            user: { id: 3 },
            body: {
                exercise_id: 8,
                position: 0,
                default_sets: 5,
                default_reps: '12-15',
                durationMinutes: 18
            }
        });
        const res = createMockResponse();

        await addExerciseToTemplate(req, res);

        assert.equal(res.statusCode, 201);
        assert.deepEqual(res.body, { message: 'Exercicio adicionado ao template' });

        const insertCall = calls.find((call) => String(call.sql).includes('INSERT INTO template_exercises'));
        assert.equal(insertCall.params[3], 1);
        assert.equal(insertCall.params[4], '0');
        assert.equal(insertCall.params[5], 18);
    } finally {
        harness.restore();
    }
});

test('getTemplateDetails returns 404 for unknown template', async () => {
    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => []
        }
    });

    try {
        const { getTemplateDetails } = harness.module;
        const req = createMockRequest({
            params: { id: 99 },
            user: { id: 7 }
        });
        const res = createMockResponse();

        await getTemplateDetails(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Template nao encontrado' });
    } finally {
        harness.restore();
    }
});

test('getTemplateDetails returns template with exercise details', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('FROM workout_templates')) {
            return [
                {
                    id: 3,
                    user_id: 7,
                    creator_name: 'Maria',
                    name: 'Treino B',
                    frequency: '2x',
                    split_type: 'Full body',
                    notes: 'ok',
                    created_by_profile: 'student',
                    assigned_student_user_id: null,
                    gym_id: null,
                    status: 'active',
                    editable_by_student: 1,
                    created_at: '2026-06-16 10:00:00'
                }
            ];
        }

        return [
            {
                template_id: 3,
                exercise_id: 9,
                defaultSets: 4,
                defaultReps: '8-12',
                durationMinutes: null,
                name: 'Supino',
                category: 'Peito'
            }
        ];
    };

    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        }
    });

    try {
        const { getTemplateDetails } = harness.module;
        const req = createMockRequest({
            params: { id: 3 },
            user: { id: 7 }
        });
        const res = createMockResponse();

        await getTemplateDetails(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.template.id, 3);
        assert.equal(res.body.template.exercises.length, 1);
        assert.equal(res.body.template.exercises[0].name, 'Supino');
    } finally {
        harness.restore();
    }
});

test('deleteTemplate returns 404 when template does not exist', async () => {
    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => ({ affectedRows: 0 })
        }
    });

    try {
        const { deleteTemplate } = harness.module;
        const req = createMockRequest({
            params: { id: 3 },
            user: { id: 7 }
        });
        const res = createMockResponse();

        await deleteTemplate(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Template nao encontrado' });
    } finally {
        harness.restore();
    }
});

test('deleteTemplate removes template successfully', async () => {
    const harness = loadWithMocks(templateModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => ({ affectedRows: 1 })
        }
    });

    try {
        const { deleteTemplate } = harness.module;
        const req = createMockRequest({
            params: { id: 3 },
            user: { id: 7 }
        });
        const res = createMockResponse();

        await deleteTemplate(req, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { message: 'Template deletado' });
    } finally {
        harness.restore();
    }
});
