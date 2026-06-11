const { pool, query } = require('../config/database');
const { isAcademyStudent } = require('../middlewares/permissions');

const getStudentScope = (req) => ({
    mode: req.get('X-Student-Training-Mode') === 'academy' ? 'academy' : 'own',
    gymId: req.get('X-Selected-Student-Gym-Id') || null
});

const startWorkout = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.id;
        const { template_id, name, date, exercises = [] } = req.body;
        const { mode, gymId } = getStudentScope(req);
        let assignmentId = null;

        if (!name || !date || !Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({ error: 'Treino invalido' });
        }

        if (mode === 'academy') {
            if (!template_id) {
                return res.status(403).json({ error: 'Aluno de academia so pode executar treinos atribuidos' });
            }

            if (!gymId) {
                return res.status(400).json({ error: 'Selecione a academia antes de executar este treino' });
            }

            const [assignments] = await connection.execute(
                `SELECT id, gym_id
                 FROM personal_workout_assignments
                 WHERE student_user_id = ? AND template_id = ? AND gym_id = ? AND status = 'active'
                 LIMIT 1`,
                [userId, template_id, gymId]
            );

            if (assignments.length === 0) {
                return res.status(403).json({ error: 'Treino nao atribuido ao aluno' });
            }

            assignmentId = assignments[0].id;
        }

        if (mode === 'own' && await isAcademyStudent(userId)) {
            const templates = template_id
                ? await connection.execute(
                    `SELECT id
                     FROM workout_templates
                     WHERE id = ? AND user_id = ? AND COALESCE(created_by_profile, 'student') = 'student'
                     LIMIT 1`,
                    [template_id, userId]
                )
                : [[]];

            if (template_id && templates[0].length === 0) {
                return res.status(403).json({ error: 'Este treino nao pertence ao seu fluxo proprio' });
            }
        }

        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO workout_history (user_id, template_id, gym_id, assignment_id, source_type, name, date)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                template_id || null,
                mode === 'academy' ? gymId : null,
                assignmentId,
                mode,
                name,
                date
            ]
        );

        for (const [position, exercise] of exercises.entries()) {
            for (const [setIndex, set] of exercise.sets.entries()) {
                await connection.execute(
                    `INSERT INTO workout_sets
                    (workout_id, exercise_id, position, set_number, reps, weight, duration_seconds, completed, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        result.insertId,
                        exercise.exerciseId,
                        position,
                        setIndex + 1,
                        set.reps || 0,
                        set.weight || 0,
                        Math.max(0, Number(set.durationSeconds) || 0),
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
            notes,
            duration_seconds = 0
        } = req.body;

        await query(
            `INSERT INTO workout_sets
            (workout_id, exercise_id, position, set_number, reps, weight, duration_seconds, completed, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                workoutId,
                exercise_id,
                position,
                set_number,
                reps,
                weight,
                Math.max(0, Number(duration_seconds) || 0),
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
        const params = [userId];

        const history = await query(
            `SELECT wh.id, wh.user_id, wh.template_id, wh.gym_id, wh.assignment_id, wh.source_type,
                    wh.name, DATE_FORMAT(wh.date, '%Y-%m-%d') AS date, wh.created_at,
                    g.name AS gym_name
             FROM workout_history wh
             LEFT JOIN gyms g ON g.id = wh.gym_id
             WHERE wh.user_id = ?
             ORDER BY date DESC, created_at DESC`,
            params
        );

        if (history.length === 0) {
            return res.json([]);
        }

        const sets = await query(
            `SELECT ws.*, wh.id AS history_id, e.name AS exercise_name, e.category AS exercise_category
             FROM workout_sets ws
             JOIN workout_history wh ON wh.id = ws.workout_id
             LEFT JOIN exercises e ON e.id = ws.exercise_id
             WHERE wh.user_id = ?
             ORDER BY ws.position, ws.set_number`,
            params
        );

        res.json(history.map(workout => {
            const workoutSets = sets.filter(set => set.history_id === workout.id);
            const exercisesByPosition = new Map();

            workoutSets.forEach(set => {
                if (!exercisesByPosition.has(set.position)) {
                    exercisesByPosition.set(set.position, {
                        exerciseId: set.exercise_id,
                        exerciseName: set.exercise_name || 'Exercicio',
                        exerciseCategory: set.exercise_category || '',
                        sets: []
                    });
                }

                exercisesByPosition.get(set.position).sets.push({
                    reps: set.reps,
                    weight: Number(set.weight),
                    durationSeconds: Number(set.duration_seconds) || 0,
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
            `SELECT id, user_id, template_id, gym_id, assignment_id, source_type,
                    name, DATE_FORMAT(date, '%Y-%m-%d') AS date, created_at
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
