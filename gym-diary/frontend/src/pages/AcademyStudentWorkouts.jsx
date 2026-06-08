import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import './AcademyStudentWorkouts.css';

export default function AcademyStudentWorkouts() {
  const { data, updatePartial } = useData();
  const { selectedGymId, selectedGymMembership } = useAuth();
  const navigate = useNavigate();

  if (!data) return <div className="academy-workouts-loading">Carregando...</div>;

  const startWorkout = (template) => {
    const workoutExercises = (template.exercises || []).map(exItem => {
      const exercise = data.exercises?.find(item => item.id === exItem.id);
      const defaultSets = exItem.defaultSets || 3;
      const suggestedReps = parseInt(String(exItem.defaultReps || '').match(/\d+/)?.[0], 10) || 8;
      return {
        exerciseId: exItem.id,
        exerciseName: exercise ? exercise.name : 'Exercicio',
        gifUrl: exercise?.gifUrl || exercise?.gif_url || '',
        sets: Array(defaultSets).fill().map(() => ({ reps: suggestedReps, weight: 0, completed: false })),
      };
    });

    updatePartial({
      currentWorkout: {
        id: Date.now(),
        templateId: template.id,
        assignmentId: template.assignmentId,
        gymId: selectedGymId,
        sourceType: 'academy',
        scopeKey: `academy:${selectedGymId}`,
        name: template.name,
        exercises: workoutExercises,
      }
    });
    navigate('/execution');
  };

  const gymName = selectedGymMembership?.gym?.name || '';

  return (
    <div className="academy-workouts-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-dash-1"></div>
      <div className="gear gear-dash-2"></div>

      <div className="academy-workouts-content">
        <div className="dashboard-header">
          <h1>TREINOS</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">{gymName || 'TREINOS DA ACADEMIA'}</p>
        </div>

        <div className="assigned-workouts-grid">
          {data.workoutTemplates?.length === 0 ? (
            <div className="assigned-empty">
              Nenhum treino foi disponibilizado pelo personal ainda.
            </div>
          ) : data.workoutTemplates.map(template => (
            <article key={template.id} className="assigned-workout-card">
              <div className="card-corner"></div>
              <div>
                <span className="trainer-label">{template.trainerName || template.trainer_name || 'Personal'}</span>
                <h2>{template.name}</h2>
                <p>{template.exercises?.length || 0} exercicios cadastrados</p>
              </div>
              <button className="industrial-btn" onClick={() => startWorkout(template)}>
                <Icon name="dumbbell" size={18} /> INICIAR TREINO
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
