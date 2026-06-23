const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createMockRequest, createMockResponse } = require('../helpers/http');
const { loadWithMocks } = require('../helpers/moduleHarness');

const bodyMetricsModulePath = path.join(__dirname, '../../controllers/bodyMetricsController.js');

test('listBodyMetrics returns normalized metrics ordered by controller query', async () => {
    const queryMock = async () => [
        {
            id: 9,
            recorded_date: '2026-06-16',
            created_at: '2026-06-16 09:00:00',
            notes: 'Avaliacao da semana',
            weight: 80,
            height: 180,
            relaxed_biceps: 34,
            contracted_biceps: 36,
            forearm: 29,
            chest: 102,
            shoulders: 118,
            waist: 82,
            abdomen: 84,
            hip: 98,
            upper_thigh: 61,
            middle_thigh: 55,
            lower_thigh: 44,
            calf: 38
        }
    ];

    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': { query: queryMock }
    });

    try {
        const { listBodyMetrics } = harness.module;
        const req = createMockRequest({ user: { id: 4 } });
        const res = createMockResponse();

        await listBodyMetrics(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.metrics.length, 1);
        assert.equal(res.body.metrics[0].weight, 80);
        assert.equal(res.body.metrics[0].relaxedBiceps, 34);
        assert.equal(res.body.metrics[0].middleThigh, 55);
        assert.equal(res.body.metrics[0].notes, 'Avaliacao da semana');
    } finally {
        harness.restore();
    }
});

test('createBodyMetric returns 400 when date is invalid', async () => {
    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': { query: async () => [] }
    });

    try {
        const { createBodyMetric } = harness.module;
        const req = createMockRequest({
            user: { id: 4 },
            body: { recordedDate: '16/06/2026', weight: 80 }
        });
        const res = createMockResponse();

        await createBodyMetric(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'Informe uma data valida' });
    } finally {
        harness.restore();
    }
});

test('createBodyMetric returns 400 when all body metrics are empty', async () => {
    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': { query: async () => [] }
    });

    try {
        const { createBodyMetric } = harness.module;
        const req = createMockRequest({
            user: { id: 4 },
            body: { recordedDate: '2026-06-16', notes: 'sem dados' }
        });
        const res = createMockResponse();

        await createBodyMetric(req, res);

        assert.equal(res.statusCode, 400);
        assert.deepEqual(res.body, { error: 'Informe pelo menos uma metrica corporal' });
    } finally {
        harness.restore();
    }
});

test('createBodyMetric stores metrics and returns normalized dto', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes('INSERT INTO student_body_metrics')) {
            return { insertId: 31 };
        }

        return [
            {
                id: 31,
                recorded_date: '2026-06-16',
                created_at: '2026-06-16 10:00:00',
                notes: 'Primeira coleta',
                weight: 81,
                height: 181,
                relaxed_biceps: 35,
                contracted_biceps: 37,
                forearm: 30,
                chest: 103,
                shoulders: 120,
                waist: 83,
                abdomen: 85,
                hip: 99,
                upper_thigh: 62,
                middle_thigh: 56,
                lower_thigh: 45,
                calf: 39
            }
        ];
    };

    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': { query: queryMock }
    });

    try {
        const { createBodyMetric } = harness.module;
        const req = createMockRequest({
            user: { id: 4 },
            body: {
                recordedDate: '2026-06-16',
                weight: '81',
                height: '181',
                relaxedBiceps: '35',
                contractedBiceps: 37,
                forearm: 30,
                chest: 103,
                shoulders: 120,
                waist: 83,
                abdomen: 85,
                hip: 99,
                upperThigh: 62,
                middleThigh: 56,
                lowerThigh: 45,
                calf: 39,
                notes: 'Primeira coleta'
            }
        });
        const res = createMockResponse();

        await createBodyMetric(req, res);

        assert.equal(res.statusCode, 201);
        assert.equal(res.body.metric.id, 31);
        assert.equal(res.body.metric.height, 181);
        assert.equal(res.body.metric.upperThigh, 62);

        const insertCall = calls.find((call) => String(call.sql).includes('INSERT INTO student_body_metrics'));
        assert.equal(insertCall.params[0], 4);
        assert.equal(insertCall.params[1], '2026-06-16');
        assert.equal(insertCall.params[2], 81);
        assert.equal(insertCall.params[3], 181);
        assert.equal(insertCall.params.at(-1), 'Primeira coleta');
    } finally {
        harness.restore();
    }
});

test('updateBodyMetric returns 404 when registro does not exist', async () => {
    const queryMock = async (sql) => {
        if (sql.includes('UPDATE student_body_metrics')) {
            return { affectedRows: 0 };
        }
        return [];
    };

    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': { query: queryMock }
    });

    try {
        const { updateBodyMetric } = harness.module;
        const req = createMockRequest({
            params: { id: 91 },
            user: { id: 4 },
            body: { recordedDate: '2026-06-16', weight: 80 }
        });
        const res = createMockResponse();

        await updateBodyMetric(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Registro nao encontrado' });
    } finally {
        harness.restore();
    }
});

test('updateBodyMetric updates metric values and returns dto', async () => {
    const calls = [];
    const queryMock = async (sql, params) => {
        calls.push({ sql, params });

        if (sql.includes('UPDATE student_body_metrics')) {
            return { affectedRows: 1 };
        }

        return [
            {
                id: 14,
                recorded_date: '2026-06-20',
                created_at: '2026-06-16 10:00:00',
                notes: 'Atualizacao mensal',
                weight: 79,
                height: 180,
                relaxed_biceps: 35,
                contracted_biceps: 37,
                forearm: 30,
                chest: 104,
                shoulders: 121,
                waist: 81,
                abdomen: 83,
                hip: 97,
                upper_thigh: 61,
                middle_thigh: 55,
                lower_thigh: 44,
                calf: 38
            }
        ];
    };

    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': { query: queryMock }
    });

    try {
        const { updateBodyMetric } = harness.module;
        const req = createMockRequest({
            params: { id: 14 },
            user: { id: 4 },
            body: {
                recordedDate: '2026-06-20',
                weight: 79,
                height: 180,
                chest: 104,
                shoulders: 121,
                waist: 81,
                abdomen: 83,
                hip: 97,
                upperThigh: 61,
                middleThigh: 55,
                lowerThigh: 44,
                calf: 38,
                relaxedBiceps: 35,
                contractedBiceps: 37,
                forearm: 30,
                notes: 'Atualizacao mensal'
            }
        });
        const res = createMockResponse();

        await updateBodyMetric(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body.metric.recordedDate, '2026-06-20');
        assert.equal(res.body.metric.weight, 79);
        assert.equal(res.body.metric.chest, 104);

        const updateCall = calls.find((call) => String(call.sql).includes('UPDATE student_body_metrics'));
        assert.equal(updateCall.params[0], '2026-06-20');
        assert.equal(updateCall.params.at(-2), 14);
        assert.equal(updateCall.params.at(-1), 4);
    } finally {
        harness.restore();
    }
});

test('deleteBodyMetric returns 404 when registro was not found', async () => {
    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': {
            query: async () => ({ affectedRows: 0 })
        }
    });

    try {
        const { deleteBodyMetric } = harness.module;
        const req = createMockRequest({
            params: { id: 44 },
            user: { id: 4 }
        });
        const res = createMockResponse();
        res.end = function end() {
            this.ended = true;
            return this;
        };

        await deleteBodyMetric(req, res);

        assert.equal(res.statusCode, 404);
        assert.deepEqual(res.body, { error: 'Registro nao encontrado' });
    } finally {
        harness.restore();
    }
});

test('deleteBodyMetric returns 204 when registro is removed', async () => {
    const harness = loadWithMocks(bodyMetricsModulePath, {
        '../config/database': {
            query: async () => ({ affectedRows: 1 })
        }
    });

    try {
        const { deleteBodyMetric } = harness.module;
        const req = createMockRequest({
            params: { id: 44 },
            user: { id: 4 }
        });
        const res = createMockResponse();
        res.end = function end() {
            this.ended = true;
            return this;
        };

        await deleteBodyMetric(req, res);

        assert.equal(res.statusCode, 204);
        assert.equal(res.ended, true);
    } finally {
        harness.restore();
    }
});
