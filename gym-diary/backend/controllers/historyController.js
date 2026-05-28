const { pool, query } = require('../config/database');

const startWorkout = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.id;
        const { template_id, name, date, exercises = [] } = req.body;

        if (!name || !date || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'Treino invalido' });
        }

        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO workout_history (user_id, template_id, name, date)
             VALUES (?, ?, ?, ?)`,
            [userId, template_id || null, name, date]
        );

        for (const [position, exercise] of exercises.entries()) {
            for (const [setIndex, set] of exercise.sets.entries()) {
                await connection.execute(
                    `INSERT INTO workout_sets
                    (workout_id, exercise_id, position, set_number, reps, weight, completed, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        result.insertId,
                        exercise.exerciseId,
                        position,
                        setIndex + 1,
                        set.reps || 0,
                        set.weight || 0,
                        Boolean(set.completed),
                        set.notes || null
                    ]
                );
            }
        }

        await connection.commit();

        res.status(201).json({
            message: 'Treino salvo',
            workoutId: result.insertId
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Erro ao salvar treino' });
    } finally {
        connection.release();
    }
};

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

        res.status(201).json({ message: 'Serie adicionada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar serie' });
    }
};

const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const history = await query(
            `SELECT id, user_id, template_id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date, created_at
             FROM workout_history
             WHERE user_id = ?
             ORDER BY date DESC, created_at DESC`,
            [userId]
        );

        if (history.length === 0) {
            return res.json([]);
        }

        const sets = await query(
            `SELECT ws.*, wh.id AS history_id
             FROM workout_sets ws
             JOIN workout_history wh ON wh.id = ws.workout_id
             WHERE wh.user_id = ?
             ORDER BY ws.position, ws.set_number`,
            [userId]
        );

        res.json(history.map(workout => {
            const workoutSets = sets.filter(set => set.history_id === workout.id);
            const exercisesByPosition = new Map();

            workoutSets.forEach(set => {
                if (!exercisesByPosition.has(set.position)) {
                    exercisesByPosition.set(set.position, {
                        exerciseId: set.exercise_id,
                        sets: []
                    });
                }

                exercisesByPosition.get(set.position).sets.push({
                    reps: set.reps,
                    weight: Number(set.weight),
                    completed: Boolean(set.completed),
                    notes: set.notes
                });
            });

            return {
                ...workout,
                exercises: Array.from(exercisesByPosition.values())
            };
        }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar historico' });
    }
};

const getWorkoutDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const workout = await query(
            `SELECT id, user_id, template_id, name, DATE_FORMAT(date, '%Y-%m-%d') AS date, created_at
             FROM workout_history
             WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        if (workout.length === 0) {
            return res.status(404).json({ error: 'Treino nao encontrado' });
        }

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
