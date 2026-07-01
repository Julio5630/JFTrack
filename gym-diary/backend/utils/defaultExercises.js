const defaultExercises = [
    // Peito
    { name: 'Supino Reto', category: 'Peito' },
    { name: 'Supino Reto com Halteres', category: 'Peito' },
    { name: 'Supino Inclinado', category: 'Peito' },
    { name: 'Supino Inclinado com Halteres', category: 'Peito' },
    { name: 'Supino Declinado', category: 'Peito' },
    { name: 'Supino na Maquina', category: 'Peito' },
    { name: 'Crucifixo', category: 'Peito' },
    { name: 'Crucifixo Inclinado', category: 'Peito' },
    { name: 'Crucifixo na Maquina', category: 'Peito' },
    { name: 'Crossover Alto', category: 'Peito' },
    { name: 'Crossover Medio', category: 'Peito' },
    { name: 'Crossover Baixo', category: 'Peito' },
    { name: 'Flexao de Braco', category: 'Peito' },
    { name: 'Flexao Inclinada', category: 'Peito' },
    { name: 'Flexao Declinada', category: 'Peito' },
    { name: 'Paralelas para Peito', category: 'Peito' },

    // Costas
    { name: 'Puxada Frontal', category: 'Costas' },
    { name: 'Puxada Frontal Pegada Fechada', category: 'Costas' },
    { name: 'Puxada Frontal Pegada Supinada', category: 'Costas' },
    { name: 'Puxada Unilateral no Cabo', category: 'Costas' },
    { name: 'Remada Curvada', category: 'Costas' },
    { name: 'Remada Curvada Supinada', category: 'Costas' },
    { name: 'Remada Baixa', category: 'Costas' },
    { name: 'Remada Baixa Unilateral', category: 'Costas' },
    { name: 'Remada Cavalinho', category: 'Costas' },
    { name: 'Remada Serrote', category: 'Costas' },
    { name: 'Remada na Maquina', category: 'Costas' },
    { name: 'Remada Articulada', category: 'Costas' },
    { name: 'Barra Fixa', category: 'Costas' },
    { name: 'Barra Fixa Supinada', category: 'Costas' },
    { name: 'Pullover com Halter', category: 'Costas' },
    { name: 'Pullover no Cabo', category: 'Costas' },
    { name: 'Levantamento Terra', category: 'Costas' },
    { name: 'Hiperextensao Lombar', category: 'Costas' },

    // Pernas
    { name: 'Agachamento', category: 'Perna' },
    { name: 'Agachamento Livre', category: 'Perna' },
    { name: 'Agachamento Frontal', category: 'Perna' },
    { name: 'Agachamento Goblet', category: 'Perna' },
    { name: 'Agachamento Sumo', category: 'Perna' },
    { name: 'Agachamento no Smith', category: 'Perna' },
    { name: 'Agachamento Hack', category: 'Perna' },
    { name: 'Leg Press', category: 'Perna' },
    { name: 'Leg Press Horizontal', category: 'Perna' },
    { name: 'Leg Press Unilateral', category: 'Perna' },
    { name: 'Cadeira Extensora', category: 'Perna' },
    { name: 'Cadeira Extensora Unilateral', category: 'Perna' },
    { name: 'Mesa Flexora', category: 'Perna' },
    { name: 'Cadeira Flexora', category: 'Perna' },
    { name: 'Flexora em Pe', category: 'Perna' },
    { name: 'Stiff com Barra', category: 'Perna' },
    { name: 'Stiff com Halteres', category: 'Perna' },
    { name: 'Levantamento Terra Romeno', category: 'Perna' },
    { name: 'Avanco', category: 'Perna' },
    { name: 'Passada Caminhando', category: 'Perna' },
    { name: 'Afundo Estatico', category: 'Perna' },
    { name: 'Agachamento Bulgaro', category: 'Perna' },
    { name: 'Step-up no Banco', category: 'Perna' },
    { name: 'Cadeira Adutora', category: 'Perna' },
    { name: 'Agachamento Sissy', category: 'Perna' },
    { name: 'Nordic Hamstring Curl', category: 'Perna' },

    // Gluteos
    { name: 'Elevacao Pelvica', category: 'Gluteos' },
    { name: 'Elevacao Pelvica Unilateral', category: 'Gluteos' },
    { name: 'Ponte de Gluteos', category: 'Gluteos' },
    { name: 'Coice no Cabo', category: 'Gluteos' },
    { name: 'Coice na Maquina', category: 'Gluteos' },
    { name: 'Cadeira Abdutora', category: 'Gluteos' },
    { name: 'Abducao de Quadril no Cabo', category: 'Gluteos' },
    { name: 'Abducao de Quadril com Mini Band', category: 'Gluteos' },
    { name: 'Extensao de Quadril no Cabo', category: 'Gluteos' },
    { name: 'Pull Through no Cabo', category: 'Gluteos' },

    // Panturrilhas
    { name: 'Panturrilha em Pe', category: 'Panturrilha' },
    { name: 'Panturrilha Sentado', category: 'Panturrilha' },
    { name: 'Panturrilha no Leg Press', category: 'Panturrilha' },
    { name: 'Panturrilha no Smith', category: 'Panturrilha' },
    { name: 'Panturrilha Unilateral', category: 'Panturrilha' },
    { name: 'Elevacao do Tibial Anterior', category: 'Panturrilha' },

    // Ombros
    { name: 'Desenvolvimento', category: 'Ombro' },
    { name: 'Desenvolvimento com Barra', category: 'Ombro' },
    { name: 'Desenvolvimento com Halteres', category: 'Ombro' },
    { name: 'Desenvolvimento na Maquina', category: 'Ombro' },
    { name: 'Desenvolvimento Arnold', category: 'Ombro' },
    { name: 'Elevacao Lateral', category: 'Ombro' },
    { name: 'Elevacao Lateral no Cabo', category: 'Ombro' },
    { name: 'Elevacao Lateral na Maquina', category: 'Ombro' },
    { name: 'Elevacao Frontal', category: 'Ombro' },
    { name: 'Crucifixo Inverso', category: 'Ombro' },
    { name: 'Crucifixo Inverso na Maquina', category: 'Ombro' },
    { name: 'Face Pull', category: 'Ombro' },
    { name: 'Remada Alta', category: 'Ombro' },
    { name: 'Encolhimento com Barra', category: 'Ombro' },
    { name: 'Encolhimento com Halteres', category: 'Ombro' },
    { name: 'Rotacao Externa no Cabo', category: 'Ombro' },
    { name: 'Rotacao Interna no Cabo', category: 'Ombro' },

    // Biceps
    { name: 'Rosca Direta', category: 'Biceps' },
    { name: 'Rosca Direta na Barra W', category: 'Biceps' },
    { name: 'Rosca Alternada', category: 'Biceps' },
    { name: 'Rosca Martelo', category: 'Biceps' },
    { name: 'Rosca Scott', category: 'Biceps' },
    { name: 'Rosca Scott na Maquina', category: 'Biceps' },
    { name: 'Rosca Concentrada', category: 'Biceps' },
    { name: 'Rosca Inclinada', category: 'Biceps' },
    { name: 'Rosca no Cabo', category: 'Biceps' },
    { name: 'Rosca Bayesiana', category: 'Biceps' },
    { name: 'Rosca Spider', category: 'Biceps' },
    { name: 'Rosca Inversa', category: 'Biceps' },

    // Triceps
    { name: 'Triceps Corda', category: 'Triceps' },
    { name: 'Triceps Barra', category: 'Triceps' },
    { name: 'Triceps Testa', category: 'Triceps' },
    { name: 'Triceps Frances', category: 'Triceps' },
    { name: 'Triceps Coice', category: 'Triceps' },
    { name: 'Triceps Unilateral no Cabo', category: 'Triceps' },
    { name: 'Triceps Acima da Cabeca no Cabo', category: 'Triceps' },
    { name: 'Supino Fechado', category: 'Triceps' },
    { name: 'Mergulho no Banco', category: 'Triceps' },
    { name: 'Paralelas para Triceps', category: 'Triceps' },

    // Antebracos
    { name: 'Rosca de Punho', category: 'Antebraco' },
    { name: 'Rosca de Punho Inversa', category: 'Antebraco' },
    { name: 'Flexao de Punho com Halter', category: 'Antebraco' },
    { name: 'Caminhada do Fazendeiro', category: 'Antebraco' },
    { name: 'Sustentacao na Barra Fixa', category: 'Antebraco' },

    // Abdomen
    { name: 'Abdominal', category: 'Abdomen' },
    { name: 'Abdominal Supra', category: 'Abdomen' },
    { name: 'Abdominal Infra', category: 'Abdomen' },
    { name: 'Abdominal na Maquina', category: 'Abdomen' },
    { name: 'Abdominal no Cabo', category: 'Abdomen' },
    { name: 'Abdominal Bicicleta', category: 'Abdomen' },
    { name: 'Abdominal Remador', category: 'Abdomen' },
    { name: 'Elevacao de Pernas', category: 'Abdomen' },
    { name: 'Elevacao de Joelhos na Barra', category: 'Abdomen' },
    { name: 'Prancha', category: 'Abdomen' },
    { name: 'Prancha Lateral', category: 'Abdomen' },
    { name: 'Prancha com Toque no Ombro', category: 'Abdomen' },
    { name: 'Dead Bug', category: 'Abdomen' },
    { name: 'Bird Dog', category: 'Abdomen' },
    { name: 'Pallof Press', category: 'Abdomen' },
    { name: 'Russian Twist', category: 'Abdomen' },
    { name: 'Abdominal Canivete', category: 'Abdomen' },
    { name: 'Roda Abdominal', category: 'Abdomen' },

    // Corpo inteiro e condicionamento
    { name: 'Burpee', category: 'Corpo Inteiro' },
    { name: 'Kettlebell Swing', category: 'Corpo Inteiro' },
    { name: 'Thruster', category: 'Corpo Inteiro' },
    { name: 'Clean and Press', category: 'Corpo Inteiro' },
    { name: 'Levantamento Terra Sumo', category: 'Corpo Inteiro' },
    { name: 'Batalha de Cordas', category: 'Corpo Inteiro' },
    { name: 'Empurrar Treno', category: 'Corpo Inteiro' },
    { name: 'Puxar Treno', category: 'Corpo Inteiro' },
    { name: 'Mountain Climber', category: 'Corpo Inteiro' },

    // Cardio de academia
    { name: 'Caminhada na Esteira', category: 'Cardio' },
    { name: 'Corrida na Esteira', category: 'Cardio' },
    { name: 'Bicicleta Ergometrica', category: 'Cardio' },
    { name: 'Bicicleta Horizontal', category: 'Cardio' },
    { name: 'Eliptico', category: 'Cardio' },
    { name: 'Escada Ergometrica', category: 'Cardio' },
    { name: 'Remo Ergometrico', category: 'Cardio' }
];

const seedDefaultExercises = async (query, userId) => {
    const placeholders = defaultExercises.map(() => '(?, ?, ?)').join(', ');
    const params = defaultExercises.flatMap((exercise) => [userId, exercise.name, exercise.category]);

    await query(
        `INSERT INTO exercises (user_id, name, category)
         VALUES ${placeholders}
         ON DUPLICATE KEY UPDATE category = VALUES(category)`,
        params
    );
};

const seedDefaultExercisesForAllUsers = async (query) => {
    const exerciseRows = defaultExercises
        .map((_, index) => `${index === 0 ? 'SELECT' : 'UNION ALL SELECT'} ? AS name, ? AS category`)
        .join('\n');
    const params = defaultExercises.flatMap((exercise) => [exercise.name, exercise.category]);

    await query(
        `INSERT INTO exercises (user_id, name, category)
         SELECT users.id, defaults.name, defaults.category
         FROM users
         CROSS JOIN (${exerciseRows}) AS defaults
         WHERE TRUE
         ON DUPLICATE KEY UPDATE category = VALUES(category)`,
        params
    );
};

module.exports = {
    defaultExercises,
    seedDefaultExercises,
    seedDefaultExercisesForAllUsers
};
