import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [token, setToken] = useState(null);
    const [activeProfile, setActiveProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const getProfileTypes = useCallback((userData) => (
        userData?.profiles?.map(profile => profile.type) || []
    ), []);

    const applyUserSession = useCallback((userData, forceProfileSelection = false) => {
        const profileTypes = getProfileTypes(userData);
        const storedProfile = forceProfileSelection ? null : localStorage.getItem('activeProfile');
        const nextProfile = storedProfile && profileTypes.includes(storedProfile)
            ? storedProfile
            : profileTypes.length === 1
                ? profileTypes[0]
                : null;

        setUser(userData);
        setActiveProfile(nextProfile);

        if (nextProfile) {
            localStorage.setItem('activeProfile', nextProfile);
        } else {
            localStorage.removeItem('activeProfile');
        }

        return nextProfile;
    }, [getProfileTypes]);

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
                applyUserSession(response.user);
            } catch (error) {
                console.error('Erro ao restaurar sessao:', error.message);
                setAuthToken(null);
                setToken(null);
                setUser(null);
                setActiveProfile(null);
                localStorage.removeItem('activeProfile');
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, [applyUserSession]);

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
            const selectedProfile = applyUserSession(userData, true);

            return {
                success: true,
                nextPath: selectedProfile ? '/dashboard' : '/profile-select'
            };
        } catch (error) {
            console.error('Erro no login:', error.message);
            return { success: false };
        }
    };

    const logout = () => {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        setUsers([]);
        setActiveProfile(null);
        localStorage.removeItem('activeProfile');
    };

    const refreshCurrentUser = useCallback(async (preferredProfile = null) => {
        const response = await api.getMe();
        applyUserSession(response.user);

        if (preferredProfile && getProfileTypes(response.user).includes(preferredProfile)) {
            setActiveProfile(preferredProfile);
            localStorage.setItem('activeProfile', preferredProfile);
        }

        return response.user;
    }, [applyUserSession, getProfileTypes]);

    const selectProfile = (profileType) => {
        const profileTypes = getProfileTypes(user);
        if (!profileTypes.includes(profileType)) {
            return false;
        }

        setActiveProfile(profileType);
        localStorage.setItem('activeProfile', profileType);
        return true;
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
            activeProfile,
            loading,
            needsProfileSelection: Boolean(user && getProfileTypes(user).length > 1 && !activeProfile),
            login,
            logout,
            refreshCurrentUser,
            selectProfile,
            createUser,
            updateUser,
            deleteUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
