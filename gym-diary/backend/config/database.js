// backend/config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('📡 Conectando ao MySQL local...');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
    // Removido SSL para MySQL local
});

// Testar conexão ao iniciar
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado ao MySQL local com sucesso!');
        connection.release();
    } catch (error) {
        console.error('❌ Erro ao conectar ao MySQL local:', error.message);
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