// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { AnimatePresence, motion } from 'framer-motion';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import ProfileWorkspace from './pages/ProfileWorkspace';
import PersonalWorkspace from './pages/PersonalWorkspace';
import GymSetup from './pages/GymSetup';
import Dashboard from './pages/Dashboard';
import WorkoutExecution from './pages/WorkoutExecution';
import MyWorkouts from './pages/MyWorkouts';
import AcademyStudentWorkouts from './pages/AcademyStudentWorkouts';
import PhysicalAssessment from './pages/PhysicalAssessment';
import History from './pages/History';
import Progress from './pages/Progress';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import TrainingModeToggle from './components/TrainingModeToggle';
import './App.css';

function PrivateRoute({ children, allowProfileSelection = false }) {
    const { user, loading, needsProfileSelection } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    if (needsProfileSelection && !allowProfileSelection) return <Navigate to="/profile-select" />;
    return children;
}

function AdminRoute({ children }) {
    const { user, loading, activeProfile } = useAuth();
    if (loading) return null;
    return user?.isAdmin && activeProfile === 'admin' ? children : <Navigate to="/dashboard" />;
}

function ProfileRoute({ profile, children }) {
    const { activeProfile } = useAuth();
    return activeProfile === profile ? children : <Navigate to="/dashboard" />;
}

function StudentModeRoute({ academy = false, children }) {
    const { activeProfile, isAcademyStudent, studentContextLoading } = useAuth();
    if (studentContextLoading) return null;
    if (activeProfile !== 'student') return <Navigate to="/dashboard" />;
    return isAcademyStudent === academy ? children : <Navigate to="/dashboard" />;
}

function StudentRoute({ children }) {
    const { activeProfile, studentContextLoading } = useAuth();
    if (studentContextLoading) return null;
    return activeProfile === 'student' ? children : <Navigate to="/dashboard" />;
}

function HomeRedirect() {
    const { user, loading, needsProfileSelection } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    return <Navigate to={needsProfileSelection ? '/profile-select' : '/dashboard'} />;
}

function LoginRoute() {
    const { user, loading, needsProfileSelection } = useAuth();
    if (loading) return null;
    if (user) return <Navigate to={needsProfileSelection ? '/profile-select' : '/dashboard'} />;
    return <Login />;
}

function DashboardRoute() {
    const { activeProfile } = useAuth();

    if (activeProfile === 'student') return <Dashboard />;
    if (activeProfile === 'admin') return <AdminPanel />;
    if (activeProfile === 'personal') return <PersonalWorkspace />;
    return <ProfileWorkspace />;
}

function AnimatedRoutes() {
    const location = useLocation();
    const { user } = useAuth();

    const pageVariants = {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 }
    };

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/login" element={
                    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ background: '#0a0c0f' }}>
                        <LoginRoute />
                    </motion.div>
                } />
                <Route path="/profile-select" element={
                    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ background: '#0a0c0f' }}>
                        <ProfileSelect />
                    </motion.div>
                } />
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <DashboardRoute />
                        </motion.div>
                    </PrivateRoute>
                } />
                <Route path="/personal/:section" element={
                    <PrivateRoute>
                        <ProfileRoute profile="personal">
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <PersonalWorkspace />
                            </motion.div>
                        </ProfileRoute>
                    </PrivateRoute>
                } />
                <Route path="/gym/:section" element={
                    <PrivateRoute>
                        <ProfileRoute profile="gym">
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <ProfileWorkspace />
                            </motion.div>
                        </ProfileRoute>
                    </PrivateRoute>
                } />
                <Route path="/gym/setup" element={
                    <PrivateRoute>
                        <ProfileRoute profile="gym">
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <GymSetup />
                            </motion.div>
                        </ProfileRoute>
                    </PrivateRoute>
                } />
                <Route path="/execution" element={
                    <PrivateRoute>
                        <StudentRoute>
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <WorkoutExecution />
                            </motion.div>
                        </StudentRoute>
                    </PrivateRoute>
                } />
                <Route path="/my-workouts" element={
                    <PrivateRoute>
                        <StudentModeRoute>
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <MyWorkouts />
                            </motion.div>
                        </StudentModeRoute>
                    </PrivateRoute>
                } />
                <Route path="/student/workouts" element={
                    <PrivateRoute>
                        <StudentModeRoute academy>
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <AcademyStudentWorkouts />
                            </motion.div>
                        </StudentModeRoute>
                    </PrivateRoute>
                } />
                <Route path="/student/assessment" element={
                    <PrivateRoute>
                        <StudentModeRoute academy>
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <PhysicalAssessment />
                            </motion.div>
                        </StudentModeRoute>
                    </PrivateRoute>
                } />
                <Route path="/create" element={
                    <PrivateRoute>
                        <StudentModeRoute>
                            <Navigate to="/my-workouts" />
                        </StudentModeRoute>
                    </PrivateRoute>
                } />
                <Route path="/library" element={
                    <PrivateRoute>
                        <StudentModeRoute>
                            <Navigate to="/my-workouts" />
                        </StudentModeRoute>
                    </PrivateRoute>
                } />
                <Route path="/history" element={
                    <PrivateRoute>
                        <StudentRoute>
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <History />
                            </motion.div>
                        </StudentRoute>
                    </PrivateRoute>
                } />
                <Route path="/progress" element={
                    <PrivateRoute>
                        <StudentRoute>
                            <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                                <Progress />
                            </motion.div>
                        </StudentRoute>
                    </PrivateRoute>
                } />
                <Route path="/admin" element={
                    <AdminRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <AdminPanel />
                        </motion.div>
                    </AdminRoute>
                } />
            </Routes>
        </AnimatePresence>
    );
}

function AppContent() {
    const { user, activeProfile, isAcademyStudent } = useAuth();
    const location = useLocation();
    const showShell = Boolean(user && activeProfile && location.pathname !== '/profile-select');

    return (
        <>
            {showShell && <Navbar />}
            <AnimatedRoutes />
            {showShell && activeProfile === 'student' && !isAcademyStudent && <TrainingModeToggle />}
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <DataProvider>
                    <AppContent />
                </DataProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
