import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import './Dashboard.css';

export default function Dashboard() {
  const { user, isAcademyStudent } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();

  if (!data) return <div className="dashboard-loading">Carregando...</div>;

  const availableWorkouts = data.workoutTemplates?.length || 0;
  const lastWorkout = data.workoutHistory?.[0];

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const workoutsThisWeek = data.workoutHistory?.filter(w => new Date(w.date) >= weekAgo).length || 0;

  let totalVolume = 0;
  data.workoutHistory?.forEach(workout => {
    if (new Date(workout.date) >= weekAgo) {
      workout.exercises?.forEach(ex => {
        ex.sets?.forEach(set => {
          totalVolume += (set.weight || 0) * (set.reps || 0);
        });
      });
    }
  });

  return (
    <div className="dashboard-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-dash-1"></div>
      <div className="gear gear-dash-2"></div>
      <div className="gear gear-dash-3"></div>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>PAINEL DE CONTROLE</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">OPERADOR: {user?.name?.toUpperCase() || 'USER'}</p>
        </div>

        <div className="cards-grid">
          <div className="industrial-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon"><Icon name="flame" size={28} /></span>
              <h2>{isAcademyStudent ? 'TREINOS RECEBIDOS' : 'MEUS TREINOS'}</h2>
            </div>
            <div className="card-body">
              {availableWorkouts > 0 ? (
                <>
                  <div className="workout-name">{availableWorkouts} treino{availableWorkouts === 1 ? '' : 's'} disponive{availableWorkouts === 1 ? 'l' : 'is'}</div>
                  <div className="workout-stats">
                    Escolha um treino para executar
                  </div>
                  <button
                    className="industrial-btn"
                    onClick={() => navigate(isAcademyStudent ? '/student/workouts' : '/my-workouts')}
                  >
                    {isAcademyStudent ? 'VER TREINOS' : 'ABRIR MEUS TREINOS'}
                  </button>
                </>
              ) : (
                <div className="no-workout">
                  {isAcademyStudent ? 'Nenhum treino recebido ainda' : 'Nenhum treino criado ainda'}
                  <button
                    className="industrial-btn small"
                    onClick={() => navigate(isAcademyStudent ? '/student/workouts' : '/my-workouts')}
                  >
                    {isAcademyStudent ? 'VER TREINOS' : 'MEUS TREINOS'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="industrial-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon"><Icon name="calendar" size={28} /></span>
              <h2>ULTIMO TREINO</h2>
            </div>
            <div className="card-body">
              {lastWorkout ? (
                <>
                  <div className="workout-name">{lastWorkout.name}</div>
                  <div className="workout-date">{lastWorkout.date}</div>
                  <div className="workout-stats">
                    {lastWorkout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0)} series
                  </div>
                  <button
                    className="industrial-btn small"
                    onClick={() => navigate('/history')}
                  >
                    VER DETALHES
                  </button>
                </>
              ) : (
                <div className="no-workout">
                  Nenhum treino registrado ainda
                </div>
              )}
            </div>
          </div>

          <div className="industrial-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon"><Icon name="chart" size={28} /></span>
              <h2>RESUMO SEMANAL</h2>
            </div>
            <div className="card-body">
              <div className="stat-row">
                <span>Treinos:</span>
                <span className="stat-value">{workoutsThisWeek}/7</span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-fill"
                  style={{ width: `${(workoutsThisWeek / 7) * 100}%` }}
                ></div>
              </div>
              <div className="stat-row">
                <span>Volume total:</span>
                <span className="stat-value">{totalVolume.toLocaleString()} kg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="quick-access">
          <div className="industrial-card horizontal">
            <div className="card-header">
              <span className="card-icon"><Icon name="bolt" size={28} /></span>
              <h2>ACESSO RAPIDO</h2>
            </div>
            <div className="quick-buttons">
              {isAcademyStudent ? (
                <>
                  <button onClick={() => navigate('/student/workouts')} className="industrial-btn">TREINOS</button>
                  <button onClick={() => navigate('/history')} className="industrial-btn">HISTORICO</button>
                  <button onClick={() => navigate('/student/assessment')} className="industrial-btn">AVALIACAO FISICA</button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/my-workouts')} className="industrial-btn">MEUS TREINOS</button>
                  <button onClick={() => navigate('/history')} className="industrial-btn">HISTORICO</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
