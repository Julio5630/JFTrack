import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [token, setToken] = useState(null);
    const [activeProfile, setActiveProfile] = useState(null);
    const [studentTrainingMode, setStudentTrainingMode] = useState(() => localStorage.getItem('studentTrainingMode'));
    const [selectedGymId, setSelectedGymId] = useState(() => localStorage.getItem('selectedStudentGymId'));
    const [studentContext, setStudentContext] = useState({ isAcademyStudent: false, memberships: [] });
    const [studentContextLoading, setStudentContextLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    const getProfileTypes = useCallback((userData) => (
        userData?.profiles?.map(profile => profile.type) || []
    ), []);

    const applyUserSession = useCallback((userData, forceProfileSelection = false) => {
        const profileTypes = getProfileTypes(userData);
        const storedProfile = forceProfileSelection ? null : localStorage.getItem('activeProfile');
        const effectiveProfileTypes = profileTypes.includes('gym') && !profileTypes.includes('admin')
            ? profileTypes.filter((profileType) => profileType !== 'student')
            : profileTypes;

        const nextProfile = storedProfile && effectiveProfileTypes.includes(storedProfile)
            ? storedProfile
            : effectiveProfileTypes.length === 1
                ? effectiveProfileTypes[0]
                : null;

        setUser(userData);
        setActiveProfile(nextProfile);
        setStudentContextLoading(nextProfile === 'student');

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
                setStudentTrainingMode(null);
                setSelectedGymId(null);
                setStudentContext({ isAcademyStudent: false, memberships: [] });
                localStorage.removeItem('activeProfile');
                localStorage.removeItem('studentTrainingMode');
                localStorage.removeItem('selectedStudentGymId');
                localStorage.removeItem('selectedPersonalGymId');
            } finally {
                setLoading(false);
            }
        };

        restoreSession();
    }, [applyUserSession]);

    useEffect(() => {
        let mounted = true;

        const loadStudentContext = async () => {
            if (!token || activeProfile !== 'student') {
                setStudentContext({ isAcademyStudent: false, memberships: [] });
                setStudentContextLoading(false);
                return;
            }

            setStudentContextLoading(true);
            try {
                const response = await api.getStudentContext();
                if (mounted) {
                    setStudentContext({
                        isAcademyStudent: Boolean(response.isAcademyStudent),
                        memberships: response.memberships || []
                    });

                    const memberships = response.memberships || [];
                    const hasMemberships = memberships.length > 0;
                    const selectedMembershipExists = memberships.some(
                        (membership) => String(membership.gymId) === String(localStorage.getItem('selectedStudentGymId'))
                    );

                    if (!hasMemberships && localStorage.getItem('studentTrainingMode') !== 'own') {
                        setStudentTrainingMode('own');
                        setSelectedGymId(null);
                        localStorage.setItem('studentTrainingMode', 'own');
                        localStorage.removeItem('selectedStudentGymId');
                    }

                    if (localStorage.getItem('studentTrainingMode') === 'academy' && !selectedMembershipExists) {
                        setStudentTrainingMode(null);
                        setSelectedGymId(null);
                        localStorage.removeItem('studentTrainingMode');
                        localStorage.removeItem('selectedStudentGymId');
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar contexto do aluno:', error.message);
                if (mounted) {
                    setStudentContext({ isAcademyStudent: false, memberships: [] });
                }
            } finally {
                if (mounted) setStudentContextLoading(false);
            }
        };

        loadStudentContext();

        return () => {
            mounted = false;
        };
    }, [token, activeProfile]);

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
        setStudentTrainingMode(null);
        setSelectedGymId(null);
        setStudentContext({ isAcademyStudent: false, memberships: [] });
        setStudentContextLoading(false);
        localStorage.removeItem('activeProfile');
        localStorage.removeItem('studentTrainingMode');
        localStorage.removeItem('selectedStudentGymId');
        localStorage.removeItem('selectedPersonalGymId');
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

    const updateCurrentUser = useCallback(async (updates) => {
        const response = await api.updateMe(updates);
        setUser(response.user);
        return response.user;
    }, []);

    const selectProfile = (profileType) => {
        if (!profileType) {
            setActiveProfile(null);
            setStudentTrainingMode(null);
            setSelectedGymId(null);
            localStorage.removeItem('activeProfile');
            localStorage.removeItem('studentTrainingMode');
            localStorage.removeItem('selectedStudentGymId');
            localStorage.removeItem('selectedPersonalGymId');
            return true;
        }

        const profileTypes = getProfileTypes(user);
        const effectiveProfileTypes = profileTypes.includes('gym') && !profileTypes.includes('admin')
            ? profileTypes.filter((type) => type !== 'student')
            : profileTypes;
        if (!effectiveProfileTypes.includes(profileType)) {
            return false;
        }

        setActiveProfile(profileType);
        localStorage.setItem('activeProfile', profileType);
        if (profileType === 'student') {
            setStudentContextLoading(true);
        }
        if (profileType !== 'student') {
            setStudentTrainingMode(null);
            setSelectedGymId(null);
            localStorage.removeItem('studentTrainingMode');
            localStorage.removeItem('selectedStudentGymId');
            if (profileType !== 'personal') {
                localStorage.removeItem('selectedPersonalGymId');
            }
        }
        return true;
    };

    const register = async (name, email, password, accountType = 'student', gymName = '') => {
        try {
            await api.register(name, email, password, accountType, gymName);
            return await login(email, password);
        } catch (error) {
            console.error('Erro ao registrar:', error.message);
            return { success: false, error: error.message };
        }
    };

    const selectStudentTrainingMode = (mode, gymId = null) => {
        if (mode === 'academy' && !gymId) return false;
        if (!['own', 'academy'].includes(mode)) return false;

        setStudentTrainingMode(mode);
        localStorage.setItem('studentTrainingMode', mode);

        if (mode === 'academy') {
            setSelectedGymId(String(gymId));
            localStorage.setItem('selectedStudentGymId', String(gymId));
        } else {
            setSelectedGymId(null);
            localStorage.removeItem('selectedStudentGymId');
        }

        return true;
    };

    const requestStudentModeSelection = () => {
        if (!getProfileTypes(user).includes('student')) return false;

        setActiveProfile('student');
        setStudentTrainingMode(null);
        setSelectedGymId(null);
        setStudentContextLoading(false);
        localStorage.setItem('activeProfile', 'student');
        localStorage.removeItem('studentTrainingMode');
        localStorage.removeItem('selectedStudentGymId');
        return true;
    };

    const userProfileTypes = getProfileTypes(user);
    const hasStudentProfile = userProfileTypes.includes('student') && !(userProfileTypes.includes('gym') && !userProfileTypes.includes('admin'));
    const needsStudentModeSelection = Boolean(
        user &&
        activeProfile === 'student' &&
        hasStudentProfile &&
        !studentContextLoading &&
        studentContext.memberships.length > 0 &&
        !studentTrainingMode
    );

    const selectedGymMembership = studentContext.memberships.find(
        (membership) => String(membership.gymId) === String(selectedGymId)
    ) || null;

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
            studentTrainingMode,
            selectedGymId,
            selectedGymMembership,
            studentContext,
            studentContextLoading,
            isAcademyStudent: Boolean(activeProfile === 'student' && studentTrainingMode === 'academy' && selectedGymMembership),
            loading,
            needsProfileSelection: Boolean(user && (!activeProfile || needsStudentModeSelection)),
            login,
            register,
            logout,
            refreshCurrentUser,
            updateCurrentUser,
            selectProfile,
            selectStudentTrainingMode,
            requestStudentModeSelection,
            createUser,
            updateUser,
            deleteUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
