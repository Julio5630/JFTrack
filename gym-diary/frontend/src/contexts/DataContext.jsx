// src/contexts/DataContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const { token } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAllData = async () => {
        if (!token) {
            setData(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            console.log('[DataContext] Carregando dados da API...');
            
            const [exercises, templates, routine, history] = await Promise.all([
                api.getExercises().catch(err => { console.error('Erro exercises:', err); return []; }),
                api.getTemplates().catch(err => { console.error('Erro templates:', err); return []; }),
                api.getRoutine().catch(err => { console.error('Erro routine:', err); return []; }),
                api.getHistory().catch(err => { console.error('Erro history:', err); return []; }),
            ]);
            
            console.log('[DataContext] Dados carregados:', { exercises, templates, routine, history });
            
            setData({
                exercises: exercises || [],
                workoutTemplates: templates || [],
                weeklyRoutine: routine || new Array(7).fill(null),
                workoutHistory: history || [],
            });
        } catch (err) {
            console.error('[DataContext] Erro ao carregar dados:', err);
            setError(err.message);
            // Fallback para dados vazios
            setData({
                exercises: [],
                workoutTemplates: [],
                weeklyRoutine: new Array(7).fill(null),
                workoutHistory: [],
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, [token]);

    const refreshData = () => {
        loadAllData();
    };

    const updatePartial = async (updates) => {
        if (data) {
            setData({ ...data, ...updates });
        }
        await loadAllData();
    };

    return (
        <DataContext.Provider value={{ data, loading, error, refreshData, updatePartial }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);