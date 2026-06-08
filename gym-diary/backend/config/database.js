// backend/config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();
const { getDatabaseConfig } = require('./dbConfig');

console.log(' Conectando ao MySQL...');

const pool = mysql.createPool({
    ...getDatabaseConfig(true),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Testar conexão ao iniciar
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(' Conectado ao MySQL com sucesso!');
        connection.release();
    } catch (error) {
        console.error(' Erro ao conectar ao MySQL:', error.message);
    }
})();

const query = async (sql, params = []) => {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Erro na query:', error);
        throw error;
    }
};

module.exports = { pool, query };
