// test-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        
        console.log(' Conectado ao MySQL local!');
        
        const [rows] = await connection.execute('SELECT VERSION() as version');
        console.log('Versão:', rows[0].version);
        
        await connection.end();
    } catch (error) {
        console.error(' Erro de conexão:', error.message);
    }
}

testConnection();