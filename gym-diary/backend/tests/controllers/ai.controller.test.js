const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const aiModulePath = path.join(__dirname, '../../controllers/aiController.js');

test('suggestWorkout returns 400 when exercise catalog is missing', async () => {
    const harness = loadWithMocks(aiModulePath, {
        '../services/groqService': {
            createChatCompletion: async () => ({})
        }
    });

    try {
        const { suggestWorkout } = harness.module;
        const req = createMockRequest({
            body: { goal: 'Hipertrofia', availableExercises: [] }
        });
        const res = createMockResponse();

        await suggestWorkout(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'Envie a biblioteca de exercicios para gerar a sugestao.' });
    } finally {
        harness.restore();
    }
});

test('suggestWorkout normalizes Groq response into workout suggestion', async () => {
    const harness = loadWithMocks(aiModulePath, {
        '../services/groqService': {
            createChatCompletion: async () => ({
                name: 'Treino A',
                rationale: 'Equilibra força com cardio leve.',
                exercises: [
                    { id: 3, durationMinutes: 25 },
                    { id: 9, defaultSets: 4 },
                    { id: 9, defaultSets: 5 }
                ]
            })
        }
    });

    try {
        const { suggestWorkout } = harness.module;
        const req = createMockRequest({
            body: {
                goal: 'Hipertrofia',
                availableExercises: [
                    { id: 3, name: 'Esteira', category: 'Cardio' },
                    { id: 9, name: 'Supino', category: 'Peito' }
                ]
            }
        });
        const res = createMockResponse();

        await suggestWorkout(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.suggestion.name, 'Treino A');
        assert.equal(res.body.suggestion.exercises.length, 2);
        assert.deepEqual(res.body.suggestion.exercises[0], {
            id: 3,
            defaultSets: 1,
            durationMinutes: 25
        });
        assert.deepEqual(res.body.suggestion.exercises[1], {
            id: 9,
            defaultSets: 4,
            durationMinutes: null
        });
    } finally {
        harness.restore();
    }
});

test('summarizeAssessment returns normalized summary payload', async () => {
    const harness = loadWithMocks(aiModulePath, {
        '../services/groqService': {
            createChatCompletion: async () => ({
                headline: 'Boa base para evoluir',
                summary: 'Sua avaliação mostra uma base interessante para progredir com consistência.',
                highlights: ['Boa disponibilidade semanal'],
                attentionPoints: ['Monitorar desconforto no ombro'],
                nextSteps: ['Manter frequência', 'Revisar cargas com o profissional']
            })
        }
    });

    try {
        const { summarizeAssessment } = harness.module;
        const req = createMockRequest({
            body: {
                goal: 'Hipertrofia',
                weight: 80,
                height: 180
            }
        });
        const res = createMockResponse();

        await summarizeAssessment(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.summary.headline, 'Boa base para evoluir');
        assert.equal(res.body.summary.highlights.length, 1);
        assert.equal(res.body.summary.attentionPoints[0], 'Monitorar desconforto no ombro');
    } finally {
        harness.restore();
    }
});
