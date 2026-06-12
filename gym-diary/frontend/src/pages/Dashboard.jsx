import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import './Dashboard.css';

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const { user, isAcademyStudent, selectedGymMembership } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();

  const dashboardData = useMemo(() => {
    if (!data) return null;

    const history = data.workoutHistory || [];
    const templates = data.workoutTemplates || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedHistory = history.map((workout) => {
      const date = new Date(workout.date);
      date.setHours(0, 0, 0, 0);

      const volume = (workout.exercises || []).reduce((workoutAcc, exercise) => (
        workoutAcc + (exercise.sets || []).reduce((setAcc, set) => (
          setAcc + ((set.weight || 0) * (set.reps || 0))
        ), 0)
      ), 0);

      return {
        ...workout,
        parsedDate: date,
        volume
      };
    });

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });

    const weeklySeries = weekDays.map((date) => {
      const key = toLocalDateKey(date);
      const workouts = normalizedHistory.filter((item) => item.date === key);
      const volume = workouts.reduce((acc, item) => acc + item.volume, 0);
      return {
        key,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 1).toUpperCase(),
        workouts: workouts.length,
        volume,
        accent: key === toLocalDateKey(today)
      };
    });

    const workoutsThisWeek = weeklySeries.reduce((acc, item) => acc + item.workouts, 0);
    const totalVolume = weeklySeries.reduce((acc, item) => acc + item.volume, 0);
    const maxVolume = Math.max(...weeklySeries.map((item) => item.volume), 1);

    const weeklyChart = weeklySeries.map((item) => ({
      ...item,
      height: item.volume > 0 ? Math.max(18, Math.round((item.volume / maxVolume) * 100)) : 10
    }));

    const uniqueDays = [...new Set(normalizedHistory.map((item) => item.date))].sort().reverse();
    let streak = 0;
    const cursor = new Date(today);
    for (const day of uniqueDays) {
      const currentKey = cursor.toISOString().slice(0, 10);
      if (day !== currentKey) {
        if (streak === 0) {
          cursor.setDate(cursor.getDate() - 1);
          if (day !== cursor.toISOString().slice(0, 10)) break;
        } else {
          break;
        }
      }
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const recordsMap = {};
    normalizedHistory.forEach((workout) => {
      (workout.exercises || []).forEach((exercise) => {
        (exercise.sets || []).forEach((set) => {
          const volume = (set.weight || 0) * (set.reps || 0);
          const current = recordsMap[exercise.exerciseId];
          if (!current || volume > current.volume) {
            recordsMap[exercise.exerciseId] = {
              name: exercise.exerciseName || 'Exercicio',
              weight: set.weight || 0,
              reps: set.reps || 0,
              volume,
              date: workout.date
            };
          }
        });
      });
    });

    const personalRecords = Object.values(recordsMap)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 2);

    const templateUsage = normalizedHistory.reduce((acc, workout) => {
      const key = workout.templateId || workout.name;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const maxUsage = Math.max(...Object.values(templateUsage), 1);

    const workoutCards = templates.slice(0, 3).map((template, index) => {
      const usageKey = template.id || template.name;
      const usage = templateUsage[usageKey] || 0;
      return {
        ...template,
        progress: usage > 0 ? Math.max(12, Math.round((usage / maxUsage) * 100)) : 0,
        tone: ['emerald', 'coral', 'lime'][index % 3]
      };
    });

    return {
      workoutsThisWeek,
      totalVolume,
      weeklyChart,
      streak,
      personalRecords,
      workoutCards,
      lastWorkout: normalizedHistory[0] || null
    };
  }, [data]);

  if (!dashboardData) return <div className="dashboard-loading">Carregando...</div>;

  const availableWorkouts = data.workoutTemplates?.length || 0;
  const gymName = selectedGymMembership?.gym?.name;
  const greetingLabel = isAcademyStudent
    ? `Aluno vinculado${gymName ? ` | ${gymName}` : ''}`
    : 'Aluno | Treino proprio';

  const primaryActionTarget = isAcademyStudent ? '/student/workouts' : '/my-workouts';

  return (
    <div className={`dashboard-container ${isAcademyStudent ? 'academy-student-theme' : ''}`}>
      <div className="dashboard-shell">
        <section className="student-hero-card">
          <div className="student-hero-copy">
            <span className="student-context-pill">{greetingLabel}</span>
            <h1>Pronto para o treino de hoje, {user?.name?.split(' ')[0] || 'Aluno'}?</h1>
            <p>
              {availableWorkouts > 0
                ? `${availableWorkouts} treino${availableWorkouts === 1 ? '' : 's'} disponive${availableWorkouts === 1 ? 'l' : 'is'} para voce continuar evoluindo.`
                : 'Vamos organizar sua rotina e deixar o proximo treino pronto para executar.'}
            </p>
          </div>
          <div className="student-hero-glow" aria-hidden="true"></div>
        </section>

        <section className="dashboard-summary-grid">
          <article className="student-card volume-card">
            <div className="section-heading">
              <h2><Icon name="chart" size={18} /> Volume semanal</h2>
              <span>{dashboardData.workoutsThisWeek} treino{dashboardData.workoutsThisWeek === 1 ? '' : 's'} na semana</span>
            </div>
            <div className="weekly-volume-chart">
              {dashboardData.weeklyChart.map((day) => (
                <div key={day.key} className="volume-bar-column">
                  <div className="volume-bar-track">
                    <div
                      className={`volume-bar ${day.accent ? 'accent' : ''}`}
                      style={{ height: `${day.height}%` }}
                      title={`${day.volume.toLocaleString('pt-BR')} kg`}
                    ></div>
                  </div>
                  <span>{day.label}</span>
                </div>
              ))}
            </div>
            <div className="metric-footer">
              <strong>{dashboardData.totalVolume.toLocaleString('pt-BR')} kg</strong>
              <span>Volume acumulado na semana atual</span>
            </div>
          </article>

          <article className="student-card records-card">
            <div className="section-heading">
              <h2><Icon name="trophy" size={18} /> Recordes pessoais</h2>
            </div>
            {dashboardData.personalRecords.length === 0 ? (
              <p className="empty-panel">Conclua alguns treinos para acompanhar seus melhores resultados.</p>
            ) : (
              <div className="record-list">
                {dashboardData.personalRecords.map((record) => (
                  <div key={`${record.name}-${record.date}`} className="record-row">
                    <div>
                      <strong>{record.name}</strong>
                      <span>{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <em>{record.weight}kg x {record.reps}</em>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="workouts-section">
          <div className="section-title-line">
            <div>
              <h2>{isAcademyStudent ? 'Treinos disponiveis' : 'Meus treinos'}</h2>
              <p>{isAcademyStudent ? 'Recebidos da academia para execucao.' : 'Sua biblioteca principal para criar, editar e iniciar treinos.'}</p>
            </div>
            <button className="inline-link-btn" onClick={() => navigate(primaryActionTarget)}>
              Ver todos <Icon name="chevronRight" size={16} />
            </button>
          </div>

          <div className="student-workout-list">
            {dashboardData.workoutCards.length === 0 ? (
              <button className="student-card empty-workout-card" onClick={() => navigate(primaryActionTarget)}>
                <div className="empty-workout-copy">
                  <h3>{isAcademyStudent ? 'Nenhum treino recebido ainda' : 'Nenhum treino criado ainda'}</h3>
                  <p>{isAcademyStudent ? 'Assim que um personal liberar um treino, ele aparece aqui.' : 'Crie seu primeiro treino e deixe sua rotina pronta para os proximos dias.'}</p>
                </div>
                <Icon name="chevronRight" size={20} />
              </button>
            ) : dashboardData.workoutCards.map((template) => (
              <button
                key={template.id}
                className={`student-workout-card tone-${template.tone}`}
                onClick={() => navigate(primaryActionTarget)}
              >
                <div className="workout-badge">
                  <Icon name="dumbbell" size={18} />
                </div>
                <div className="workout-main">
                  <h3>{template.name}</h3>
                  <div className="workout-meta">
                    <span>{template.exercises?.length || 0} exercicios</span>
                    <span>{template.trainerName || template.trainer_name || template.creatorName || (isAcademyStudent ? 'Personal da academia' : 'Treino proprio')}</span>
                  </div>
                </div>
                <div className="workout-progress">
                  <p>Evolucao</p>
                  <div className="micro-progress-track">
                    <div style={{ width: `${template.progress}%` }}></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="student-stat-strip">
          <article className="student-card mini-stat-card">
            <Icon name="flame" size={22} />
            <div>
              <strong>{dashboardData.streak} dia{dashboardData.streak === 1 ? '' : 's'}</strong>
              <span>Sequencia atual</span>
            </div>
          </article>

          <article className="student-card mini-stat-card">
            <Icon name="calendar" size={22} />
            <div>
              <strong>{dashboardData.lastWorkout ? new Date(dashboardData.lastWorkout.date).toLocaleDateString('pt-BR') : '--'}</strong>
              <span>Ultimo treino concluido</span>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
