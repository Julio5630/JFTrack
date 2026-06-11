import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import Icon from '../components/Icon';
import './History.css';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWorkoutVolume = (workout) => (
  (workout.exercises || []).reduce((total, exercise) => (
    total + (exercise.sets || []).reduce((setsTotal, set) => (
      setsTotal + ((Number(set.weight) || 0) * (Number(set.reps) || 0))
    ), 0)
  ), 0)
);

const getWorkoutSets = (workout) => (
  (workout.exercises || []).reduce((total, exercise) => total + (exercise.sets || []).filter((set) => !Number(set.durationSeconds)).length, 0)
);

const getWorkoutCardioMinutes = (workout) => Math.round(
  (workout.exercises || []).reduce((total, exercise) => total + (exercise.sets || []).reduce(
    (setTotal, set) => setTotal + (Number(set.durationSeconds) || 0), 0
  ), 0) / 60
);

export default function History() {
  const { data } = useData();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const view = useMemo(() => {
    if (!data) return null;

    const history = data.workoutHistory || [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthLabel = `${monthNames[month]} ${year}`;
    const workoutsByDate = history.reduce((grouped, workout) => {
      grouped[workout.date] = [...(grouped[workout.date] || []), workout];
      return grouped;
    }, {});

    const records = {};
    history.forEach((workout) => {
      (workout.exercises || []).forEach((exercise) => {
        (exercise.sets || []).forEach((set) => {
          if (Number(set.durationSeconds) > 0) return;
          const volume = (Number(set.weight) || 0) * (Number(set.reps) || 0);
          const key = exercise.exerciseId || exercise.exerciseName;
          if (!records[key] || volume > records[key].volume) {
            records[key] = { volume, date: workout.date };
          }
        });
      });
    });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = new Date(year, month, 1).getDay();
    const cells = Array.from({ length: startWeekday }, (_, index) => ({ blank: true, key: `blank-${index}` }));

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = toDateKey(date);
      const workouts = workoutsByDate[dateKey] || [];
      const hasRecord = workouts.some((workout) => (
        (workout.exercises || []).some((exercise) => (
          (exercise.sets || []).some((set) => {
            if (Number(set.durationSeconds) > 0) return false;
            const key = exercise.exerciseId || exercise.exerciseName;
            const volume = (Number(set.weight) || 0) * (Number(set.reps) || 0);
            return records[key]?.date === workout.date && records[key]?.volume === volume;
          })
        ))
      ));

      cells.push({ key: dateKey, date, dateKey, workouts, hasRecord });
    }

    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthWorkouts = history.filter((workout) => workout.date?.startsWith(monthPrefix));
    const monthVolume = monthWorkouts.reduce((total, workout) => total + getWorkoutVolume(workout), 0);
    const trainedDates = [...new Set(history.map((workout) => workout.date).filter(Boolean))].sort().reverse();
    let streak = 0;
    const streakCursor = new Date();
    streakCursor.setHours(0, 0, 0, 0);

    if (!trainedDates.includes(toDateKey(streakCursor))) {
      streakCursor.setDate(streakCursor.getDate() - 1);
    }

    while (trainedDates.includes(toDateKey(streakCursor))) {
      streak += 1;
      streakCursor.setDate(streakCursor.getDate() - 1);
    }
    const recentWorkouts = [...history]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return { cells, monthLabel, monthWorkouts, monthVolume, streak, recentWorkouts, records };
  }, [currentDate, data]);

  if (!view) return <div className="history-loading">Carregando histórico...</div>;

  const changeMonth = (offset) => {
    setCurrentDate((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
    setSelectedDay(null);
  };

  const openWorkout = (workout) => {
    const date = new Date(`${workout.date}T12:00:00`);
    setSelectedDay({ date, dateKey: workout.date, workouts: [workout] });
  };

  return (
    <main className="history-page">
      <div className="history-shell">
        <header className="history-heading">
          <div>
            <span className="history-eyebrow">Sua jornada</span>
            <h1>Histórico de treinos</h1>
            <p>Acompanhe sua constância e relembre cada etapa da sua evolução.</p>
          </div>
          <div className="history-heading-icon"><Icon name="history" size={25} /></div>
        </header>

        <section className="history-summary" aria-label="Resumo do mês">
          <article className="history-summary-card">
            <span className="history-summary-icon"><Icon name="dumbbell" size={19} /></span>
            <div><strong>{view.monthWorkouts.length}</strong><span>Treinos no mês</span></div>
          </article>
          <article className="history-summary-card">
            <span className="history-summary-icon coral"><Icon name="flame" size={19} /></span>
            <div><strong>{view.streak} dia{view.streak === 1 ? '' : 's'}</strong><span>Sequência atual</span></div>
          </article>
          <article className="history-summary-card">
            <span className="history-summary-icon lime"><Icon name="chart" size={19} /></span>
            <div><strong>{view.monthVolume.toLocaleString('pt-BR')} kg</strong><span>Volume total</span></div>
          </article>
        </section>

        <div className="history-main-grid">
          <section className="history-card history-calendar-card">
            <div className="history-card-title">
              <div>
                <span>Calendário de atividades</span>
                <h2 key={view.monthLabel}>{view.monthLabel}</h2>
              </div>
              <div className="history-month-actions">
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior"><Icon name="chevronLeft" size={19} /></button>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Próximo mês"><Icon name="chevronRight" size={19} /></button>
              </div>
            </div>

            <div className="history-weekdays">
              {weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="history-calendar-grid">
              {view.cells.map((cell) => cell.blank ? (
                <span className="history-day blank" key={cell.key}></span>
              ) : (
                <button
                  key={cell.key}
                  className={`history-day ${cell.workouts.length ? 'trained' : ''} ${cell.hasRecord ? 'record' : ''}`}
                  onClick={() => setSelectedDay(cell)}
                  aria-label={`${cell.date.getDate()} de ${monthNames[currentDate.getMonth()]}`}
                >
                  <span>{cell.date.getDate()}</span>
                  {cell.workouts.length > 0 && <i>{cell.workouts.length}</i>}
                  {cell.hasRecord && <b><Icon name="trophy" size={11} /></b>}
                </button>
              ))}
            </div>
            <div className="history-legend">
              <span><i className="trained"></i> Treino realizado</span>
              <span><i className="record"></i> Recorde pessoal</span>
            </div>
          </section>

          <section className="history-card history-recent-card">
            <div className="history-card-title compact">
              <div><span>Últimas atividades</span><h2>Treinos recentes</h2></div>
            </div>
            {view.recentWorkouts.length === 0 ? (
              <div className="history-empty">
                <span><Icon name="dumbbell" size={22} /></span>
                <h3>Nenhum treino registrado</h3>
                <p>Seus treinos concluídos aparecerão aqui.</p>
              </div>
            ) : (
              <div className="history-recent-list">
                {view.recentWorkouts.map((workout, index) => (
                  <button key={`${workout.id || workout.date}-${index}`} onClick={() => openWorkout(workout)} className="history-workout-row">
                    <span className="history-workout-badge"><Icon name="dumbbell" size={17} /></span>
                    <div>
                      <strong>{workout.name || 'Treino concluído'}</strong>
                      <span>{new Date(`${workout.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {(workout.exercises || []).length} exercícios</span>
                    </div>
                    <Icon name="chevronRight" size={17} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedDay && (
          <motion.div className="history-modal-overlay" onClick={() => setSelectedDay(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.section className="history-modal" onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.2 }}>
              <header>
                <div>
                  <span>Detalhes do dia</span>
                  <h2>{selectedDay.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                </div>
                <button onClick={() => setSelectedDay(null)} aria-label="Fechar"><Icon name="close" size={19} /></button>
              </header>

              <div className="history-modal-content">
                {selectedDay.workouts.length === 0 ? (
                  <div className="history-empty modal-empty"><p>Nenhum treino registrado neste dia.</p></div>
                ) : selectedDay.workouts.map((workout, workoutIndex) => (
                  <article className="history-workout-detail" key={`${workout.id || workout.date}-${workoutIndex}`}>
                    <div className="history-detail-heading">
                      <div><h3>{workout.name || 'Treino concluído'}</h3><span>{workout.source_type === 'academy' ? (workout.gym_name || 'Academia') : 'Treino próprio'}</span></div>
                      <strong>{getWorkoutVolume(workout).toLocaleString('pt-BR')} kg</strong>
                    </div>
                    <div className="history-detail-stats">
                      <span>{(workout.exercises || []).length} exercícios</span>
                      {getWorkoutSets(workout) > 0 && <span>{getWorkoutSets(workout)} séries</span>}
                      {getWorkoutCardioMinutes(workout) > 0 && <span>{getWorkoutCardioMinutes(workout)} min de cardio</span>}
                    </div>
                    <div className="history-exercise-list">
                      {(workout.exercises || []).map((exercise, exerciseIndex) => {
                        const exerciseKey = exercise.exerciseId || exercise.exerciseName;
                        const isRecord = (exercise.sets || []).some((set) => {
                          if (Number(set.durationSeconds) > 0) return false;
                          const volume = (Number(set.weight) || 0) * (Number(set.reps) || 0);
                          return view.records[exerciseKey]?.date === workout.date && view.records[exerciseKey]?.volume === volume;
                        });
                        return (
                          <div className="history-exercise" key={`${exerciseKey}-${exerciseIndex}`}>
                            <div><strong>{exercise.exerciseName || data.exercises?.find((item) => item.id === exercise.exerciseId)?.name || 'Exercício'}</strong>{isRecord && <span><Icon name="trophy" size={12} /> Recorde</span>}</div>
                            <p>{(exercise.sets || []).map((set) => Number(set.durationSeconds) > 0
                              ? `${Math.round(Number(set.durationSeconds) / 60)} minutos`
                              : `${set.weight || 0}kg x ${set.reps || 0}`).join(' · ')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
