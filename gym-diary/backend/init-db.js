// init-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { seedDefaultExercises } = require('./utils/defaultExercises');
const { ensureUserProfiles } = require('./utils/profiles');

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'senac',
    // Removido o SSL para MySQL local
    // ssl: { rejectUnauthorized: true }
};

async function initDatabase() {
    let connection;
    try {
        console.log(' Conectando ao MySQL local...');
        connection = await mysql.createConnection(config);
        console.log(' Conectado!');

        // Criar banco se não existir
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log(` Usando banco: ${process.env.DB_NAME}`);

        // Criar tabelas
        console.log(' Criando tabelas...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                profile_type ENUM('student', 'personal', 'gym', 'admin') NOT NULL,
                status ENUM('active', 'pending', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_profile (user_id, profile_type)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS gyms (
                id INT PRIMARY KEY AUTO_INCREMENT,
                owner_user_id INT NOT NULL,
                name VARCHAR(140) NOT NULL,
                phone VARCHAR(40) DEFAULT '',
                email VARCHAR(120) DEFAULT '',
                address VARCHAR(255) DEFAULT '',
                responsible VARCHAR(120) DEFAULT '',
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_gym_owner (owner_user_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS gym_memberships (
                id INT PRIMARY KEY AUTO_INCREMENT,
                gym_id INT NOT NULL,
                user_id INT,
                invited_email VARCHAR(120) NOT NULL,
                role ENUM('student', 'personal') NOT NULL,
                status ENUM('active', 'pending', 'removed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY unique_gym_user_role (gym_id, user_id, role),
                UNIQUE KEY unique_gym_email_role (gym_id, invited_email, role)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS exercises (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                gif_url VARCHAR(500) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_exercise (user_id, name)
            )
        `);

        const [exerciseColumns] = await connection.query("SHOW COLUMNS FROM exercises LIKE 'gif_url'");
        if (exerciseColumns.length === 0) {
            await connection.query("ALTER TABLE exercises ADD COLUMN gif_url VARCHAR(500) DEFAULT '' AFTER category");
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS workout_templates (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS template_exercises (
                id INT PRIMARY KEY AUTO_INCREMENT,
                template_id INT NOT NULL,
                exercise_id INT NOT NULL,
                position INT NOT NULL,
                default_sets INT DEFAULT 3,
                FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
                UNIQUE KEY unique_template_position (template_id, position)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS weekly_routines (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                day_of_week INT CHECK (day_of_week BETWEEN 0 AND 6),
                template_id INT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
                UNIQUE KEY unique_user_day (user_id, day_of_week)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS workout_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                template_id INT,
                name VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS workout_sets (
                id INT PRIMARY KEY AUTO_INCREMENT,
                workout_id INT NOT NULL,
                exercise_id INT NOT NULL,
                position INT NOT NULL,
                set_number INT NOT NULL,
                reps INT NOT NULL,
                weight DECIMAL(5,2) NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                notes TEXT,
                FOREIGN KEY (workout_id) REFERENCES workout_history(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )
        `);

        console.log(' Todas as tabelas criadas com sucesso!');

        // Verificar se já existe admin
        const [admins] = await connection.query('SELECT * FROM users WHERE email = ?', ['admin@treino.com']);
        
        if (admins.length === 0) {
            // Gerar hash da senha admin123 com bcrypt
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            
            await connection.query(
                'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
                ['Admin', 'admin@treino.com', hashedPassword, true]
            );
            console.log(' Usuário admin criado! (email: admin@treino.com, senha: admin123)');
        } else {
            console.log(' Usuário admin já existe');
        }

        const [users] = await connection.query('SELECT id FROM users');
        for (const user of users) {
            await seedDefaultExercises(connection.query.bind(connection), user.id);
        }
        console.log(' Exercícios padrão garantidos para todos os usuários');

        const [profileUsers] = await connection.query('SELECT id, is_admin FROM users');
        for (const user of profileUsers) {
            await ensureUserProfiles(connection.query.bind(connection), user.id, Boolean(user.is_admin));
        }
        console.log(' Perfis de usuário garantidos');

        console.log('\n Banco de dados inicializado com sucesso!');
        console.log(' Detalhes da conexão:');
        console.log(`   Host: ${config.host}:${config.port}`);
        console.log(`   Banco: ${process.env.DB_NAME}`);
        console.log(`   Usuário: ${config.user}`);

    } catch (error) {
        console.error(' Erro ao inicializar banco:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   Verifique se o usuário e senha estão corretos');
            console.error('   Padrão MySQL: usuário "root", senha vazia ou a que você configurou');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('   Conexão recusada. Verifique se o MySQL está rodando:');
            console.error('   - Linux: sudo systemctl status mysql');
            console.error('   - Mac: brew services list | grep mysql');
            console.error('   - Windows: Verifique no Services.msc');
        }
        throw error; // Lançar erro em vez de process.exit para permitir tratamento no server.js
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = initDatabase;
