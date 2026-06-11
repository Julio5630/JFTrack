require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./config/dbConfig');
const { defaultExercises, seedDefaultExercisesForAllUsers } = require('./utils/defaultExercises');

const seedExerciseLibrary = async () => {
    const connection = await mysql.createConnection(getDatabaseConfig(true));

    try {
        const [[{ totalUsers }]] = await connection.query('SELECT COUNT(*) AS totalUsers FROM users');
        await seedDefaultExercisesForAllUsers(connection.query.bind(connection));

        console.log(`Biblioteca sincronizada: ${defaultExercises.length} exercicios para ${totalUsers} usuarios.`);
    } finally {
        await connection.end();
    }
};

seedExerciseLibrary().catch((error) => {
    console.error('Erro ao sincronizar biblioteca de exercicios:', error.message);
    process.exitCode = 1;
});
