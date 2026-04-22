// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { AnimatePresence, motion } from 'framer-motion';
import Login from './pages/Login';
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
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
    const { user } = useAuth();
    return user?.isAdmin ? children : <Navigate to="/dashboard" />;
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
                        <Login />
                    </motion.div>
                } />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={
                    <PrivateRoute>
                        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                            <Dashboard />
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
    const { user } = useAuth();
    return (
        <>
            {user && <Navbar />}
            <AnimatedRoutes />
            {user && <TrainingModeToggle />}
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