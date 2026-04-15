require('dotenv').config();
const app = require('./app');
const initDatabase = require('./init-db');

const PORT = process.env.PORT || 3000;

// Inicializar banco de dados antes de iniciar o servidor
(async () => {
    try {
        await initDatabase();
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(` API disponível em http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error);
        process.exit(1);
    }
})();