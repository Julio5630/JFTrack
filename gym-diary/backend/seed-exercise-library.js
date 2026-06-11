require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./config/dbConfig');
const { defaultExercises, seedDefaultExercises } = require('./utils/defaultExercises');

const seedExerciseLibrary = async () => {
    const connection = await mysql.createConnection(getDatabaseConfig(true));

    try {
        const [users] = await connection.query('SELECT id FROM users');

        for (const user of users) {
            await seedDefaultExercises(connection.query.bind(connection), user.id);
        }

        console.log(`Biblioteca sincronizada: ${defaultExercises.length} exercicios para ${users.length} usuarios.`);
    } finally {
        await connection.end();
    }
};

seedExerciseLibrary().catch((error) => {
    console.error('Erro ao sincronizar biblioteca de exercicios:', error.message);
    process.exitCode = 1;
});
