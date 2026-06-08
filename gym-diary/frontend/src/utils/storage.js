// src/utils/storage.js
const USERS_KEY = 'gym_users';

export const getUsers = () => {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    // Usuário admin padrão
    const defaultUsers = [{ id: 1, name: 'Admin', email: 'admin@treino.com', password: 'admin123', isAdmin: true }];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(data);
};

export const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// Dados de cada usuário
export const getUserData = (userId) => {
  const key = `gymData_${userId}`;
  const data = localStorage.getItem(key);
  if (!data) {
    // Dados iniciais vazios com estrutura
    const initial = {
      exercises: [
        { id: 'ex1', name: 'Supino reto', category: 'Peito' },
        { id: 'ex2', name: 'Crucifixo', category: 'Peito' },
        { id: 'ex3', name: 'Puxada frontal', category: 'Costas' },
        { id: 'ex4', name: 'Rosca direta', category: 'Bíceps' },
        { id: 'ex5', name: 'Tríceps corda', category: 'Tríceps' },
        { id: 'ex6', name: 'Agachamento', category: 'Perna' },
      ],
      workoutTemplates: [
        { id: 'w1', name: 'Treino A - Peito/Tríceps', exercises: ['ex1','ex2','ex5'] },
        { id: 'w2', name: 'Treino B - Costas/Bíceps', exercises: ['ex3','ex4'] },
        { id: 'w3', name: 'Treino C - Pernas', exercises: ['ex6'] },
      ],
      workoutHistory: [],
      currentWorkout: null,
    };
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

export const saveUserData = (userId, data) => {
  const key = `gymData_${userId}`;
  localStorage.setItem(key, JSON.stringify(data));
};
