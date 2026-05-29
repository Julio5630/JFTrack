const defaultExercises = [
    { name: 'Supino Reto', category: 'Peito', gifUrl: '' },
    { name: 'Supino Inclinado', category: 'Peito', gifUrl: '' },
    { name: 'Crucifixo', category: 'Peito', gifUrl: '' },
    { name: 'Flexao de Braco', category: 'Peito', gifUrl: '' },
    { name: 'Puxada Frontal', category: 'Costas', gifUrl: '' },
    { name: 'Remada Curvada', category: 'Costas', gifUrl: '' },
    { name: 'Remada Baixa', category: 'Costas', gifUrl: '' },
    { name: 'Barra Fixa', category: 'Costas', gifUrl: '' },
    { name: 'Agachamento', category: 'Perna', gifUrl: '' },
    { name: 'Leg Press', category: 'Perna', gifUrl: '' },
    { name: 'Cadeira Extensora', category: 'Perna', gifUrl: '' },
    { name: 'Mesa Flexora', category: 'Perna', gifUrl: '' },
    { name: 'Panturrilha em Pe', category: 'Perna', gifUrl: '' },
    { name: 'Desenvolvimento', category: 'Ombro', gifUrl: '' },
    { name: 'Elevacao Lateral', category: 'Ombro', gifUrl: '' },
    { name: 'Elevacao Frontal', category: 'Ombro', gifUrl: '' },
    { name: 'Rosca Direta', category: 'Biceps', gifUrl: '' },
    { name: 'Rosca Martelo', category: 'Biceps', gifUrl: '' },
    { name: 'Triceps Corda', category: 'Triceps', gifUrl: '' },
    { name: 'Triceps Testa', category: 'Triceps', gifUrl: '' },
    { name: 'Abdominal', category: 'Outros', gifUrl: '' },
    { name: 'Prancha', category: 'Outros', gifUrl: '' }
];

const seedDefaultExercises = async (query, userId) => {
    for (const exercise of defaultExercises) {
        await query(
            `INSERT INTO exercises (user_id, name, category, gif_url)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                category = VALUES(category),
                gif_url = COALESCE(NULLIF(exercises.gif_url, ''), VALUES(gif_url))`,
            [userId, exercise.name, exercise.category, exercise.gifUrl]
        );
    }
};

module.exports = {
    defaultExercises,
    seedDefaultExercises
};
