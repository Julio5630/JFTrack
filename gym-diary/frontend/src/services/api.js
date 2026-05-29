// frontend/src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
};

export const getAuthToken = () => authToken || localStorage.getItem('authToken');

async function request(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_URL}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ${response.status}`);
        }

        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error(`[API] Erro:`, error.message);
        throw error;
    }
}

export const api = {
    login: (email, password) => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    }),
    register: (name, email, password, isAdmin = false) => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, isAdmin }),
    }),
    getMe: () => request('/me'),
    getUsers: () => request('/users'),
    createUser: (name, email, password, isAdmin = false) => request('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, isAdmin }),
    }),
    updateUser: (id, updates) => request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    }),
    deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
    getExercises: () => request('/exercises'),
    createExercise: (name, category, gifUrl = '') => request('/exercises', {
        method: 'POST',
        body: JSON.stringify({ name, category, gifUrl }),
    }),
    updateExercise: (id, name, category, gifUrl = '') => request(`/exercises/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, category, gifUrl }),
    }),
    deleteExercise: (id) => request(`/exercises/${id}`, { method: 'DELETE' }),
    getTemplates: () => request('/templates'),
    createTemplate: (name, exercises) => request('/templates', {
        method: 'POST',
        body: JSON.stringify({ name, exercises }),
    }),
    updateTemplate: (id, name, exercises) => request(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, exercises }),
    }),
    deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
    getRoutine: () => request('/routines'),
    updateRoutineDay: (dayOfWeek, templateId) => request('/routines', {
        method: 'POST',
        body: JSON.stringify({ day_of_week: dayOfWeek, template_id: templateId }),
    }),
    getHistory: () => request('/history'),
    saveWorkout: (workoutData) => request('/history', {
        method: 'POST',
        body: JSON.stringify(workoutData),
    }),
    getWorkoutDetail: (id) => request(`/history/${id}`),
};
