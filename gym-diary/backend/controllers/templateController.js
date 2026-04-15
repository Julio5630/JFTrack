const { query } = require('../config/database');

// 📌 Criar template
const createTemplate = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;

        const result = await query(
            'INSERT INTO workout_templates (user_id, name) VALUES (?, ?)',
            [userId, name]
        );

        res.status(201).json({
            message: 'Template criado com sucesso',
            templateId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar template' });
    }
};

// 📌 Listar templates do usuário
const getTemplates = async (req, res) => {
    try {
        const userId = req.user.id;

        const templates = await query(
            'SELECT * FROM workout_templates WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.json(templates);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar templates' });
    }
};

// 📌 Adicionar exercício ao template
const addExerciseToTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        const { exercise_id, position, default_sets } = req.body;

        await query(
            `INSERT INTO template_exercises (template_id, exercise_id, position, default_sets)
             VALUES (?, ?, ?, ?)`,
            [templateId, exercise_id, position, default_sets || 3]
        );

        res.status(201).json({ message: 'Exercício adicionado ao template' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar exercício' });
    }
};

// 📌 Buscar template completo (com exercícios)
const getTemplateDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const template = await query(
            'SELECT * FROM workout_templates WHERE id = ?',
            [id]
        );

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

// 📌 Deletar template
const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            'DELETE FROM workout_templates WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Template não encontrado' });
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
    addExerciseToTemplate,
    getTemplateDetails,
    deleteTemplate
};