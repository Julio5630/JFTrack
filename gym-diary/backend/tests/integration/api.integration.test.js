const test = require('node:test');
const assert = require('node:assert/strict');

const { startIntegrationServer } = require('../helpers/integrationServer');

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
            if (executeQueue.length === 0) return [[]];
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

const createJwtMock = () => ({
    sign(payload) {
        return `signed-token-${payload.id}`;
    },
    verify(token) {
        if (token === 'valid-student-token') return { id: 7, is_admin: 0 };
        if (token === 'valid-personal-token') return { id: 8, is_admin: 0 };
        if (token === 'valid-admin-token') return { id: 9, is_admin: 1 };
        throw new Error('invalid token');
    }
});

test('GET /api/health returns public health response', async () => {
    const server = await startIntegrationServer({
        '../config/database': { query: async () => [] },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/health`);
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(body, { status: 'OK' });
    } finally {
        await server.close();
    }
});

test('POST /api/auth/login returns token and normalized profiles', async () => {
    const queryMock = async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE email = ?') {
            return [{
                id: 7,
                name: 'Joao',
                email: params[0],
                phone: '31999999999',
                password: 'hashed-password',
                is_admin: 0
            }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }, { profile_type: 'personal' }];
        }

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': { query: queryMock },
        '../utils/hash': {
            comparePassword: async () => true,
            hashPassword: async () => 'hashed-password'
        },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                email: 'aluno@teste.com',
                password: '123456'
            })
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.token, 'signed-token-7');
        assert.equal(body.user.name, 'Joao');
        assert.equal(body.user.profiles.length, 2);
        assert.equal(body.user.profiles[0].type, 'student');
        assert.equal(body.user.profiles[1].type, 'personal');
    } finally {
        await server.close();
    }
});

test('GET /api/me returns 401 when token is missing', async () => {
    const server = await startIntegrationServer({
        '../config/database': { query: async () => [] },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/me`);
        const body = await response.json();

        assert.equal(response.status, 401);
        assert.deepEqual(body, { error: 'Token não fornecido' });
    } finally {
        await server.close();
    }
});

test('GET /api/me returns authenticated user dto', async () => {
    const queryMock = async (sql, params) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 7, name: 'Joao', email: 'joao@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }, { profile_type: 'personal' }];
        }

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': { query: queryMock },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/me`, {
            headers: {
                authorization: 'Bearer valid-student-token',
                'x-active-profile': 'student'
            }
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.user.id, 7);
        assert.equal(body.user.email, 'joao@teste.com');
        assert.equal(body.user.isAdmin, false);
        assert.equal(body.user.profiles.length, 2);
    } finally {
        await server.close();
    }
});

test('GET /api/body-metrics blocks access when active profile is not student', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 8, name: 'Carol', email: 'carol@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }, { profile_type: 'personal' }];
        }

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': { query: queryMock },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/body-metrics`, {
            headers: {
                authorization: 'Bearer valid-personal-token',
                'x-active-profile': 'personal'
            }
        });
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.deepEqual(body, { error: 'Perfil sem permissao para esta acao' });
    } finally {
        await server.close();
    }
});

test('POST /api/body-metrics creates a body metric using authenticated student profile', async () => {
    const queryMock = async (sql, params) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 7, name: 'Joao', email: 'joao@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }];
        }

        if (sql.includes('INSERT INTO student_body_metrics')) {
            return { insertId: 41 };
        }

        if (sql.includes('FROM student_body_metrics WHERE id = ? AND user_id = ?')) {
            return [{
                id: 41,
                recorded_date: '2026-06-16',
                created_at: '2026-06-16 10:00:00',
                notes: 'Medicao mensal',
                weight: 80,
                height: 180,
                relaxed_biceps: 34,
                contracted_biceps: 36,
                forearm: null,
                chest: null,
                shoulders: null,
                waist: null,
                abdomen: null,
                hip: null,
                upper_thigh: null,
                middle_thigh: null,
                lower_thigh: null,
                calf: null
            }];
        }

        throw new Error(`Unexpected SQL: ${sql} :: ${JSON.stringify(params)}`);
    };

    const server = await startIntegrationServer({
        '../config/database': { query: queryMock },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/body-metrics`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer valid-student-token',
                'x-active-profile': 'student',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                recordedDate: '2026-06-16',
                weight: 80,
                height: 180,
                relaxedBiceps: 34,
                contractedBiceps: 36,
                notes: 'Medicao mensal'
            })
        });
        const body = await response.json();

        assert.equal(response.status, 201);
        assert.equal(body.metric.id, 41);
        assert.equal(body.metric.weight, 80);
        assert.equal(body.metric.contractedBiceps, 36);
        assert.equal(body.metric.notes, 'Medicao mensal');
    } finally {
        await server.close();
    }
});

test('GET /api/personal/students returns students for authenticated personal profile', async () => {
    const queryMock = async (sql, params) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 8, name: 'Carol', email: 'carol@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'personal' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'personal'")) {
            return [{ gym_id: 9 }];
        }

        if (sql.includes('SELECT DISTINCT') && sql.includes("gm.role = 'student'")) {
            return [{
                id: 22,
                name: 'Joao',
                email: 'joao@teste.com',
                gym_id: 9,
                gym_name: 'FitCenter'
            }];
        }

        throw new Error(`Unexpected SQL: ${sql} :: ${JSON.stringify(params)}`);
    };

    const server = await startIntegrationServer({
        '../config/database': { query: queryMock },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/personal/students?gymId=9`, {
            headers: {
                authorization: 'Bearer valid-personal-token',
                'x-active-profile': 'personal'
            }
        });
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.students.length, 1);
        assert.equal(body.students[0].name, 'Joao');
        assert.equal(body.students[0].gym.name, 'FitCenter');
    } finally {
        await server.close();
    }
});

test('GET /api/users blocks non-admin users after authentication', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 7, name: 'Joao', email: 'joao@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }];
        }

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': { query: queryMock },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/users`, {
            headers: {
                authorization: 'Bearer valid-student-token',
                'x-active-profile': 'student'
            }
        });
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.deepEqual(body, { error: 'Acesso negado (admin)' });
    } finally {
        await server.close();
    }
});

test('POST /api/templates blocks academy student from managing own training', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 7, name: 'Joao', email: 'joao@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'student'")) {
            return [{ id: 55 }];
        }

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': {
            query: queryMock,
            pool: { getConnection: async () => createConnectionMock() }
        },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/templates`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer valid-student-token',
                'x-active-profile': 'student',
                'x-student-training-mode': 'academy',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Treino A',
                exercises: [{ id: 3, defaultSets: 4, defaultReps: '10-12' }]
            })
        });
        const body = await response.json();

        assert.equal(response.status, 403);
        assert.deepEqual(body, {
            error: 'Aluno vinculado a academia nao pode criar ou alterar treinos e exercicios'
        });
    } finally {
        await server.close();
    }
});

test('POST /api/templates creates template for student own flow', async () => {
    const connection = createConnectionMock();
    connection.executeQueue.push(
        [{ insertId: 91 }],
        [{ affectedRows: 1 }],
        [{ affectedRows: 1 }]
    );
    connection.queryQueue.push([[{ id: 3, category: 'Cardio' }, { id: 9, category: 'Peito' }]]);

    const queryMock = async (sql) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 7, name: 'Joao', email: 'joao@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'student'")) {
            return [];
        }

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': {
            query: queryMock,
            pool: { getConnection: async () => connection }
        },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/templates`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer valid-student-token',
                'x-active-profile': 'student',
                'x-student-training-mode': 'own',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Treino completo',
                frequency: '4x',
                splitType: 'A/B',
                exercises: [
                    { id: 3, durationMinutes: 22 },
                    { id: 9, defaultSets: 5, defaultReps: '6-8' }
                ]
            })
        });
        const body = await response.json();

        assert.equal(response.status, 201);
        assert.deepEqual(body, { message: 'Template criado com sucesso', templateId: 91 });
        assert.equal(connection.calls.some((call) => call.type === 'commit'), true);
    } finally {
        await server.close();
    }
});

test('POST /api/history saves workout for academy mode when assignment exists', async () => {
    const connection = createConnectionMock();
    connection.executeQueue.push(
        [[{ id: 300, gym_id: 9 }]],
        [{ insertId: 701 }],
        [{ affectedRows: 1 }],
        [{ affectedRows: 1 }]
    );

    const queryMock = async (sql) => {
        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 7, name: 'Joao', email: 'joao@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'student' }];
        }

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': {
            query: queryMock,
            pool: { getConnection: async () => connection }
        },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/history`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer valid-student-token',
                'x-active-profile': 'student',
                'x-student-training-mode': 'academy',
                'x-selected-student-gym-id': '9',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                template_id: 22,
                name: 'Treino A',
                date: '2026-06-16',
                exercises: [
                    {
                        exerciseId: 3,
                        sets: [
                            { reps: 10, weight: 20, completed: true },
                            { reps: 8, weight: 22, completed: false }
                        ]
                    }
                ]
            })
        });
        const body = await response.json();

        assert.equal(response.status, 201);
        assert.deepEqual(body, { message: 'Treino salvo', workoutId: 701 });
        assert.equal(connection.calls.some((call) => call.type === 'beginTransaction'), true);
        assert.equal(
            connection.calls.filter((call) => call.type === 'execute' && call.sql.includes('INSERT INTO workout_sets')).length,
            2
        );
    } finally {
        await server.close();
    }
});

test('POST /api/personal/assessments creates assessment through protected personal route', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes('SELECT id, name, email, is_admin FROM users WHERE id = ?')) {
            return [{ id: 8, name: 'Carol', email: 'carol@teste.com', is_admin: 0 }];
        }

        if (sql.includes('SELECT profile_type FROM user_profiles')) {
            return [{ profile_type: 'personal' }];
        }

        if (sql.includes('SELECT g.id, g.name')) {
            return [{ id: 9, name: 'FitCenter' }];
        }

        if (sql.includes('FROM gym_memberships') && sql.includes("role = 'personal'")) {
            return [{ gym_id: 9 }];
        }

        if (sql.includes('SELECT DISTINCT') && sql.includes("gm.role = 'student'")) {
            return [{ id: 22, name: 'Joao', email: 'joao@teste.com', gym_id: 9, gym_name: 'FitCenter' }];
        }

        if (sql.includes('INSERT INTO physical_assessments')) {
            return { insertId: 611 };
        }

        if (sql.startsWith('DELETE FROM assessment_questionnaire_responses')) return { affectedRows: 1 };
        if (sql.startsWith('INSERT INTO assessment_questionnaire_responses')) return { affectedRows: 1 };
        if (sql.startsWith('DELETE FROM physical_measurements')) return { affectedRows: 1 };
        if (sql.startsWith('INSERT INTO physical_measurements')) return { affectedRows: 1 };

        return [];
    };

    const server = await startIntegrationServer({
        '../config/database': {
            query: queryMock,
            pool: { getConnection: async () => createConnectionMock() }
        },
        'jsonwebtoken': createJwtMock()
    });

    try {
        const response = await fetch(`${server.baseUrl}/api/personal/assessments`, {
            method: 'POST',
            headers: {
                authorization: 'Bearer valid-personal-token',
                'x-active-profile': 'personal',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                studentId: 22,
                gymId: 9,
                assessmentDate: '2026-06-16',
                personalData: { mainGoal: 'Hipertrofia' },
                medicalHistory: { heartProblem: true },
                measurements: { weight: 80, height: 180, bodyFat: 16, generalObservations: 'Boa resposta' },
                workoutSuggestion: 'Treino ABC'
            })
        });
        const body = await response.json();

        assert.equal(response.status, 201);
        assert.deepEqual(body, { message: 'Avaliacao criada' });

        const assessmentInsert = calls.find((call) => String(call.sql).includes('INSERT INTO physical_assessments'));
        assert.equal(assessmentInsert.params[2], 9);
        assert.equal(assessmentInsert.params[16], 24.69);
        assert.equal(assessmentInsert.params[17], true);
    } finally {
        await server.close();
    }
});
