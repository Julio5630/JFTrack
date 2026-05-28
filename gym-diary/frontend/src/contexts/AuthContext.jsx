import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const storedToken = localStorage.getItem('authToken');
            if (!storedToken) {
                setLoading(false);
                return;
            }

            try {
                setToken(storedToken);
                setAuthToken(storedToken);
                const response = await api.getMe();
                setUser(response.user);
            } catch (error) {
                console.error('Erro ao restaurar sessao:', error.message);
                setAuthToken(null);
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, []);

    const loadUsers = useCallback(async () => {
        if (!user?.isAdmin) {
            setUsers([]);
            return;
        }

        try {
            const response = await api.getUsers();
            setUsers(response);
        } catch (error) {
            console.error('Erro ao carregar usuarios:', error.message);
            setUsers([]);
        }
    }, [user]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const login = async (email, password) => {
        try {
            const response = await api.login(email, password);
            const { token: newToken, user: userData } = response;
            setAuthToken(newToken);
            setToken(newToken);
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
        setUsers([]);
    };

    const createUser = async (name, email, password, isAdmin = false) => {
        try {
            await api.createUser(name, email, password, isAdmin);
            await loadUsers();
            return true;
        } catch (error) {
            console.error('Erro ao criar usuario:', error.message);
            return false;
        }
    };

    const updateUser = async (id, updates) => {
        try {
            await api.updateUser(id, updates);
            await loadUsers();
            return true;
        } catch (error) {
            console.error('Erro ao atualizar usuario:', error.message);
            return false;
        }
    };

    const deleteUser = async (id) => {
        try {
            await api.deleteUser(id);
            await loadUsers();
            return true;
        } catch (error) {
            console.error('Erro ao remover usuario:', error.message);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            users,
            token,
            loading,
            login,
            logout,
            createUser,
            updateUser,
            deleteUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
