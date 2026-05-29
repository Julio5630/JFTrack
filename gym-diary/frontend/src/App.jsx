// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { AnimatePresence, motion } from 'framer-motion';
import Login from './pages/Login';
import ProfileSelect from './pages/ProfileSelect';
import ProfileWorkspace from './pages/ProfileWorkspace';
import GymSetup from './pages/GymSetup';
import Dashboard from './pages/Dashboard';
import WorkoutExecution from './pages/WorkoutExecution';
import WorkoutCreator from './pages/WorkoutCreator';
import Routines from './pages/Routines';
import ExerciseLibrary from './pages/ExerciseLibrary';
import History from './pages/History';
import Progress from './pages/Progress';
import AdminPanel from './pages/AdminPanel';
import Navbar from './components/Navbar';
import TrainingModeToggle from './components/TrainingModeToggle';
import './App.css';

function PrivateRoute({ children }) {
    const { user, loading, needsProfileSelection } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" />;
    if (needsProfileSelection) return <Navigate to="/profile-select" />;
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
                                <ProfileWorkspace />
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
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <GymSetup />
                        </motion.div>
                    </PrivateRoute>
                } />
                <Route path="/execution" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <WorkoutExecution />
                        </motion.div>
                    </PrivateRoute>
                } />
                <Route path="/create" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <WorkoutCreator />
                        </motion.div>
                    </PrivateRoute>
                } />
                <Route path="/routines" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <Routines />
                        </motion.div>
                    </PrivateRoute>
                } />
                <Route path="/library" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <ExerciseLibrary />
                        </motion.div>
                    </PrivateRoute>
                } />
                <Route path="/history" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <History />
                        </motion.div>
                    </PrivateRoute>
                } />
                <Route path="/progress" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <Progress />
                        </motion.div>
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
    const { user, activeProfile } = useAuth();
    const location = useLocation();
    const showShell = Boolean(user && activeProfile && location.pathname !== '/profile-select');

    return (
        <>
            {showShell && <Navbar />}
            <AnimatedRoutes />
            {showShell && activeProfile === 'student' && <TrainingModeToggle />}
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
