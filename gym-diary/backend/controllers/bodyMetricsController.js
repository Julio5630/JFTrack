const { query } = require('../config/database');

const metricFields = [
    'weight', 'height', 'relaxedBiceps', 'contractedBiceps', 'forearm', 'chest', 'shoulders', 'waist',
    'abdomen', 'hip', 'upperThigh', 'middleThigh', 'lowerThigh', 'calf'
];

const columnByField = {
    relaxedBiceps: 'relaxed_biceps',
    contractedBiceps: 'contracted_biceps',
    upperThigh: 'upper_thigh',
    middleThigh: 'middle_thigh',
    lowerThigh: 'lower_thigh'
};

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
};

const toDto = (row) => {
    const dto = {
        id: row.id,
        recordedDate: row.recorded_date,
        notes: row.notes || '',
        createdAt: row.created_at
    };

    metricFields.forEach((field) => {
        const column = columnByField[field] || field;
        dto[field] = row[column] === null ? null : Number(row[column]);
    });
    return dto;
};

const listBodyMetrics = async (req, res) => {
    try {
        const rows = await query(
            `SELECT *, DATE_FORMAT(recorded_date, '%Y-%m-%d') AS recorded_date
             FROM student_body_metrics
             WHERE user_id = ?
             ORDER BY recorded_date DESC, created_at DESC`,
            [req.user.id]
        );
        res.json({ metrics: rows.map(toDto) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar metricas corporais' });
    }
};

const createBodyMetric = async (req, res) => {
    try {
        const recordedDate = String(req.body.recordedDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedDate)) {
            return res.status(400).json({ error: 'Informe uma data valida' });
        }

        const values = metricFields.map((field) => toNumberOrNull(req.body[field]));
        if (values.every((value) => value === null)) {
            return res.status(400).json({ error: 'Informe pelo menos uma metrica corporal' });
        }

        const columns = metricFields.map((field) => columnByField[field] || field);
        const result = await query(
            `INSERT INTO student_body_metrics
             (user_id, recorded_date, ${columns.join(', ')}, notes)
             VALUES (?, ?, ${columns.map(() => '?').join(', ')}, ?)`,
            [req.user.id, recordedDate, ...values, String(req.body.notes || '').trim()]
        );

        const rows = await query(
            `SELECT *, DATE_FORMAT(recorded_date, '%Y-%m-%d') AS recorded_date
             FROM student_body_metrics WHERE id = ? AND user_id = ?`,
            [result.insertId, req.user.id]
        );
        res.status(201).json({ metric: toDto(rows[0]) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar metricas corporais' });
    }
};

const updateBodyMetric = async (req, res) => {
    try {
        const recordedDate = String(req.body.recordedDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedDate)) {
            return res.status(400).json({ error: 'Informe uma data valida' });
        }

        const values = metricFields.map((field) => toNumberOrNull(req.body[field]));
        if (values.every((value) => value === null)) {
            return res.status(400).json({ error: 'Informe pelo menos uma metrica corporal' });
        }

        const columns = metricFields.map((field) => columnByField[field] || field);
        const assignments = columns.map((column) => `${column} = ?`).join(', ');
        const result = await query(
            `UPDATE student_body_metrics
             SET recorded_date = ?, ${assignments}, notes = ?
             WHERE id = ? AND user_id = ?`,
            [recordedDate, ...values, String(req.body.notes || '').trim(), req.params.id, req.user.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Registro nao encontrado' });
        }

        const rows = await query(
            `SELECT *, DATE_FORMAT(recorded_date, '%Y-%m-%d') AS recorded_date
             FROM student_body_metrics WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );
        res.json({ metric: toDto(rows[0]) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar metricas corporais' });
    }
};

const deleteBodyMetric = async (req, res) => {
    try {
        const result = await query(
            'DELETE FROM student_body_metrics WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Registro nao encontrado' });
        res.status(204).end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao remover registro corporal' });
    }
};

module.exports = { listBodyMetrics, createBodyMetric, updateBodyMetric, deleteBodyMetric };
