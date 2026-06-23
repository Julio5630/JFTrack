const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const permissionsModulePath = path.join(__dirname, '../../middlewares/permissions.js');

test('requireProfile allows matching active profile', () => {
    const harness = loadWithMocks(permissionsModulePath, {
        '../config/database': { query: async () => [] }
    });

    try {
        const { requireProfile } = harness.module;
        const middleware = requireProfile('student');
        const req = createMockRequest({
            user: { profiles: [{ type: 'student' }] },
            activeProfile: 'student'
        });
        const res = createMockResponse();
        let nextCalled = false;

        middleware(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
    } finally {
        harness.restore();
    }
});

test('requireProfile blocks missing profile or mismatched active profile', () => {
    const harness = loadWithMocks(permissionsModulePath, {
        '../config/database': { query: async () => [] }
    });

    try {
        const { requireProfile } = harness.module;
        const middleware = requireProfile('student');
        const req = createMockRequest({
            user: { profiles: [{ type: 'student' }] },
            activeProfile: 'personal'
        });
        const res = createMockResponse();

        middleware(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { error: 'Perfil sem permissao para esta acao' });
    } finally {
        harness.restore();
    }
});

test('canManageOwnTraining allows admin profile', async () => {
    const harness = loadWithMocks(permissionsModulePath, {
        '../config/database': { query: async () => [] }
    });

    try {
        const { canManageOwnTraining } = harness.module;
        const req = createMockRequest({
            user: { is_admin: true, profiles: [{ type: 'admin' }] },
            activeProfile: 'admin'
        });
        const res = createMockResponse();
        let nextCalled = false;

        await canManageOwnTraining(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
    } finally {
        harness.restore();
    }
});

test('canManageOwnTraining allows personal profile', async () => {
    const harness = loadWithMocks(permissionsModulePath, {
        '../config/database': { query: async () => [] }
    });

    try {
        const { canManageOwnTraining } = harness.module;
        const req = createMockRequest({
            user: { profiles: [{ type: 'personal' }] },
            activeProfile: 'personal'
        });
        const res = createMockResponse();
        let nextCalled = false;

        await canManageOwnTraining(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
    } finally {
        harness.restore();
    }
});

test('canManageOwnTraining blocks academy students in academy mode', async () => {
    const harness = loadWithMocks(permissionsModulePath, {
        '../config/database': {
            query: async () => [{ id: 10 }]
        }
    });

    try {
        const { canManageOwnTraining } = harness.module;
        const req = createMockRequest({
            headers: { 'x-student-training-mode': 'academy' },
            user: { id: 3, profiles: [{ type: 'student' }] },
            activeProfile: 'student'
        });
        const res = createMockResponse();

        await canManageOwnTraining(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { error: 'Aluno vinculado a academia nao pode criar ou alterar treinos e exercicios' });
    } finally {
        harness.restore();
    }
});

test('canManageOwnTraining allows student in own mode', async () => {
    const harness = loadWithMocks(permissionsModulePath, {
        '../config/database': {
            query: async () => [{ id: 10 }]
        }
    });

    try {
        const { canManageOwnTraining } = harness.module;
        const req = createMockRequest({
            headers: { 'x-student-training-mode': 'own' },
            user: { id: 3, profiles: [{ type: 'student' }] },
            activeProfile: 'student'
        });
        const res = createMockResponse();
        let nextCalled = false;

        await canManageOwnTraining(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
    } finally {
        harness.restore();
    }
});
