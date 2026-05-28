// src/pages/History.jsx
import { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../components/Icon';
import './History.css';

export default function History() {
  const { data } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!data) return <div className="history-loading">Carregando...</div>;

  // Calcular recordes por exercício (maior volume = peso * reps)
  const records = useMemo(() => {
    const rec = {};
    data.workoutHistory?.forEach(workout => {
      workout.exercises?.forEach(ex => {
        ex.sets?.forEach(set => {
          const volume = (set.weight || 0) * (set.reps || 0);
          const current = rec[ex.exerciseId];
          if (!current || volume > current.volume) {
            rec[ex.exerciseId] = {
              volume,
              weight: set.weight,
              reps: set.reps,
              date: workout.date,
            };
          }
        });
      });
    });
    return rec;
  }, [data.workoutHistory]);

  // Verificar se um dia possui algum recorde
  const dayHasRecord = (dateStr, workouts) => {
    return workouts.some(workout =>
      workout.exercises.some(ex =>
        ex.sets.some(set => {
          const volume = (set.weight || 0) * (set.reps || 0);
          const record = records[ex.exerciseId];
          return record && record.volume === volume && record.date === workout.date;
        })
      )
    );
  };

  // Mesmo código de calendário anterior, mas com classe "record" quando dia tem recorde
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startWeekday = firstDayOfMonth.getDay();

  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateStr = date.toISOString().slice(0, 10);
    const workoutsOnDay = data.workoutHistory?.filter(w => w.date === dateStr) || [];
    const hasWorkout = workoutsOnDay.length > 0;
    const routineId = data.weeklyRoutine?.[date.getDay()];
    const hasRoutine = routineId && data.workoutTemplates?.some(t => t.id === routineId);
    let status = 'none';
    if (hasWorkout) status = 'completed';
    else if (hasRoutine) status = 'missed';

    const hasRecord = dayHasRecord(dateStr, workoutsOnDay);

    days.push({ date, dateStr, workouts: workoutsOnDay, status, hasRecord });
  }

  const blankCells = [];
  for (let i = 0; i < startWeekday; i++) blankCells.push({ blank: true });
  const allCells = [...blankCells, ...days];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const openDayDetails = (day) => {
    if (!day.blank) {
      setSelectedDay(day);
      setModalOpen(true);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDay(null);
  };

  return (
    <div className="history-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-hist-1"></div>
      <div className="gear gear-hist-2"></div>

      <div className="history-content">
        <div className="dashboard-header">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            HISTÓRICO DE TREINOS
          </motion.h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">CALENDÁRIO DE ATIVIDADES</p>
        </div>

        <div className="calendar-card">
          <div className="card-corner"></div>
          <div className="calendar-nav">
            <button onClick={prevMonth} className="nav-btn" aria-label="Mes anterior"><Icon name="chevronLeft" size={20} /></button>
            <h2>{monthNames[month]} {year}</h2>
            <button onClick={nextMonth} className="nav-btn" aria-label="Proximo mes"><Icon name="chevronRight" size={20} /></button>
          </div>
          <div className="calendar-weekdays">
            {weekDays.map((day, idx) => (
              <div key={idx} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-grid">
            {allCells.map((cell, idx) => (
              <motion.div
                key={idx}
                className={`calendar-day ${cell.blank ? 'blank' : ''} ${cell.status ? cell.status : ''} ${cell.hasRecord ? 'record' : ''}`}
                onClick={() => openDayDetails(cell)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {!cell.blank && (
                  <>
                    <span className="day-number">{cell.date.getDate()}</span>
                    {cell.hasRecord && <span className="crown-icon"><Icon name="trophy" size={16} /></span>}
                    {cell.status === 'completed' && !cell.hasRecord && <span className="indicator"><Icon name="check" size={14} /></span>}
                    {cell.status === 'missed' && <span className="indicator"><Icon name="alert" size={14} /></span>}
                  </>
                )}
              </motion.div>
            ))}
          </div>
          <div className="legend">
            <div className="legend-item"><div className="legend-color completed"></div><span>Treino realizado</span></div>
            <div className="legend-item"><div className="legend-color missed"></div><span>Treino perdido</span></div>
            <div className="legend-item"><div className="legend-color none"></div><span>Descanso / Sem treino</span></div>
            <div className="legend-item"><div className="legend-color record"></div><span>Recorde pessoal!</span></div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && selectedDay && (
          <motion.div
            className="modal-overlay"
            onClick={closeModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="industrial-modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
            >
              <div className="modal-header">
                <h2>{selectedDay.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
                <button className="close-modal" onClick={closeModal} aria-label="Fechar"><Icon name="close" size={18} /></button>
              </div>
              <div className="modal-body">
                {selectedDay.workouts.length === 0 ? (
                  <p className="no-workouts">Nenhum treino registrado neste dia.</p>
                ) : (
                  selectedDay.workouts.map(workout => (
                    <div key={workout.id} className="workout-detail">
                      <h3>{workout.name}</h3>
                      {workout.exercises.map(ex => {
                        const exName = data.exercises?.find(e => e.id === ex.exerciseId)?.name || 'Exercício';
                        const isRecord = ex.sets.some(set => {
                          const volume = (set.weight || 0) * (set.reps || 0);
                          const record = records[ex.exerciseId];
                          return record && record.volume === volume && record.date === workout.date;
                        });
                        return (
                          <div key={ex.exerciseId} className="exercise-detail">
                            <strong>{exName} {isRecord && <span className="record-badge"><Icon name="trophy" size={14} /> RECORDE</span>}</strong>
                            {ex.sets.map((set, idx) => (
                              <div key={idx} className="set-detail">
<Icon name="check" size={13} /> Serie {idx + 1}: {set.reps} reps x {set.weight}kg {set.completed ? <Icon name="check" size={13} /> : null}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              <div className="modal-footer">
                <button className="industrial-btn small" onClick={closeModal}>Fechar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}