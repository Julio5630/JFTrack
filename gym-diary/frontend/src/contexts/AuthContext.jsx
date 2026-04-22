// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            setToken(storedToken);
            setAuthToken(storedToken);
            // Tenta carregar dados do usuário (opcional, se tiver endpoint /me)
            // Por enquanto, só mantém o token
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const response = await api.login(email, password);
            console.log('Login response:', response);
            
            const { token, user: userData } = response;
            setAuthToken(token);
            setToken(token);
            setUser(userData);
            return true;
        } catch (error) {
            console.error('Erro no login:', error.message);
            return false;
        }
    };

    const logout = () => {
        setAuthToken(null);
        setToken(null);
        setUser(null);
    };

    const createUser = async (name, email, password, isAdmin = false) => {
        try {
            await api.register(name, email, password, isAdmin);
            return true;
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, createUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);