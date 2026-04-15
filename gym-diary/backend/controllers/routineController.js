const { query } = require('../config/database');

// 📌 Definir rotina da semana
const setRoutine = async (req, res) => {
    try {
        const userId = req.user.id;
        const { day_of_week, template_id } = req.body;

        await query(
            `INSERT INTO weekly_routines (user_id, day_of_week, template_id)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE template_id = VALUES(template_id)`,
            [userId, day_of_week, template_id]
        );

        res.json({ message: 'Rotina definida com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao definir rotina' });
    }
};

// 📌 Buscar rotina semanal completa
const getRoutine = async (req, res) => {
    try {
        const userId = req.user.id;

        const routine = await query(
            `SELECT wr.day_of_week, wt.id as template_id, wt.name
             FROM weekly_routines wr
             LEFT JOIN workout_templates wt ON wt.id = wr.template_id
             WHERE wr.user_id = ?
             ORDER BY wr.day_of_week ASC`,
            [userId]
        );

        res.json(routine);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar rotina' });
    }
};

// 📌 Remover rotina de um dia
const deleteRoutine = async (req, res) => {
    try {
        const userId = req.user.id;
        const { day } = req.params;

        const result = await query(
            'DELETE FROM weekly_routines WHERE user_id = ? AND day_of_week = ?',
            [userId, day]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Rotina não encontrada' });
        }

        res.json({ message: 'Rotina removida' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao remover rotina' });
    }
};

module.exports = {
    setRoutine,
    getRoutine,
    deleteRoutine
};