// src/pages/Dashboard.jsx
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { data } = useData();
  const navigate = useNavigate();

  if (!data) return <div className="dashboard-loading">Carregando...</div>;

  const today = new Date().getDay();
  const todayWorkoutId = data.weeklyRoutine?.[today];
  const todayWorkout = data.workoutTemplates?.find(w => w.id === todayWorkoutId);
  const lastWorkout = data.workoutHistory?.[0];
  
  // Cálculo de frequência semanal (últimos 7 dias)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const workoutsThisWeek = data.workoutHistory?.filter(w => new Date(w.date) >= weekAgo).length || 0;
  
  // Volume total aproximado (soma de peso * reps de todos os treinos da semana)
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
      {/* Elementos de fundo industrial */}
      <div className="industrial-bg"></div>
      <div className="gear gear-dash-1"></div>
      <div className="gear gear-dash-2"></div>
      <div className="gear gear-dash-3"></div>
      
      <div className="dashboard-content">
        {/* Cabeçalho com saudação industrial */}
        <div className="dashboard-header">
          <h1>PAINEL DE CONTROLE</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">OPERADOR: {user?.name?.toUpperCase() || 'USER'}</p>
        </div>

        {/* Cards principais */}
        <div className="cards-grid">
          {/* Card: Treino de hoje */}
          <div className="industrial-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon">🔥</span>
              <h2>TREINO DE HOJE</h2>
            </div>
            <div className="card-body">
              {todayWorkout ? (
                <>
                  <div className="workout-name">{todayWorkout.name}</div>
                  <div className="workout-stats">
                    {todayWorkout.exercises?.length || 0} exercícios
                  </div>
                  <button 
                    className="industrial-btn"
                    onClick={() => navigate('/execution')}
                  >
                    INICIAR TREINO
                  </button>
                </>
              ) : (
                <div className="no-workout">
                  Nenhum treino programado para hoje
                  <button 
                    className="industrial-btn small"
                    onClick={() => navigate('/routines')}
                  >
                    CONFIGURAR ROTINA
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card: Último treino */}
          <div className="industrial-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon">📆</span>
              <h2>ÚLTIMO TREINO</h2>
            </div>
            <div className="card-body">
              {lastWorkout ? (
                <>
                  <div className="workout-name">{lastWorkout.name}</div>
                  <div className="workout-date">{lastWorkout.date}</div>
                  <div className="workout-stats">
                    {lastWorkout.exercises?.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0)} séries
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

          {/* Card: Resumo semanal */}
          <div className="industrial-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon">📊</span>
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

        {/* Acesso rápido */}
        <div className="quick-access">
          <div className="industrial-card horizontal">
            <div className="card-header">
              <span className="card-icon">⚡</span>
              <h2>ACESSO RÁPIDO</h2>
            </div>
            <div className="quick-buttons">
              <button onClick={() => navigate('/execution')} className="industrial-btn">EXECUÇÃO</button>
              <button onClick={() => navigate('/create')} className="industrial-btn">CRIAR TREINO</button>
              <button onClick={() => navigate('/library')} className="industrial-btn">BIBLIOTECA</button>
              <button onClick={() => navigate('/progress')} className="industrial-btn">PROGRESSO</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}