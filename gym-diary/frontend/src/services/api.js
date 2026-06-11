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

    const activeProfile = localStorage.getItem('activeProfile');
    if (activeProfile && !headers['X-Active-Profile']) {
        headers['X-Active-Profile'] = activeProfile;
    }

    const selectedStudentGymId = localStorage.getItem('selectedStudentGymId');
    if (selectedStudentGymId) {
        headers['X-Selected-Student-Gym-Id'] = selectedStudentGymId;
    }

    const studentTrainingMode = localStorage.getItem('studentTrainingMode');
    if (studentTrainingMode) {
        headers['X-Student-Training-Mode'] = studentTrainingMode;
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
    register: (name, email, password, accountType = 'student', gymName = '', phone = '') => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, accountType, gymName, phone }),
    }),
    getMe: () => request('/me'),
    updateMe: (updates) => request('/me', {
        method: 'PUT',
        body: JSON.stringify(updates),
    }),
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
    createExercise: (name, category, videoUrl = '') => request('/exercises', {
        method: 'POST',
        body: JSON.stringify({ name, category, videoUrl }),
    }),
    updateExercise: (id, name, category, videoUrl = '') => request(`/exercises/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, category, videoUrl }),
    }),
    deleteExercise: (id) => request(`/exercises/${id}`, { method: 'DELETE' }),
    getTemplates: () => request('/templates'),
    createTemplate: (name, exercises, options = {}) => request('/templates', {
        method: 'POST',
        body: JSON.stringify({ name, exercises, ...options }),
    }),
    updateTemplate: (id, name, exercises, options = {}) => request(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, exercises, ...options }),
    }),
    deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
    getHistory: () => request('/history'),
    saveWorkout: (workoutData) => request('/history', {
        method: 'POST',
        body: JSON.stringify(workoutData),
    }),
    getWorkoutDetail: (id) => request(`/history/${id}`),
    getMyGym: () => request('/gyms/me'),
    saveMyGym: (gymData) => request('/gyms/me', {
        method: 'PUT',
        body: JSON.stringify(gymData),
    }),
    getGymMembers: (role) => request(`/gyms/me/members?role=${encodeURIComponent(role)}`),
    getGymReports: () => request('/gyms/me/reports'),
    addGymMember: (email, role) => request('/gyms/me/members', {
        method: 'POST',
        body: JSON.stringify({ email, role }),
    }),
    removeGymMember: (id) => request(`/gyms/me/members/${id}`, { method: 'DELETE' }),
    getStudentContext: (profileOverride = '') => request('/gyms/student-context', {
        headers: profileOverride ? { 'X-Active-Profile': profileOverride } : {}
    }),
    getStudentWorkouts: () => request('/gyms/student-workouts'),
    getStudentAssessments: () => request('/gyms/student-assessments'),
    getPersonalSummary: (gymId = '') => request(`/personal/summary${gymId ? `?gymId=${encodeURIComponent(gymId)}` : ''}`),
    getPersonalGyms: (profileOverride = '') => request('/personal/gyms', {
        headers: profileOverride ? { 'X-Active-Profile': profileOverride } : {}
    }),
    getPersonalStudents: (search = '', gymId = '') => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (gymId) params.set('gymId', gymId);
        const queryString = params.toString();
        return request(`/personal/students${queryString ? `?${queryString}` : ''}`);
    },
    addPersonalStudent: (email, gymId = '') => request('/personal/students', {
        method: 'POST',
        body: JSON.stringify({ email, gymId }),
    }),
    getPersonalStudent: (id, gymId = '') => request(`/personal/students/${id}${gymId ? `?gymId=${encodeURIComponent(gymId)}` : ''}`),
    getPersonalAssignments: (gymId = '') => request(`/personal/assignments${gymId ? `?gymId=${encodeURIComponent(gymId)}` : ''}`),
    assignPersonalWorkout: (studentEmail, templateId, notes = '', gymId = '') => request('/personal/assignments', {
        method: 'POST',
        body: JSON.stringify({ studentEmail, templateId, notes, gymId }),
    }),
    updatePersonalAssignment: (id, updates) => request(`/personal/assignments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    }),
    reorderPersonalAssignments: (studentId, assignmentIds, gymId = '') => request('/personal/assignments/reorder', {
        method: 'PUT',
        body: JSON.stringify({ studentId, assignmentIds, gymId }),
    }),
    getPersonalAssessments: (studentId = '', gymId = '') => {
        const params = new URLSearchParams();
        if (studentId) params.set('studentId', studentId);
        if (gymId) params.set('gymId', gymId);
        const queryString = params.toString();
        return request(`/personal/assessments${queryString ? `?${queryString}` : ''}`);
    },
    createPersonalAssessment: (assessment) => request('/personal/assessments', {
        method: 'POST',
        body: JSON.stringify(assessment),
    }),
    updatePersonalAssessment: (id, assessment) => request(`/personal/assessments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(assessment),
    }),
};
