import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Icon from '../components/Icon';
import './AcademyStudentWorkouts.css';

export default function AcademyStudentWorkouts() {
  const { data, updatePartial } = useData();
  const { selectedGymId, selectedGymMembership } = useAuth();
  const { notify } = useAlert();
  const navigate = useNavigate();

  if (!data) return <div className="academy-workouts-loading">Carregando...</div>;

  const today = new Date().toLocaleDateString('en-CA');
  const scopeKey = `academy:${selectedGymId}`;
  const getTemplateStatus = (template) => {
    const completedToday = (data.workoutHistory || []).some(workout => (
      workout.date === today
      && (Number(workout.template_id || workout.templateId) === Number(template.id)
        || (!(workout.template_id || workout.templateId) && workout.name === template.name))
      && Number(workout.gym_id || workout.gymId) === Number(selectedGymId)
    ));
    if (completedToday) return 'completed';
    if (data.currentWorkout?.scopeKey === scopeKey && Number(data.currentWorkout.templateId) === Number(template.id)) return 'progress';
    return '';
  };

  const startWorkout = (template) => {
    if (data.currentWorkout?.scopeKey === scopeKey && Number(data.currentWorkout.templateId) === Number(template.id)) {
      navigate('/execution');
      return;
    }

    const workoutExercises = (template.exercises || []).map(exItem => {
      const exercise = data.exercises?.find(item => Number(item.id) === Number(exItem.id));
      const defaultSets = Math.max(1, Number(exItem.defaultSets) || 3);
      const suggestedReps = parseInt(String(exItem.defaultReps || '').match(/\d+/)?.[0], 10) || 8;
      const category = exercise?.category || exItem.category || '';
      const isCardio = category === 'Cardio' || Number(exItem.durationMinutes) > 0;
      return {
        exerciseId: exItem.id,
        exerciseName: exercise?.name || exItem.name || 'Exercicio',
        exerciseCategory: category,
        videoUrl: exercise?.videoUrl || exercise?.video_url || exItem.videoUrl || exItem.video_url || '',
        sets: isCardio
          ? [{ reps: 0, weight: 0, durationSeconds: (Number(exItem.durationMinutes) || 20) * 60, completed: false }]
          : Array(defaultSets).fill().map(() => ({ reps: suggestedReps, weight: 0, durationSeconds: 0, completed: false })),
      };
    }).filter((exercise) => exercise.sets.length > 0);

    if (workoutExercises.length === 0) {
      notify('Este treino nao possui exercicios validos para execucao.');
      return;
    }

    updatePartial({
      currentWorkout: {
        id: Date.now(),
        templateId: template.id,
        assignmentId: template.assignmentId,
        gymId: selectedGymId,
        sourceType: 'academy',
        scopeKey,
        startedAt: Date.now(),
        activeExerciseIndex: 0,
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
          ) : data.workoutTemplates.map(template => {
            const status = getTemplateStatus(template);
            return (
            <article key={template.id} className={`assigned-workout-card ${status ? `is-${status}` : ''}`}>
              <div>
                <span className="trainer-label">{template.trainerName || template.trainer_name || 'Personal'}</span>
                <h2>{template.name}</h2>
                {status && <span className={`academy-workout-status ${status}`}><Icon name={status === 'completed' ? 'check' : 'history'} size={14} /> {status === 'completed' ? 'Concluído hoje' : 'Em andamento'}</span>}
                <p>{template.exercises?.length || 0} exercícios cadastrados</p>
              </div>
              <button className="industrial-btn" onClick={() => startWorkout(template)}>
                <Icon name={status === 'progress' ? 'chevronRight' : 'dumbbell'} size={18} /> {status === 'progress' ? 'Continuar treino' : 'Iniciar treino'}
              </button>
            </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
