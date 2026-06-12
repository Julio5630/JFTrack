// init-db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('./config/dbConfig');
const { seedDefaultExercisesForAllUsers } = require('./utils/defaultExercises');

const questionnaireLabels = {
    fullName: 'Nome completo',
    birthDate: 'Data de nascimento',
    phone: 'Telefone / WhatsApp',
    email: 'E-mail',
    mainGoal: 'Objetivo principal',
    heartProblem: 'Algum medico ja disse que possui problema no coracao?',
    chestPain: 'Sente dor no peito ao praticar atividade fisica?',
    dizziness: 'Ja teve tontura ou perda de consciencia?',
    highBloodPressure: 'Possui pressao alta?',
    diabetes: 'Possui diabetes?',
    highCholesterol: 'Possui colesterol alto?',
    continuousMedication: 'Usa medicamento continuo?',
    medicationName: 'Qual medicamento?',
    recentSurgery: 'Fez cirurgia nos ultimos 2 anos?',
    injuries: 'Possui lesoes?',
    jointPain: 'Possui dores articulares?',
    trainedBefore: 'Ja treinou em academia?',
    trainingTime: 'Ha quanto tempo?',
    currentLevel: 'Nivel atual',
    hadPersonal: 'Ja teve acompanhamento com personal?',
    likedExercises: 'Exercicios que gosta',
    dislikedExercises: 'Exercicios que nao gosta',
    smokes: 'Fuma?',
    sleepHours: 'Horas de sono por noite',
    stressLevel: 'Nivel de estresse',
    workRoutine: 'Rotina de trabalho',
    nutrition: 'Alimentacao',
    availableDays: 'Dias disponiveis para treino',
    idealTime: 'Horario ideal para treinar',
    daysPerWeek: 'Quantos dias por semana pretende treinar?',
    sessionDuration: 'Tempo disponivel por treino'
};

const riskQuestionKeys = new Set([
    'heartProblem',
    'chestPain',
    'dizziness',
    'highBloodPressure',
    'diabetes',
    'highCholesterol',
    'continuousMedication',
    'recentSurgery',
    'injuries',
    'jointPain'
]);

const measurementLabels = {
    weight: { label: 'Peso', unit: 'kg' },
    height: { label: 'Altura', unit: 'cm' },
    bmi: { label: 'IMC calculado', unit: 'kg/m2' },
    abdominalCircumference: { label: 'Circunferencia abdominal', unit: 'cm' },
    chestCircumference: { label: 'Circunferencia toracica', unit: 'cm' },
    rightArm: { label: 'Braco direito', unit: 'cm' },
    leftArm: { label: 'Braco esquerdo', unit: 'cm' },
    rightThigh: { label: 'Coxa direita', unit: 'cm' },
    leftThigh: { label: 'Coxa esquerda', unit: 'cm' },
    hip: { label: 'Quadril', unit: 'cm' },
    bodyFat: { label: 'Percentual de gordura', unit: '%' },
    generalObservations: { label: 'Observacoes gerais', unit: '' }
};

const parseJsonField = (value, fallback = {}) => {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

const serializeAnswer = (value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
    return String(value);
};

const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
};

const config = getDatabaseConfig(false);

async function initDatabase() {
    let connection;
    const startedAt = Date.now();
    try {
        console.log(' Conectando ao MySQL...');
        connection = await mysql.createConnection(config);
        console.log(' Conectado!');

        // Criar banco se não existir
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);
        console.log(` Usando banco: ${process.env.DB_NAME}`);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS app_migrations (
                name VARCHAR(120) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Criar tabelas
        console.log(' Criando tabelas...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(30) DEFAULT '',
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
                video_url VARCHAR(500) DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_exercise (user_id, name)
            )
        `);

        const [exerciseVideoColumns] = await connection.query("SHOW COLUMNS FROM exercises LIKE 'video_url'");
        if (exerciseVideoColumns.length === 0) {
            await connection.query("ALTER TABLE exercises ADD COLUMN video_url VARCHAR(500) DEFAULT '' AFTER category");
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS workout_templates (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                frequency VARCHAR(80) DEFAULT '',
                split_type VARCHAR(80) DEFAULT '',
                notes TEXT,
                created_by_profile ENUM('student', 'personal', 'gym', 'admin') DEFAULT 'student',
                assigned_student_user_id INT,
                gym_id INT,
                status ENUM('active', 'inactive') DEFAULT 'active',
                editable_by_student BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_student_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
            )
        `);

        const [userPhoneColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'phone'");
        if (userPhoneColumns.length === 0) {
            await connection.query("ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT '' AFTER password");
        }

        const [templateFrequencyColumns] = await connection.query("SHOW COLUMNS FROM workout_templates LIKE 'frequency'");
        if (templateFrequencyColumns.length === 0) {
            await connection.query("ALTER TABLE workout_templates ADD COLUMN frequency VARCHAR(80) DEFAULT '' AFTER name");
        }

        const [templateSplitColumns] = await connection.query("SHOW COLUMNS FROM workout_templates LIKE 'split_type'");
        if (templateSplitColumns.length === 0) {
            await connection.query("ALTER TABLE workout_templates ADD COLUMN split_type VARCHAR(80) DEFAULT '' AFTER frequency");
        }

        const [templateNotesColumns] = await connection.query("SHOW COLUMNS FROM workout_templates LIKE 'notes'");
        if (templateNotesColumns.length === 0) {
            await connection.query("ALTER TABLE workout_templates ADD COLUMN notes TEXT AFTER split_type");
        }

        const templateMetadataColumns = [
            ['created_by_profile', "ENUM('student', 'personal', 'gym', 'admin') DEFAULT 'student' AFTER notes"],
            ['assigned_student_user_id', 'INT AFTER created_by_profile'],
            ['gym_id', 'INT AFTER assigned_student_user_id'],
            ['status', "ENUM('active', 'inactive') DEFAULT 'active' AFTER gym_id"],
            ['editable_by_student', 'BOOLEAN DEFAULT TRUE AFTER status']
        ];

        for (const [column, definition] of templateMetadataColumns) {
            const [columns] = await connection.query(`SHOW COLUMNS FROM workout_templates LIKE '${column}'`);
            if (columns.length === 0) {
                await connection.query(`ALTER TABLE workout_templates ADD COLUMN ${column} ${definition}`);
            }
        }

        await connection.query(`
            UPDATE workout_templates
            SET created_by_profile = 'student'
            WHERE created_by_profile IS NULL
        `);

        await connection.query(`
            UPDATE workout_templates
            SET status = 'active'
            WHERE status IS NULL
        `);

        await connection.query(`
            UPDATE workout_templates
            SET editable_by_student = TRUE
            WHERE editable_by_student IS NULL
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS template_exercises (
                id INT PRIMARY KEY AUTO_INCREMENT,
                template_id INT NOT NULL,
                exercise_id INT NOT NULL,
                position INT NOT NULL,
                default_sets INT DEFAULT 3,
                default_reps VARCHAR(40) DEFAULT '8-12',
                duration_minutes INT DEFAULT NULL,
                FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
                UNIQUE KEY unique_template_position (template_id, position)
            )
        `);

        const [templateExerciseRepColumns] = await connection.query("SHOW COLUMNS FROM template_exercises LIKE 'default_reps'");
        if (templateExerciseRepColumns.length === 0) {
            await connection.query("ALTER TABLE template_exercises ADD COLUMN default_reps VARCHAR(40) DEFAULT '8-12' AFTER default_sets");
        }

        const [templateExerciseDurationColumns] = await connection.query("SHOW COLUMNS FROM template_exercises LIKE 'duration_minutes'");
        if (templateExerciseDurationColumns.length === 0) {
            await connection.query("ALTER TABLE template_exercises ADD COLUMN duration_minutes INT DEFAULT NULL AFTER default_reps");
        }

        await connection.query(`
            UPDATE template_exercises te
            JOIN exercises e ON e.id = te.exercise_id
            SET te.duration_minutes = COALESCE(te.duration_minutes, 20),
                te.default_sets = 1,
                te.default_reps = '0'
            WHERE e.category = 'Cardio'
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
                gym_id INT,
                assignment_id INT,
                source_type ENUM('own', 'academy') DEFAULT 'own',
                name VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL,
                FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
            )
        `);

        const historyScopeColumns = [
            ['gym_id', 'INT AFTER template_id'],
            ['assignment_id', 'INT AFTER gym_id'],
            ['source_type', "ENUM('own', 'academy') DEFAULT 'own' AFTER assignment_id"]
        ];

        for (const [column, definition] of historyScopeColumns) {
            const [columns] = await connection.query(`SHOW COLUMNS FROM workout_history LIKE '${column}'`);
            if (columns.length === 0) {
                await connection.query(`ALTER TABLE workout_history ADD COLUMN ${column} ${definition}`);
            }
        }

        await connection.query(`
            UPDATE workout_history
            SET source_type = 'own'
            WHERE source_type IS NULL
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
                duration_seconds INT DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                notes TEXT,
                FOREIGN KEY (workout_id) REFERENCES workout_history(id) ON DELETE CASCADE,
                FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
            )
        `);

        const [workoutSetDurationColumns] = await connection.query("SHOW COLUMNS FROM workout_sets LIKE 'duration_seconds'");
        if (workoutSetDurationColumns.length === 0) {
            await connection.query("ALTER TABLE workout_sets ADD COLUMN duration_seconds INT DEFAULT 0 AFTER weight");
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS personal_workout_assignments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                personal_user_id INT NOT NULL,
                student_user_id INT NOT NULL,
                gym_id INT,
                template_id INT NOT NULL,
                status ENUM('active', 'inactive') DEFAULT 'active',
                editable_by_student BOOLEAN DEFAULT FALSE,
                notes TEXT,
                display_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (personal_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL,
                FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
                UNIQUE KEY unique_active_assignment (personal_user_id, student_user_id, template_id)
            )
        `);

        const assignmentColumns = [
            ['gym_id', 'INT AFTER student_user_id'],
            ['editable_by_student', 'BOOLEAN DEFAULT FALSE AFTER status'],
            ['display_order', 'INT DEFAULT 0 AFTER notes']
        ];

        for (const [column, definition] of assignmentColumns) {
            const [columns] = await connection.query(`SHOW COLUMNS FROM personal_workout_assignments LIKE '${column}'`);
            if (columns.length === 0) {
                await connection.query(`ALTER TABLE personal_workout_assignments ADD COLUMN ${column} ${definition}`);
            }
        }

        await connection.query(`
            UPDATE personal_workout_assignments
            SET display_order = id
            WHERE display_order = 0
        `);

        await connection.query(`
            UPDATE personal_workout_assignments
            SET editable_by_student = FALSE
            WHERE editable_by_student IS NULL
        `);

        await connection.query(`
            UPDATE personal_workout_assignments pwa
            JOIN gym_memberships pm
              ON pm.user_id = pwa.personal_user_id AND pm.role = 'personal' AND pm.status = 'active'
            JOIN gym_memberships sm
              ON sm.gym_id = pm.gym_id AND sm.user_id = pwa.student_user_id AND sm.role = 'student' AND sm.status = 'active'
            SET pwa.gym_id = pm.gym_id
            WHERE pwa.gym_id IS NULL
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS personal_student_links (
                id INT PRIMARY KEY AUTO_INCREMENT,
                personal_user_id INT NOT NULL,
                student_user_id INT NOT NULL,
                gym_id INT,
                status ENUM('active', 'inactive', 'removed') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (personal_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL,
                UNIQUE KEY unique_personal_student_gym (personal_user_id, student_user_id, gym_id)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS physical_assessments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                personal_user_id INT NOT NULL,
                student_user_id INT NOT NULL,
                gym_id INT,
                assessment_date DATE NOT NULL,
                weight DECIMAL(5,2),
                height DECIMAL(5,2),
                body_fat DECIMAL(5,2),
                goal VARCHAR(255) DEFAULT '',
                questionnaire TEXT,
                workout_suggestion TEXT,
                personal_data TEXT,
                medical_history TEXT,
                activity_history TEXT,
                lifestyle TEXT,
                availability TEXT,
                measurements TEXT,
                bmi DECIMAL(5,2),
                medical_alert BOOLEAN DEFAULT FALSE,
                medical_alert_message VARCHAR(255) DEFAULT '',
                status ENUM('draft', 'completed') DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (personal_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS student_body_metrics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                recorded_date DATE NOT NULL,
                relaxed_biceps DECIMAL(6,2),
                contracted_biceps DECIMAL(6,2),
                forearm DECIMAL(6,2),
                chest DECIMAL(6,2),
                shoulders DECIMAL(6,2),
                waist DECIMAL(6,2),
                abdomen DECIMAL(6,2),
                hip DECIMAL(6,2),
                upper_thigh DECIMAL(6,2),
                middle_thigh DECIMAL(6,2),
                lower_thigh DECIMAL(6,2),
                calf DECIMAL(6,2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_student_body_metrics_user_date (user_id, recorded_date)
            )
        `);

        const bodyMetricColumns = [
            ['relaxed_biceps', 'DECIMAL(6,2)'],
            ['contracted_biceps', 'DECIMAL(6,2)'],
            ['forearm', 'DECIMAL(6,2)'],
            ['shoulders', 'DECIMAL(6,2)'],
            ['upper_thigh', 'DECIMAL(6,2)'],
            ['middle_thigh', 'DECIMAL(6,2)'],
            ['lower_thigh', 'DECIMAL(6,2)'],
            ['calf', 'DECIMAL(6,2)']
        ];

        for (const [column, definition] of bodyMetricColumns) {
            const [columns] = await connection.query(`SHOW COLUMNS FROM student_body_metrics LIKE '${column}'`);
            if (columns.length === 0) {
                await connection.query(`ALTER TABLE student_body_metrics ADD COLUMN ${column} ${definition}`);
            }
        }

        const assessmentColumns = [
            ['gym_id', 'INT AFTER student_user_id'],
            ['personal_data', 'TEXT AFTER workout_suggestion'],
            ['medical_history', 'TEXT AFTER personal_data'],
            ['activity_history', 'TEXT AFTER medical_history'],
            ['lifestyle', 'TEXT AFTER activity_history'],
            ['availability', 'TEXT AFTER lifestyle'],
            ['measurements', 'TEXT AFTER availability'],
            ['bmi', 'DECIMAL(5,2) AFTER measurements'],
            ['medical_alert', 'BOOLEAN DEFAULT FALSE AFTER bmi'],
            ['medical_alert_message', "VARCHAR(255) DEFAULT '' AFTER medical_alert"]
        ];

        for (const [column, definition] of assessmentColumns) {
            const [columns] = await connection.query(`SHOW COLUMNS FROM physical_assessments LIKE '${column}'`);
            if (columns.length === 0) {
                await connection.query(`ALTER TABLE physical_assessments ADD COLUMN ${column} ${definition}`);
            }
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS assessment_questionnaire_responses (
                id INT PRIMARY KEY AUTO_INCREMENT,
                assessment_id INT NOT NULL,
                section VARCHAR(80) NOT NULL,
                question_key VARCHAR(100) NOT NULL,
                question_label VARCHAR(255) DEFAULT '',
                answer TEXT,
                risk_flag BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (assessment_id) REFERENCES physical_assessments(id) ON DELETE CASCADE,
                UNIQUE KEY unique_assessment_question (assessment_id, section, question_key)
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS physical_measurements (
                id INT PRIMARY KEY AUTO_INCREMENT,
                assessment_id INT NOT NULL,
                measurement_key VARCHAR(100) NOT NULL,
                label VARCHAR(120) DEFAULT '',
                value DECIMAL(8,2),
                unit VARCHAR(20) DEFAULT '',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (assessment_id) REFERENCES physical_assessments(id) ON DELETE CASCADE,
                UNIQUE KEY unique_assessment_measurement (assessment_id, measurement_key)
            )
        `);

        await connection.query(`
            INSERT INTO personal_student_links (personal_user_id, student_user_id, gym_id, status)
            SELECT DISTINCT pm.user_id, sm.user_id, pm.gym_id, 'active'
            FROM gym_memberships pm
            JOIN gym_memberships sm ON sm.gym_id = pm.gym_id
            WHERE pm.role = 'personal' AND pm.status = 'active' AND pm.user_id IS NOT NULL
              AND sm.role = 'student' AND sm.status = 'active' AND sm.user_id IS NOT NULL
            ON DUPLICATE KEY UPDATE status = 'active', updated_at = CURRENT_TIMESTAMP
        `);

        const [assessmentMigration] = await connection.query(
            'SELECT name FROM app_migrations WHERE name = ?',
            ['normalize-legacy-assessments-v1']
        );

        if (assessmentMigration.length === 0) {
        const [existingAssessments] = await connection.query(`
            SELECT id, questionnaire, personal_data, medical_history, activity_history, lifestyle, availability,
                   measurements, weight, height, body_fat, bmi
            FROM physical_assessments
        `);

        for (const assessment of existingAssessments) {
            const legacyQuestionnaire = parseJsonField(assessment.questionnaire);
            const sections = {
                personalData: parseJsonField(assessment.personal_data, legacyQuestionnaire.personalData || {}),
                medicalHistory: parseJsonField(assessment.medical_history, legacyQuestionnaire.medicalHistory || {}),
                activityHistory: parseJsonField(assessment.activity_history, legacyQuestionnaire.activityHistory || {}),
                lifestyle: parseJsonField(assessment.lifestyle, legacyQuestionnaire.lifestyle || {}),
                availability: parseJsonField(assessment.availability, legacyQuestionnaire.availability || {})
            };

            for (const [section, answers] of Object.entries(sections)) {
                for (const [questionKey, answer] of Object.entries(answers || {})) {
                    await connection.query(
                        `INSERT INTO assessment_questionnaire_responses
                         (assessment_id, section, question_key, question_label, answer, risk_flag)
                         VALUES (?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE
                            question_label = VALUES(question_label),
                            answer = VALUES(answer),
                            risk_flag = VALUES(risk_flag),
                            updated_at = CURRENT_TIMESTAMP`,
                        [
                            assessment.id,
                            section,
                            questionKey,
                            questionnaireLabels[questionKey] || questionKey,
                            serializeAnswer(answer),
                            section === 'medicalHistory' && riskQuestionKeys.has(questionKey) && Boolean(answer)
                        ]
                    );
                }
            }

            const measurements = {
                ...parseJsonField(assessment.measurements, legacyQuestionnaire.measurements || {}),
                weight: assessment.weight ?? parseJsonField(assessment.measurements).weight,
                height: assessment.height ?? parseJsonField(assessment.measurements).height,
                bodyFat: assessment.body_fat ?? parseJsonField(assessment.measurements).bodyFat,
                bmi: assessment.bmi ?? parseJsonField(assessment.measurements).bmi
            };

            for (const [measurementKey, metadata] of Object.entries(measurementLabels)) {
                const rawValue = measurements[measurementKey];
                const numericValue = toNumberOrNull(rawValue);
                const notes = measurementKey === 'generalObservations' ? String(rawValue || '').trim() : '';

                if (numericValue === null && !notes) continue;

                await connection.query(
                    `INSERT INTO physical_measurements
                     (assessment_id, measurement_key, label, value, unit, notes)
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        label = VALUES(label),
                        value = VALUES(value),
                        unit = VALUES(unit),
                        notes = VALUES(notes),
                        updated_at = CURRENT_TIMESTAMP`,
                    [
                        assessment.id,
                        measurementKey,
                        metadata.label,
                        numericValue,
                        metadata.unit,
                        notes
                    ]
                );
            }
        }

        await connection.query(
            'INSERT INTO app_migrations (name) VALUES (?)',
            ['normalize-legacy-assessments-v1']
        );
        }

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

        await seedDefaultExercisesForAllUsers(connection.query.bind(connection));
        console.log(' Exercícios padrão garantidos para todos os usuários');

        await connection.query(`
            INSERT INTO user_profiles (user_id, profile_type, status)
            SELECT u.id, 'student', 'active'
            FROM users u
            WHERE u.is_admin = TRUE
               OR NOT EXISTS (SELECT 1 FROM gyms g WHERE g.owner_user_id = u.id)
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `);
        await connection.query(`
            INSERT INTO user_profiles (user_id, profile_type, status)
            SELECT id, 'admin', 'active' FROM users WHERE is_admin = TRUE
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `);
        await connection.query(`
            INSERT INTO user_profiles (user_id, profile_type, status)
            SELECT DISTINCT u.id, 'gym', 'active'
            FROM users u
            JOIN gyms g ON g.owner_user_id = u.id
            WHERE u.is_admin = FALSE
            ON DUPLICATE KEY UPDATE status = VALUES(status)
        `);
        console.log(' Perfis de usuário garantidos');

        console.log('\n Banco de dados inicializado com sucesso!');
        console.log(` Inicializacao concluida em ${((Date.now() - startedAt) / 1000).toFixed(2)}s`);
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
