const { pool, query } = require('../config/database');

const createTemplate = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { name, exercises = [] } = req.body;
        const userId = req.user.id;

        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'Nome e exercicios sao obrigatorios' });
        }

        await connection.beginTransaction();

        const [result] = await connection.execute(
            'INSERT INTO workout_templates (user_id, name) VALUES (?, ?)',
            [userId, name]
        );

        for (const [index, exercise] of exercises.entries()) {
            await connection.execute(
                `INSERT INTO template_exercises (template_id, exercise_id, position, default_sets)
                 VALUES (?, ?, ?, ?)`,
                [result.insertId, exercise.id, index, exercise.defaultSets || 3]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Template criado com sucesso',
            templateId: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar template' });
    } finally {
        connection.release();
    }
};

const getTemplates = async (req, res) => {
    try {
        const userId = req.user.id;

        const templates = await query(
            'SELECT * FROM workout_templates WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        const exercises = templates.length > 0
            ? await query(
                `SELECT te.template_id, te.exercise_id AS id, te.default_sets AS defaultSets, te.position
                 FROM template_exercises te
                 JOIN workout_templates wt ON wt.id = te.template_id
                 WHERE wt.user_id = ?
                 ORDER BY te.template_id, te.position ASC`,
                [userId]
            )
            : [];

        res.json(templates.map(template => ({
            ...template,
            exercises: exercises
                .filter(exercise => exercise.template_id === template.id)
                .map(({ template_id, position, ...exercise }) => exercise)
        })));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar templates' });
    }
};

const updateTemplate = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { name, exercises = [] } = req.body;
        const userId = req.user.id;

        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'Nome e exercicios sao obrigatorios' });
        }

        await connection.beginTransaction();

        const [result] = await connection.execute(
            'UPDATE workout_templates SET name = ? WHERE id = ? AND user_id = ?',
            [name, id, userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Template nao encontrado' });
        }

        await connection.execute('DELETE FROM template_exercises WHERE template_id = ?', [id]);

        for (const [index, exercise] of exercises.entries()) {
            await connection.execute(
                `INSERT INTO template_exercises (template_id, exercise_id, position, default_sets)
                 VALUES (?, ?, ?, ?)`,
                [id, exercise.id, index, exercise.defaultSets || 3]
            );
        }

        await connection.commit();
        res.json({ message: 'Template atualizado' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar template' });
    } finally {
        connection.release();
    }
};

const addExerciseToTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        const { exercise_id, position, default_sets } = req.body;
        const userId = req.user.id;

        const template = await query(
            'SELECT id FROM workout_templates WHERE id = ? AND user_id = ?',
            [templateId, userId]
        );

        if (template.length === 0) {
            return res.status(404).json({ error: 'Template nao encontrado' });
        }

        await query(
            `INSERT INTO template_exercises (template_id, exercise_id, position, default_sets)
             VALUES (?, ?, ?, ?)`,
            [templateId, exercise_id, position, default_sets || 3]
        );

        res.status(201).json({ message: 'Exercicio adicionado ao template' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar exercicio' });
    }
};

const getTemplateDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const template = await query(
            'SELECT * FROM workout_templates WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (template.length === 0) {
            return res.status(404).json({ error: 'Template nao encontrado' });
        }

        const exercises = await query(
            `SELECT te.*, e.name, e.category
             FROM template_exercises te
             JOIN exercises e ON e.id = te.exercise_id
             WHERE te.template_id = ?
             ORDER BY te.position ASC`,
            [id]
        );

        res.json({
            template: template[0],
            exercises
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar template' });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            'DELETE FROM workout_templates WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Template nao encontrado' });
        }

        res.json({ message: 'Template deletado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar template' });
    }
};

module.exports = {
    createTemplate,
    getTemplates,
    updateTemplate,
    addExerciseToTemplate,
    getTemplateDetails,
    deleteTemplate
};
