const { query } = require('../config/database');

// 📌 Criar exercício
const createExercise = async (req, res) => {
    try {
        const { name, category, gifUrl = '' } = req.body;
        const userId = req.user.id;

        await query(
            'INSERT INTO exercises (user_id, name, category, gif_url) VALUES (?, ?, ?, ?)',
            [userId, name, category, gifUrl]
        );

        res.status(201).json({ message: 'Exercício criado com sucesso' });
    } catch (error) {
        console.error(error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Exercício já existe' });
        }

        res.status(500).json({ error: 'Erro ao criar exercício' });
    }
};

// 📌 Listar exercícios do usuário
const getExercises = async (req, res) => {
    try {
        const userId = req.user.id;

        const exercises = await query(
            'SELECT * FROM exercises WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        res.json(exercises);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar exercícios' });
    }
};

// 📌 Atualizar exercício
const updateExercise = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, gifUrl = '' } = req.body;
        const userId = req.user.id;

        const result = await query(
            'UPDATE exercises SET name = ?, category = ?, gif_url = ? WHERE id = ? AND user_id = ?',
            [name, category, gifUrl, id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Exercício não encontrado' });
        }

        res.json({ message: 'Exercício atualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar exercício' });
    }
};

// 📌 Deletar exercício
const deleteExercise = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await query(
            'DELETE FROM exercises WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Exercício não encontrado' });
        }

        res.json({ message: 'Exercício deletado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar exercício' });
    }
};

module.exports = {
    createExercise,
    getExercises,
    updateExercise,
    deleteExercise
};
