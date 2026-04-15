const { query } = require('../config/database');

// 📌 Iniciar treino (cria registro)
const startWorkout = async (req, res) => {
    try {
        const userId = req.user.id;
        const { template_id, name, date } = req.body;

        const result = await query(
            `INSERT INTO workout_history (user_id, template_id, name, date)
             VALUES (?, ?, ?, ?)`,
            [userId, template_id || null, name, date]
        );

        res.status(201).json({
            message: 'Treino iniciado',
            workoutId: result.insertId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao iniciar treino' });
    }
};

// 📌 Adicionar série ao treino
const addSet = async (req, res) => {
    try {
        const { workoutId } = req.params;
        const {
            exercise_id,
            position,
            set_number,
            reps,
            weight,
            completed,
            notes
        } = req.body;

        await query(
            `INSERT INTO workout_sets 
            (workout_id, exercise_id, position, set_number, reps, weight, completed, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                workoutId,
                exercise_id,
                position,
                set_number,
                reps,
                weight,
                completed || false,
                notes || null
            ]
        );

        res.status(201).json({ message: 'Série adicionada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar série' });
    }
};

// 📌 Buscar histórico
const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const history = await query(
            `SELECT * FROM workout_history 
             WHERE user_id = ?
             ORDER BY date DESC`,
            [userId]
        );

        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
};

// 📌 Buscar treino completo
const getWorkoutDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const workout = await query(
            'SELECT * FROM workout_history WHERE id = ?',
            [id]
        );

        const sets = await query(
            `SELECT ws.*, e.name 
             FROM workout_sets ws
             JOIN exercises e ON e.id = ws.exercise_id
             WHERE ws.workout_id = ?
             ORDER BY ws.position, ws.set_number`,
            [id]
        );

        res.json({
            workout: workout[0],
            sets
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar treino' });
    }
};

module.exports = {
    startWorkout,
    addSet,
    getHistory,
    getWorkoutDetails
};