// test-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./config/dbConfig');

async function testConnection() {
    try {
        const connection = await mysql.createConnection(getDatabaseConfig(true));
        
        console.log(' Conectado ao MySQL!');
        
        const [rows] = await connection.execute('SELECT VERSION() as version');
        console.log('Versão:', rows[0].version);
        
        await connection.end();
    } catch (error) {
        console.error(' Erro de conexão:', error.message);
    }
}

testConnection();
