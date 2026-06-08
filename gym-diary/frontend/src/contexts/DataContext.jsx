import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const {
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

    const loadAllData = useCallback(async () => {
        if (!token || studentContextLoading) {
            if (!token) {
                setData(null);
                setLoading(false);
            }
            return;
        }

        const currentScopeKey = activeProfile === 'student'
            ? `${studentTrainingMode || 'own'}:${selectedGymId || 'own'}`
            : activeProfile || 'default';

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
                        : null,
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
                        : null,
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
                    : null,
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
                    : null,
            }));
        } finally {
            setLoading(false);
        }
    }, [token, activeProfile, isAcademyStudent, studentContextLoading, studentTrainingMode, selectedGymId]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const refreshData = useCallback(() => {
        loadAllData();
    }, [loadAllData]);

    const updatePartial = useCallback((updates) => {
        setData(previous => previous ? { ...previous, ...updates } : previous);
    }, []);

    return (
        <DataContext.Provider value={{ data, loading, error, refreshData, updatePartial }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
