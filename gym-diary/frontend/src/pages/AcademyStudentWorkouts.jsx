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
      <div className="academy-workouts-content">
        <header className="academy-workouts-heading">
          <div>
            <span>Programa da academia</span>
            <h1>Seus treinos</h1>
            <p>Treinos prescritos pelos profissionais da {gymName || 'sua academia'}.</p>
          </div>
          <span className="academy-heading-icon"><Icon name="gymLogo" size={25} /></span>
        </header>

        <section className="academy-workout-summary">
          <span><Icon name="dumbbell" size={21} /></span>
          <div><strong>{data.workoutTemplates?.length || 0} treino{data.workoutTemplates?.length === 1 ? '' : 's'} disponível{data.workoutTemplates?.length === 1 ? '' : 'is'}</strong><p>Escolha um treino para começar sua sessão.</p></div>
        </section>

        <div className="assigned-workouts-grid">
          {data.workoutTemplates?.length === 0 ? (
            <div className="assigned-empty">
              <span><Icon name="dumbbell" size={24} /></span>
              <h2>Nenhum treino disponível</h2>
              <p>Assim que um profissional liberar um treino, ele aparecerá aqui.</p>
            </div>
          ) : data.workoutTemplates.map(template => (
            <article key={template.id} className="assigned-workout-card">
              <div>
                <span className="trainer-label">{template.trainerName || template.trainer_name || 'Personal'}</span>
                <h2>{template.name}</h2>
                <p>{template.exercises?.length || 0} exercícios cadastrados</p>
              </div>
              <button className="industrial-btn" onClick={() => startWorkout(template)}>
                <Icon name="dumbbell" size={18} /> Iniciar treino
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
