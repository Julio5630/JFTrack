const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const gymModulePath = path.join(__dirname, '../../controllers/gymController.js');

test('getStudentWorkouts falls back to unscoped assignments when selected gym returns no templates', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes('FROM personal_workout_assignments') && params.length === 2) {
            return [];
        }

        if (sql.includes('FROM personal_workout_assignments') && params.length === 1) {
            return [
                {
                    id: 101,
                    user_id: 7,
                    name: 'Treino A',
                    trainer_name: 'Carlos',
                    assignment_id: 501,
                    assignment_gym_id: 12,
                    assignment_notes: 'Manter cadence'
                }
            ];
        }

        if (sql.includes('FROM template_exercises')) {
            return [
                {
                    template_id: 101,
                    id: 33,
                    defaultSets: 3,
                    defaultReps: '8-12',
                    durationMinutes: null,
                    position: 0,
                    name: 'Supino',
                    category: 'Peito',
                    videoUrl: 'https://youtu.be/demo',
                    ownerUserId: 7
                }
            ];
        }

        return [];
    };

    const harness = loadWithMocks(gymModulePath, {
        '../config/database': { query: queryMock },
        '../utils/profiles': {
            activateUserProfile: async () => {},
            getUserProfiles: async () => []
        },
        './authController': {
            toUserDto: (user) => user
        }
    });

    try {
        const { getStudentWorkouts } = harness.module;
        const req = createMockRequest({
            headers: {
                'x-selected-student-gym-id': '999'
            },
            user: { id: 20 }
        });
        const res = createMockResponse();

        await getStudentWorkouts(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.templates.length, 1);
        assert.equal(res.body.templates[0].assignmentId, 501);
        assert.equal(res.body.templates[0].exercises.length, 1);
        assert.equal(res.body.exercises.length, 1);
        assert.equal(
            calls.filter((call) => call.sql.includes('FROM personal_workout_assignments')).length,
            2
        );
    } finally {
        harness.restore();
    }
});

test('getStudentWorkouts returns empty collections when no assignments exist', async () => {
    const harness = loadWithMocks(gymModulePath, {
        '../config/database': { query: async () => [] },
        '../utils/profiles': {
            activateUserProfile: async () => {},
            getUserProfiles: async () => []
        },
        './authController': {
            toUserDto: (user) => user
        }
    });

    try {
        const { getStudentWorkouts } = harness.module;
        const req = createMockRequest({
            user: { id: 20 }
        });
        const res = createMockResponse();

        await getStudentWorkouts(req, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, { templates: [], exercises: [] });
    } finally {
        harness.restore();
    }
});
