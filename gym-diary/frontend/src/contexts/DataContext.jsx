import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAllData = useCallback(async () => {
        if (!token) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const [exercises, templates, routine, history] = await Promise.all([
                api.getExercises().catch(err => { console.error('Erro exercises:', err); return []; }),
                api.getTemplates().catch(err => { console.error('Erro templates:', err); return []; }),
                api.getRoutine().catch(err => { console.error('Erro routine:', err); return []; }),
                api.getHistory().catch(err => { console.error('Erro history:', err); return []; }),
            ]);

            setData(previous => ({
                exercises: exercises || [],
                workoutTemplates: templates || [],
                weeklyRoutine: routine || new Array(7).fill(''),
                workoutHistory: history || [],
                currentWorkout: previous?.currentWorkout || null,
            }));
        } catch (err) {
            console.error('[DataContext] Erro ao carregar dados:', err);
            setError(err.message);
            setData(previous => ({
                exercises: [],
                workoutTemplates: [],
                weeklyRoutine: new Array(7).fill(''),
                workoutHistory: [],
                currentWorkout: previous?.currentWorkout || null,
            }));
        } finally {
            setLoading(false);
        }
    }, [token]);

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
