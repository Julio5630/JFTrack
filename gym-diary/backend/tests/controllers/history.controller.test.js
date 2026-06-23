const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const historyModulePath = path.join(__dirname, '../../controllers/historyController.js');

const createConnectionMock = () => {
    const calls = [];
    const queuedResults = [];

    return {
        calls,
        queuedResults,
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
            if (queuedResults.length === 0) return [[]];
            const next = queuedResults.shift();
            return typeof next === 'function' ? next(sql, params) : next;
        }
    };
};

test('startWorkout returns 400 for invalid payload', async () => {
    const connection = createConnectionMock();
    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { startWorkout } = harness.module;
        const req = createMockRequest({
            user: { id: 1 },
            body: { name: '', date: '', exercises: [] }
        });
        const res = createMockResponse();

        await startWorkout(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'Treino invalido' });
        assert.equal(connection.calls.some((call) => call.type === 'beginTransaction'), false);
    } finally {
        harness.restore();
    }
});

test('startWorkout blocks academy mode without template id', async () => {
    const connection = createConnectionMock();
    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { startWorkout } = harness.module;
        const req = createMockRequest({
            headers: {
                'x-student-training-mode': 'academy',
                'x-selected-student-gym-id': '12'
            },
            user: { id: 1 },
            body: {
                name: 'Treino A',
                date: '2026-06-16',
                exercises: [{ exerciseId: 1, sets: [{ reps: 10, weight: 20, completed: true }] }]
            }
        });
        const res = createMockResponse();

        await startWorkout(req, res);

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { error: 'Aluno de academia so pode executar treinos atribuidos' });
    } finally {
        harness.restore();
    }
});

test('startWorkout blocks academy mode without selected gym', async () => {
    const connection = createConnectionMock();
    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { startWorkout } = harness.module;
        const req = createMockRequest({
            headers: {
                'x-student-training-mode': 'academy'
            },
            user: { id: 1 },
            body: {
                template_id: 22,
                name: 'Treino A',
                date: '2026-06-16',
                exercises: [{ exerciseId: 1, sets: [{ reps: 10, weight: 20, completed: true }] }]
            }
        });
        const res = createMockResponse();

        await startWorkout(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'Selecione a academia antes de executar este treino' });
    } finally {
        harness.restore();
    }
});

test('startWorkout blocks academy mode when assignment is not found', async () => {
    const connection = createConnectionMock();
    connection.queuedResults.push([[]]);

    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { startWorkout } = harness.module;
        const req = createMockRequest({
            headers: {
                'x-student-training-mode': 'academy',
                'x-selected-student-gym-id': '12'
            },
            user: { id: 1 },
            body: {
                template_id: 22,
                name: 'Treino A',
                date: '2026-06-16',
                exercises: [{ exerciseId: 1, sets: [{ reps: 10, weight: 20, completed: true }] }]
            }
        });
        const res = createMockResponse();

        await startWorkout(req, res);

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { error: 'Treino nao atribuido ao aluno' });
    } finally {
        harness.restore();
    }
});

test('startWorkout blocks own mode when template does not belong to own flow', async () => {
    const connection = createConnectionMock();
    connection.queuedResults.push([[]]);

    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => true
        }
    });

    try {
        const { startWorkout } = harness.module;
        const req = createMockRequest({
            headers: {
                'x-student-training-mode': 'own'
            },
            user: { id: 1 },
            body: {
                template_id: 22,
                name: 'Treino proprio',
                date: '2026-06-16',
                exercises: [{ exerciseId: 1, sets: [{ reps: 10, weight: 20, completed: true }] }]
            }
        });
        const res = createMockResponse();

        await startWorkout(req, res);

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { error: 'Este treino nao pertence ao seu fluxo proprio' });
    } finally {
        harness.restore();
    }
});

test('startWorkout persists workout history and sets on success', async () => {
    const connection = createConnectionMock();
    connection.queuedResults.push(
        [[{ id: 15, gym_id: 12 }]],
        [{ insertId: 90 }],
        [{ affectedRows: 1 }],
        [{ affectedRows: 1 }]
    );

    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => connection },
            query: async () => []
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { startWorkout } = harness.module;
        const req = createMockRequest({
            headers: {
                'x-student-training-mode': 'academy',
                'x-selected-student-gym-id': '12'
            },
            user: { id: 1 },
            body: {
                template_id: 22,
                name: 'Treino A',
                date: '2026-06-16',
                exercises: [
                    {
                        exerciseId: 3,
                        sets: [
                            { reps: 10, weight: 20, durationSeconds: 0, completed: true },
                            { reps: 8, weight: 22, durationSeconds: 0, completed: false }
                        ]
                    }
                ]
            }
        });
        const res = createMockResponse();

        await startWorkout(req, res);

        assert.equal(res.statusCode, 201);
        assert.deepEqual(res.body, { message: 'Treino salvo', workoutId: 90 });
        assert.equal(connection.calls.some((call) => call.type === 'beginTransaction'), true);
        assert.equal(connection.calls.some((call) => call.type === 'commit'), true);
        assert.equal(
            connection.calls.filter((call) => call.type === 'execute' && call.sql.includes('INSERT INTO workout_sets')).length,
            2
        );
    } finally {
        harness.restore();
    }
});

test('getHistory returns empty array when no workout exists', async () => {
    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => []
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { getHistory } = harness.module;
        const req = createMockRequest({ user: { id: 4 } });
        const res = createMockResponse();

        await getHistory(req, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, []);
    } finally {
        harness.restore();
    }
});

test('getHistory groups sets by exercise position', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('FROM workout_history')) {
            return [
                {
                    id: 10,
                    user_id: 4,
                    template_id: 11,
                    gym_id: null,
                    assignment_id: null,
                    source_type: 'own',
                    name: 'Treino A',
                    date: '2026-06-16',
                    created_at: '2026-06-16 10:00:00',
                    gym_name: null
                }
            ];
        }

        return [
            {
                history_id: 10,
                exercise_id: 9,
                position: 0,
                reps: 10,
                weight: 20,
                duration_seconds: 0,
                completed: 1,
                notes: null,
                exercise_name: 'Supino',
                exercise_category: 'Peito'
            },
            {
                history_id: 10,
                exercise_id: 9,
                position: 0,
                reps: 8,
                weight: 22,
                duration_seconds: 0,
                completed: 0,
                notes: null,
                exercise_name: 'Supino',
                exercise_category: 'Peito'
            }
        ];
    };

    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: queryMock
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { getHistory } = harness.module;
        const req = createMockRequest({ user: { id: 4 } });
        const res = createMockResponse();

        await getHistory(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.length, 1);
        assert.equal(res.body[0].exercises.length, 1);
        assert.equal(res.body[0].exercises[0].exerciseName, 'Supino');
        assert.equal(res.body[0].exercises[0].sets.length, 2);
    } finally {
        harness.restore();
    }
});

test('deleteWorkout returns 404 when workout does not exist', async () => {
    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => ({ affectedRows: 0 })
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { deleteWorkout } = harness.module;
        const req = createMockRequest({
            params: { id: 88 },
            user: { id: 5 }
        });
        const res = createMockResponse();

        await deleteWorkout(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Treino realizado nao encontrado' });
    } finally {
        harness.restore();
    }
});

test('deleteWorkout returns success when workout is removed', async () => {
    const harness = loadWithMocks(historyModulePath, {
        '../config/database': {
            pool: { getConnection: async () => createConnectionMock() },
            query: async () => ({ affectedRows: 1 })
        },
        '../middlewares/permissions': {
            isAcademyStudent: async () => false
        }
    });

    try {
        const { deleteWorkout } = harness.module;
        const req = createMockRequest({
            params: { id: 88 },
            user: { id: 5 }
        });
        const res = createMockResponse();

        await deleteWorkout(req, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { message: 'Treino realizado removido com sucesso' });
    } finally {
        harness.restore();
    }
});
