const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const authModulePath = path.join(__dirname, '../../middlewares/auth.js');

test('authenticateToken returns 401 when authorization header is missing', async () => {
    const harness = loadWithMocks(authModulePath, {
        jsonwebtoken: { verify: () => ({ id: 1 }) },
        '../config/database': { query: async () => [{ id: 1 }] },
        '../utils/profiles': { getUserProfiles: async () => [] }
    });

    try {
        const { authenticateToken } = harness.module;
        const req = createMockRequest();
        const res = createMockResponse();
        let nextCalled = false;

        await authenticateToken(req, res, () => {
            nextCalled = true;
        });

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { error: 'Token não fornecido' });
        assert.equal(nextCalled, false);
    } finally {
        harness.restore();
    }
});

test('authenticateToken returns 403 when token is invalid', async () => {
    const harness = loadWithMocks(authModulePath, {
        jsonwebtoken: { verify: () => { throw new Error('invalid'); } },
        '../config/database': { query: async () => [] },
        '../utils/profiles': { getUserProfiles: async () => [] }
    });

    try {
        const { authenticateToken } = harness.module;
        const req = createMockRequest({
            headers: { authorization: 'Bearer invalid-token' }
        });
        const res = createMockResponse();

        await authenticateToken(req, res, () => {});

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { error: 'Token inválido' });
    } finally {
        harness.restore();
    }
});

test('authenticateToken returns 401 when user does not exist', async () => {
    const harness = loadWithMocks(authModulePath, {
        jsonwebtoken: { verify: () => ({ id: 99 }) },
        '../config/database': { query: async () => [] },
        '../utils/profiles': { getUserProfiles: async () => [] }
    });

    try {
        const { authenticateToken } = harness.module;
        const req = createMockRequest({
            headers: { authorization: 'Bearer valid-token' }
        });
        const res = createMockResponse();

        await authenticateToken(req, res, () => {});

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, { error: 'Usuário não encontrado' });
    } finally {
        harness.restore();
    }
});

test('authenticateToken attaches user, profiles and active profile when token is valid', async () => {
    const profiles = [{ type: 'student' }, { type: 'personal' }];
    const harness = loadWithMocks(authModulePath, {
        jsonwebtoken: { verify: () => ({ id: 7 }) },
        '../config/database': {
            query: async () => [{ id: 7, name: 'Joao', email: 'joao@teste.com', is_admin: 0 }]
        },
        '../utils/profiles': { getUserProfiles: async () => profiles }
    });

    try {
        const { authenticateToken } = harness.module;
        const req = createMockRequest({
            headers: {
                authorization: 'Bearer valid-token',
                'x-active-profile': 'student'
            }
        });
        const res = createMockResponse();
        let nextCalled = false;

        await authenticateToken(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
        assert.equal(req.user.id, 7);
        assert.equal(req.user.name, 'Joao');
        assert.deepEqual(req.user.profiles, profiles);
        assert.equal(req.activeProfile, 'student');
    } finally {
        harness.restore();
    }
});

test('authenticateToken clears active profile when requested profile is not available', async () => {
    const harness = loadWithMocks(authModulePath, {
        jsonwebtoken: { verify: () => ({ id: 5 }) },
        '../config/database': {
            query: async () => [{ id: 5, name: 'Maria', email: 'maria@teste.com', is_admin: 0 }]
        },
        '../utils/profiles': { getUserProfiles: async () => [{ type: 'student' }] }
    });

    try {
        const { authenticateToken } = harness.module;
        const req = createMockRequest({
            headers: {
                authorization: 'Bearer valid-token',
                'x-active-profile': 'gym'
            }
        });
        const res = createMockResponse();

        await authenticateToken(req, res, () => {});

        assert.equal(req.activeProfile, null);
    } finally {
        harness.restore();
    }
});

test('isAdmin blocks non-admin users', () => {
    const harness = loadWithMocks(authModulePath, {
        jsonwebtoken: { verify: () => ({ id: 1 }) },
        '../config/database': { query: async () => [] },
        '../utils/profiles': { getUserProfiles: async () => [] }
    });

    try {
        const { isAdmin } = harness.module;
        const req = createMockRequest({
            user: { id: 1, is_admin: 0 }
        });
        const res = createMockResponse();
        let nextCalled = false;

        isAdmin(req, res, () => {
            nextCalled = true;
        });

        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, { error: 'Acesso negado (admin)' });
        assert.equal(nextCalled, false);
    } finally {
        harness.restore();
    }
});

test('isAdmin allows admin users', () => {
    const harness = loadWithMocks(authModulePath, {
        jsonwebtoken: { verify: () => ({ id: 1 }) },
        '../config/database': { query: async () => [] },
        '../utils/profiles': { getUserProfiles: async () => [] }
    });

    try {
        const { isAdmin } = harness.module;
        const req = createMockRequest({
            user: { id: 1, is_admin: 1 }
        });
        const res = createMockResponse();
        let nextCalled = false;

        isAdmin(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
        assert.equal(res.body, undefined);
    } finally {
        harness.restore();
    }
});
