// populate-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./config/dbConfig');

async function populateDatabase() {
    let connection;
    try {
        const config = getDatabaseConfig(true);

        connection = await mysql.createConnection(config);
        console.log(' Conectado ao banco para popular dados!');

        // Buscar ID do usuário admin
        const [admins] = await connection.query('SELECT id FROM users WHERE email = ?', ['admin@treino.com']);
        if (admins.length === 0) {
            throw new Error('Usuário admin não encontrado');
        }
        const adminId = admins[0].id;
        console.log(` Usando ID do admin: ${adminId}`);

        // Inserir exercícios
        console.log(' Inserindo exercícios...');
        const exercises = [
            ['Supino Reto', 'Peito'],
            ['Supino Inclinado', 'Peito'],
            ['Crucifixo', 'Peito'],
            ['Rosca Direta', 'Braços'],
            ['Rosca Martelo', 'Braços'],
            ['Tríceps Corda', 'Braços'],
            ['Agachamento', 'Pernas'],
            ['Leg Press', 'Pernas'],
            ['Cadeira Extensora', 'Pernas'],
            ['Puxada Frontal', 'Costas'],
            ['Remada Curvada', 'Costas'],
            ['Desenvolvimento', 'Ombros'],
            ['Elevação Lateral', 'Ombros'],
            ['Abdominal', 'Abdômen'],
            ['Prancha', 'Abdomen']
        ];

        for (const [name, category] of exercises) {
            await connection.query(
                'INSERT INTO exercises (user_id, name, category) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
                [adminId, name, category]
            );
        }
        console.log(' Exercícios inseridos!');

        // Buscar IDs dos exercícios inseridos
        const [exerciseRows] = await connection.query('SELECT id, name FROM exercises WHERE user_id = ?', [adminId]);
        const exerciseMap = {};
        exerciseRows.forEach(row => {
            exerciseMap[row.name] = row.id;
        });

        // Inserir templates de treino
        console.log(' Inserindo templates de treino...');
        const templates = [
            'Treino A - Peito e Tríceps',
            'Treino B - Costas e Bíceps',
            'Treino C - Pernas',
            'Treino D - Ombros e Abdômen'
        ];

        const templateIds = [];
        for (const name of templates) {
            const [result] = await connection.query(
                'INSERT INTO workout_templates (user_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id',
                [adminId, name]
            );
            const [inserted] = await connection.query('SELECT id FROM workout_templates WHERE user_id = ? AND name = ?', [adminId, name]);
            templateIds.push(inserted[0].id);
        }
        console.log(' Templates inseridos!');

        // Inserir exercícios nos templates
        console.log(' Vinculando exercícios aos templates...');

        // Template A: Peito e Tríceps
        const templateAExercises = [
            { name: 'Supino Reto', position: 1 },
            { name: 'Supino Inclinado', position: 2 },
            { name: 'Crucifixo', position: 3 },
            { name: 'Tríceps Corda', position: 4 }
        ];

        for (const exercise of templateAExercises) {
            await connection.query(
                'INSERT INTO template_exercises (template_id, exercise_id, position) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
                [templateIds[0], exerciseMap[exercise.name], exercise.position]
            );
        }

        // Template B: Costas e Bíceps
        const templateBExercises = [
            { name: 'Puxada Frontal', position: 1 },
            { name: 'Remada Curvada', position: 2 },
            { name: 'Rosca Direta', position: 3 },
            { name: 'Rosca Martelo', position: 4 }
        ];

        for (const exercise of templateBExercises) {
            await connection.query(
                'INSERT INTO template_exercises (template_id, exercise_id, position) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
                [templateIds[1], exerciseMap[exercise.name], exercise.position]
            );
        }

        // Template C: Pernas
        const templateCExercises = [
            { name: 'Agachamento', position: 1 },
            { name: 'Leg Press', position: 2 },
            { name: 'Cadeira Extensora', position: 3 }
        ];

        for (const exercise of templateCExercises) {
            await connection.query(
                'INSERT INTO template_exercises (template_id, exercise_id, position) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
                [templateIds[2], exerciseMap[exercise.name], exercise.position]
            );
        }

        // Template D: Ombros e Abdômen
        const templateDExercises = [
            { name: 'Desenvolvimento', position: 1 },
            { name: 'Elevação Lateral', position: 2 },
            { name: 'Abdominal', position: 3 },
            { name: 'Prancha', position: 4 }
        ];

        for (const exercise of templateDExercises) {
            await connection.query(
                'INSERT INTO template_exercises (template_id, exercise_id, position) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
                [templateIds[3], exerciseMap[exercise.name], exercise.position]
            );
        }
        console.log(' Exercícios vinculados aos templates!');

        // Inserir rotina semanal
        console.log(' Inserindo rotina semanal...');
        const weeklyRoutines = [
            { day: 0, template: 'Treino A - Peito e Tríceps' }, // Domingo
            { day: 1, template: 'Treino B - Costas e Bíceps' }, // Segunda
            { day: 3, template: 'Treino C - Pernas' }, // Quarta
            { day: 5, template: 'Treino D - Ombros e Abdômen' } // Sexta
        ];

        for (const routine of weeklyRoutines) {
            const templateId = templateIds[templates.indexOf(routine.template)];
            await connection.query(
                'INSERT INTO weekly_routines (user_id, day_of_week, template_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE template_id=VALUES(template_id)',
                [adminId, routine.day, templateId]
            );
        }
        console.log(' Rotina semanal inserida!');

        // Inserir alguns treinos históricos de exemplo
        console.log(' Inserindo treinos históricos de exemplo...');

        // Treino de exemplo - Supino
        const [workoutResult] = await connection.query(
            'INSERT INTO workout_history (user_id, template_id, name, date) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
            [adminId, templateIds[0], 'Treino A - Peito e Tríceps', '2024-01-15']
        );
        const [workoutInserted] = await connection.query('SELECT id FROM workout_history WHERE user_id = ? AND date = ? AND name = ?', [adminId, '2024-01-15', 'Treino A - Peito e Tríceps']);
        const workoutId = workoutInserted[0].id;

        // Sets de exemplo
        const sets = [
            { exercise: 'Supino Reto', position: 1, set: 1, reps: 12, weight: 60.0 },
            { exercise: 'Supino Reto', position: 1, set: 2, reps: 10, weight: 65.0 },
            { exercise: 'Supino Reto', position: 1, set: 3, reps: 8, weight: 70.0 },
            { exercise: 'Supino Inclinado', position: 2, set: 1, reps: 12, weight: 50.0 },
            { exercise: 'Supino Inclinado', position: 2, set: 2, reps: 10, weight: 55.0 },
            { exercise: 'Crucifixo', position: 3, set: 1, reps: 15, weight: 25.0 },
            { exercise: 'Crucifixo', position: 3, set: 2, reps: 12, weight: 30.0 },
            { exercise: 'Tríceps Corda', position: 4, set: 1, reps: 12, weight: 40.0 },
            { exercise: 'Tríceps Corda', position: 4, set: 2, reps: 10, weight: 45.0 }
        ];

        for (const set of sets) {
            await connection.query(
                'INSERT INTO workout_sets (workout_id, exercise_id, position, set_number, reps, weight, completed) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id',
                [workoutId, exerciseMap[set.exercise], set.position, set.set, set.reps, set.weight, true]
            );
        }
        console.log(' Treino histórico inserido!');

        console.log('\n Banco de dados populado com sucesso!');
        console.log(' Dados inseridos para o usuário admin@treino.com:');
        console.log(`   - ${exercises.length} exercícios`);
        console.log(`   - ${templates.length} templates de treino`);
        console.log('   - Rotina semanal configurada');
        console.log('   - 1 treino histórico com sets');

    } catch (error) {
        console.error(' Erro ao popular banco:', error.message);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

populateDatabase();
