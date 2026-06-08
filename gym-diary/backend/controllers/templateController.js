const { pool, query } = require('../config/database');

const toTemplateDto = (template, exercises = [], currentUserId = null) => ({
    id: template.id,
    user_id: template.user_id,
    ownerUserId: template.user_id,
    creatorName: template.creator_name || template.owner_name || null,
    name: template.name,
    frequency: template.frequency || '',
    splitType: template.split_type || '',
    split_type: template.split_type || '',
    notes: template.notes || '',
    createdByProfile: template.created_by_profile || 'student',
    assignedStudentUserId: template.assigned_student_user_id || null,
    gymId: template.gym_id || null,
    status: template.status || 'active',
    editableByStudent: template.editable_by_student === undefined
        ? true
        : Boolean(template.editable_by_student),
    created_at: template.created_at,
    canEdit: currentUserId ? Number(template.user_id) === Number(currentUserId) : false,
    exercises
});

const createTemplate = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            name,
            exercises = [],
            frequency = '',
            splitType = '',
            notes = '',
            assignedStudentUserId = null,
            gymId = null,
            status = 'active'
        } = req.body;
        const userId = req.user.id;
        const createdByProfile = req.activeProfile || (req.user.is_admin ? 'admin' : 'student');
        const normalizedStatus = status === 'inactive' ? 'inactive' : 'active';
        const editableByStudent = createdByProfile === 'student';

        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'Nome e exercicios sao obrigatorios' });
        }

        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO workout_templates
             (user_id, name, frequency, split_type, notes, created_by_profile, assigned_student_user_id, gym_id, status, editable_by_student)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                name,
                frequency,
                splitType,
                notes,
                createdByProfile,
                assignedStudentUserId || null,
                gymId || null,
                normalizedStatus,
                editableByStudent
            ]
        );

        for (const [index, exercise] of exercises.entries()) {
            await connection.execute(
                `INSERT INTO template_exercises (template_id, exercise_id, position, default_sets, default_reps)
                 VALUES (?, ?, ?, ?, ?)`,
                [result.insertId, exercise.id, index, exercise.defaultSets || 3, exercise.defaultReps || '8-12']
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
            `SELECT wt.*, u.name AS creator_name
             FROM workout_templates wt
             JOIN users u ON u.id = wt.user_id
             WHERE wt.user_id = ?
             ORDER BY wt.created_at DESC`,
            [userId]
        );

        const exercises = templates.length > 0
            ? await query(
                `SELECT te.template_id, te.exercise_id AS id, te.default_sets AS defaultSets, te.default_reps AS defaultReps, te.position
                 FROM template_exercises te
                 JOIN workout_templates wt ON wt.id = te.template_id
                 WHERE wt.user_id = ?
                 ORDER BY te.template_id, te.position ASC`,
                [userId]
            )
            : [];

        res.json(templates.map(template => toTemplateDto(
            template,
            exercises
                .filter(exercise => exercise.template_id === template.id)
                .map(({ template_id, position, ...exercise }) => exercise),
            userId
        )));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar templates' });
    }
};

const updateTemplate = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { name, exercises = [], frequency = '', splitType = '', notes = '', status = 'active' } = req.body;
        const userId = req.user.id;
        const normalizedStatus = status === 'inactive' ? 'inactive' : 'active';

        if (!name || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'Nome e exercicios sao obrigatorios' });
        }

        await connection.beginTransaction();

        const [result] = await connection.execute(
            'UPDATE workout_templates SET name = ?, frequency = ?, split_type = ?, notes = ?, status = ? WHERE id = ? AND user_id = ?',
            [name, frequency, splitType, notes, normalizedStatus, id, userId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Template nao encontrado' });
        }

        await connection.execute('DELETE FROM template_exercises WHERE template_id = ?', [id]);

        for (const [index, exercise] of exercises.entries()) {
            await connection.execute(
                `INSERT INTO template_exercises (template_id, exercise_id, position, default_sets, default_reps)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, exercise.id, index, exercise.defaultSets || 3, exercise.defaultReps || '8-12']
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
        const { exercise_id, position, default_sets, default_reps } = req.body;
        const userId = req.user.id;

        const template = await query(
            'SELECT id FROM workout_templates WHERE id = ? AND user_id = ?',
            [templateId, userId]
        );

        if (template.length === 0) {
            return res.status(404).json({ error: 'Template nao encontrado' });
        }

        await query(
            `INSERT INTO template_exercises (template_id, exercise_id, position, default_sets, default_reps)
             VALUES (?, ?, ?, ?, ?)`,
            [templateId, exercise_id, position, default_sets || 3, default_reps || '8-12']
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
            `SELECT wt.*, u.name AS creator_name
             FROM workout_templates wt
             JOIN users u ON u.id = wt.user_id
             WHERE wt.id = ? AND wt.user_id = ?`,
            [id, userId]
        );

        if (template.length === 0) {
            return res.status(404).json({ error: 'Template nao encontrado' });
        }

        const exercises = await query(
            `SELECT te.*, te.default_reps AS defaultReps, e.name, e.category
             FROM template_exercises te
             JOIN exercises e ON e.id = te.exercise_id
             WHERE te.template_id = ?
             ORDER BY te.position ASC`,
            [id]
        );

        res.json({
            template: toTemplateDto(template[0], exercises, userId)
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
