// src/pages/Routines.jsx
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import './Routines.css';

export default function Routines() {
  const { data, updatePartial } = useData();
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (!data) return <div className="routines-loading">Carregando...</div>;

  const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Domingo, mas queremos segunda como primeiro
  const startOfWeek = new Date(today);
  // Ajusta para segunda-feira (se hoje for domingo, vai para segunda passada)
  const diffToMonday = (currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek);
  startOfWeek.setDate(today.getDate() + diffToMonday);

  // Gera datas para cada dia da semana
  const weekDates = weekdays.map((_, idx) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + idx);
    return date;
  });

  const routine = data.weeklyRoutine || ['', '', '', '', '', '', ''];

  const handleDayClick = (index) => {
    setSelectedDay(index);
    setModalOpen(true);
  };

  const assignWorkout = (workoutId) => {
    const newRoutine = [...routine];
    newRoutine[selectedDay] = workoutId;
    updatePartial({ weeklyRoutine: newRoutine });
    setModalOpen(false);
  };

  const getWorkoutName = (workoutId) => {
    const workout = data.workoutTemplates?.find(w => w.id === workoutId);
    return workout ? workout.name : '—';
  };

  return (
    <div className="routines-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-routine-1"></div>
      <div className="gear gear-routine-2"></div>

      <div className="routines-content">
        <div className="dashboard-header">
          <h1>ROTINA SEMANAL</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">CALENDÁRIO DE TREINOS</p>
        </div>

        <div className="calendar-grid">
          {weekdays.map((day, idx) => (
            <div 
              key={idx} 
              className={`calendar-day-card ${routine[idx] ? 'has-workout' : ''}`}
              onClick={() => handleDayClick(idx)}
            >
              <div className="day-header">
                <span className="day-name">{day}</span>
                <span className="day-date">
                  {weekDates[idx].toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="day-workout">
                {routine[idx] ? (
                  <>
                    <span className="workout-badge">{getWorkoutName(routine[idx])}</span>
                    <button className="edit-btn" onClick={(e) => { e.stopPropagation(); handleDayClick(idx); }}>✎</button>
                  </>
                ) : (
                  <button className="assign-btn">+ Atribuir treino</button>
                )}
              </div>
              <div className="card-corner"></div>
            </div>
          ))}
        </div>

        <div className="legend">
          <div className="legend-item">
            <div className="legend-color filled"></div>
            <span>Treino atribuído</span>
          </div>
          <div className="legend-item">
            <div className="legend-color empty"></div>
            <span>Sem treino</span>
          </div>
        </div>
      </div>

      {/* Modal de seleção de treino */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="industrial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Selecionar treino</h2>
              <button className="close-modal" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <button 
                className="workout-option" 
                onClick={() => assignWorkout('')}
              >
                <span>— Nenhum —</span>
              </button>
              {data.workoutTemplates?.map(workout => (
                <button 
                  key={workout.id} 
                  className="workout-option"
                  onClick={() => assignWorkout(workout.id)}
                >
                  <span>{workout.name}</span>
                  <span className="workout-exercises">{workout.exercises.length} exercícios</span>
                </button>
              ))}
            </div>
            <div className="modal-footer">
              <button className="industrial-btn small" onClick={() => setModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}