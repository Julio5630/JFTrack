// src/pages/Progress.jsx
import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Icon from '../components/Icon';
import './Progress.css';

export default function Progress() {
  const { data } = useData();
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  if (!data) return <div className="progress-loading">Carregando...</div>;

  const exercises = data.exercises || [];
  const history = data.workoutHistory || [];
  const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Progression data for chart
  const progression = useMemo(() => {
    if (!selectedExerciseId) return [];
    const entries = [];
    sortedHistory.forEach(workout => {
      const exerciseLog = workout.exercises?.find(e => Number(e.exerciseId) === Number(selectedExerciseId));
      if (exerciseLog && exerciseLog.sets?.length) {
        const lastSet = exerciseLog.sets[exerciseLog.sets.length - 1];
        entries.push({
          date: workout.date,
          weight: lastSet.weight,
          reps: lastSet.reps,
          volume: lastSet.weight * lastSet.reps,
          label: workout.date.slice(5),
        });
      }
    });
    return entries;
  }, [selectedExerciseId, sortedHistory]);

  // Personal best
  const personalBest = useMemo(() => {
    if (!selectedExerciseId) return null;
    let best = { weight: 0, reps: 0, volume: 0, date: null };
    sortedHistory.forEach(workout => {
      const exerciseLog = workout.exercises?.find(e => Number(e.exerciseId) === Number(selectedExerciseId));
      if (exerciseLog && exerciseLog.sets?.length) {
        exerciseLog.sets.forEach(set => {
          const volume = set.weight * set.reps;
          if (volume > best.volume) {
            best = { weight: set.weight, reps: set.reps, volume, date: workout.date };
          }
        });
      }
    });
    return best.volume > 0 ? best : null;
  }, [selectedExerciseId, sortedHistory]);

  // Weekly volume (last 5 weeks)
  const weeklyVolume = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (now.getDay() + 7 * i));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      let volume = 0;
      history.forEach(workout => {
        const workoutDate = new Date(workout.date);
        if (workoutDate >= start && workoutDate <= end) {
          workout.exercises?.forEach(ex => {
            ex.sets?.forEach(set => {
              volume += (set.weight || 0) * (set.reps || 0);
            });
          });
        }
      });
      weeks.push({
        label: `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
        fullLabel: `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
        volume,
      });
    }
    return weeks;
  }, [history]);

  return (
    <div className="progress-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-prog-1"></div>
      <div className="gear gear-prog-2"></div>

      <div className="progress-content">
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>PROGRESSO E EVOLUÇÃO</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">ACOMPANHE SEUS RESULTADOS</p>
        </motion.div>

        <motion.div
          className="progress-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card-corner"></div>

          <div className="selector">
            <label>ESCOLHA UM EXERCÍCIO:</label>
            <select value={selectedExerciseId} onChange={(e) => setSelectedExerciseId(e.target.value)}>
              <option value="">-- Selecione --</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          {selectedExerciseId && (
            <>
              {personalBest && (
                <motion.div
                  className="personal-best"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="pb-icon"><Icon name="trophy" size={30} /></div>
                  <div className="pb-text">
                    <strong>RECORDE PESSOAL</strong>
                    <span>{personalBest.weight} kg x {personalBest.reps} reps</span>
                    <small>{new Date(personalBest.date).toLocaleDateString('pt-BR')}</small>
                  </div>
                </motion.div>
              )}

              <div className="progression-chart">
                <h3>EVOLUÇÃO DE CARGA</h3>
                {progression.length === 0 ? (
                  <p className="no-data">Nenhum dado registrado para este exercício.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={progression}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="label" stroke="#aaa" />
                      <YAxis stroke="#aaa" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e2227', borderColor: '#ff6b35' }} />
                      <Line type="monotone" dataKey="weight" stroke="#ff6b35" strokeWidth={2} dot={{ fill: '#ff6b35' }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="recent-table">
                <h3>ÚLTIMOS TREINOS</h3>
                <table>
                  <thead>
                    <tr><th>Data</th><th>Peso (kg)</th><th>Repetições</th><th>Volume</th></tr>
                  </thead>
                  <tbody>
                    {progression.slice(-5).reverse().map((entry, idx) => (
                      <tr key={idx}>
                        <td>{entry.date}</td>
                        <td>{entry.weight}</td>
                        <td>{entry.reps}</td>
                        <td>{entry.volume}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          className="stats-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="stats-card">
            <h3>VOLUME SEMANAL</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="label" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ backgroundColor: '#1e2227', borderColor: '#ff6b35' }} />
                <Bar dataKey="volume" fill="#2ecc71" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="stats-card">
            <h3>FREQUÊNCIA SEMANAL</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyVolume.map(w => ({ ...w, treinos: Math.floor(w.volume / 100) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="label" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip contentStyle={{ backgroundColor: '#1e2227', borderColor: '#ff6b35' }} />
                <Bar dataKey="treinos" fill="#3498db" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
