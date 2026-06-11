import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const DataContext = createContext();

const getWorkoutStorageKey = (userId, scopeKey) => `jftrack.currentWorkout.${userId}.${scopeKey}`;

const readStoredWorkout = (userId, scopeKey) => {
    if (!userId || !scopeKey) return null;
    try {
        const workout = JSON.parse(localStorage.getItem(getWorkoutStorageKey(userId, scopeKey)) || 'null');
        return workout?.scopeKey === scopeKey ? workout : null;
    } catch {
        return null;
    }
};

export const DataProvider = ({ children }) => {
    const {
        user,
        token,
        activeProfile,
        isAcademyStudent,
        studentContextLoading,
        studentTrainingMode,
        selectedGymId
    } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentScopeKey = activeProfile === 'student'
        ? `${studentTrainingMode || 'own'}:${selectedGymId || 'own'}`
        : activeProfile || 'default';

    const loadAllData = useCallback(async () => {
        if (!token || studentContextLoading) {
            if (!token) {
                setData(null);
                setLoading(false);
            }
            return;
        }

        if (activeProfile === 'student' && isAcademyStudent) {
            setLoading(true);
            setError(null);

            try {
                const [studentWorkouts, history] = await Promise.all([
                    api.getStudentWorkouts().catch(err => { console.error('Erro student workouts:', err); return { templates: [], exercises: [] }; }),
                    api.getHistory().catch(err => { console.error('Erro history:', err); return []; }),
                ]);

                setData(previous => ({
                    exercises: studentWorkouts.exercises || [],
                    workoutTemplates: studentWorkouts.templates || [],
                    workoutHistory: history || [],
                    currentWorkout: previous?.currentWorkout?.scopeKey === currentScopeKey
                        ? previous.currentWorkout
                        : readStoredWorkout(user?.id, currentScopeKey),
                }));
            } catch (err) {
                console.error('[DataContext] Erro ao carregar dados do aluno vinculado:', err);
                setError(err.message);
                setData(previous => ({
                    exercises: [],
                    workoutTemplates: [],
                    workoutHistory: [],
                    currentWorkout: previous?.currentWorkout?.scopeKey === currentScopeKey
                        ? previous.currentWorkout
                        : readStoredWorkout(user?.id, currentScopeKey),
                }));
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!token) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [exercises, templates, history] = await Promise.all([
                api.getExercises().catch(err => { console.error('Erro exercises:', err); return []; }),
                api.getTemplates().catch(err => { console.error('Erro templates:', err); return []; }),
                api.getHistory().catch(err => { console.error('Erro history:', err); return []; }),
            ]);

            setData(previous => ({
                exercises: exercises || [],
                workoutTemplates: templates || [],
                workoutHistory: history || [],
                currentWorkout: previous?.currentWorkout?.scopeKey === currentScopeKey
                    ? previous.currentWorkout
                    : readStoredWorkout(user?.id, currentScopeKey),
            }));
        } catch (err) {
            console.error('[DataContext] Erro ao carregar dados:', err);
            setError(err.message);
            setData(previous => ({
                exercises: [],
                workoutTemplates: [],
                workoutHistory: [],
                currentWorkout: previous?.currentWorkout?.scopeKey === currentScopeKey
                    ? previous.currentWorkout
                    : readStoredWorkout(user?.id, currentScopeKey),
            }));
        } finally {
            setLoading(false);
        }
    }, [token, user?.id, activeProfile, isAcademyStudent, studentContextLoading, studentTrainingMode, selectedGymId, currentScopeKey]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const refreshData = useCallback(() => {
        loadAllData();
    }, [loadAllData]);

    const updatePartial = useCallback((updates) => {
        if (Object.prototype.hasOwnProperty.call(updates, 'currentWorkout') && user?.id) {
            const storageKey = getWorkoutStorageKey(user.id, currentScopeKey);
            if (updates.currentWorkout) localStorage.setItem(storageKey, JSON.stringify(updates.currentWorkout));
            else localStorage.removeItem(storageKey);
        }
        setData(previous => previous ? { ...previous, ...updates } : previous);
    }, [user?.id, currentScopeKey]);

    return (
        <DataContext.Provider value={{ data, loading, error, refreshData, updatePartial }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
