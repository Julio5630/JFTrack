import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './WorkoutExecution.css';

const getYouTubeEmbedUrl = (url = '') => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    let videoId = '';
    if (parsed.hostname.includes('youtu.be')) videoId = parsed.pathname.slice(1);
    if (parsed.hostname.includes('youtube.com')) videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  } catch {
    return '';
  }
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

export default function WorkoutExecution() {
  const { data, updatePartial, refreshData } = useData();
  const { isAcademyStudent } = useAuth();
  const { notify, confirm } = useAlert();
  const navigate = useNavigate();
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.currentWorkout) {
      setCurrentWorkout(data.currentWorkout);
      const exercises = Array.isArray(data.currentWorkout.exercises) ? data.currentWorkout.exercises : [];
      const firstIncomplete = exercises.findIndex((exercise) => Array.isArray(exercise.sets) && exercise.sets.some((set) => !set.completed));
      const savedIndex = Number.isInteger(data.currentWorkout.activeExerciseIndex)
        ? data.currentWorkout.activeExerciseIndex
        : Math.max(0, firstIncomplete);
      setActiveExerciseIndex(Math.min(savedIndex, Math.max(0, exercises.length - 1)));
      setElapsedSeconds(data.currentWorkout.startedAt
        ? Math.max(0, Math.floor((Date.now() - data.currentWorkout.startedAt) / 1000))
        : 0);
    }
  }, [data]);

  useEffect(() => {
    if (!currentWorkout) return undefined;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [Boolean(currentWorkout)]);

  const updateWorkout = (updater) => {
    setCurrentWorkout((previous) => {
      const next = updater(previous);
      updatePartial({ currentWorkout: next });
      return next;
    });
  };

  const selectExercise = (index) => {
    const boundedIndex = Math.max(0, Math.min(index, (currentWorkout.exercises || []).length - 1));
    setActiveExerciseIndex(boundedIndex);
    updateWorkout(workout => ({ ...workout, activeExerciseIndex: boundedIndex }));
  };

  useEffect(() => {
    if (!currentWorkout || currentWorkout.activeExerciseIndex === activeExerciseIndex) return;
    const nextWorkout = { ...currentWorkout, activeExerciseIndex };
    setCurrentWorkout(nextWorkout);
    updatePartial({ currentWorkout: nextWorkout });
  }, [activeExerciseIndex, currentWorkout, updatePartial]);

  const updateSet = (exerciseIndex, setIndex, changes) => {
    updateWorkout((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index !== exerciseIndex ? exercise : ({
        ...exercise,
        sets: exercise.sets.map((set, currentSetIndex) => currentSetIndex === setIndex ? { ...set, ...changes } : set)
      }))
    }));
  };

  const addSet = () => {
    if (currentWorkout.exercises[activeExerciseIndex]?.exerciseCategory === 'Cardio') return;
    updateWorkout((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index !== activeExerciseIndex ? exercise : ({
        ...exercise,
        sets: [...exercise.sets, { reps: 8, weight: 0, durationSeconds: 0, completed: false }]
      }))
    }));
  };

  const removeSet = (setIndex) => {
    updateWorkout((workout) => ({
      ...workout,
      exercises: workout.exercises.map((exercise, index) => index !== activeExerciseIndex ? exercise : ({
        ...exercise,
        sets: exercise.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex)
      }))
    }));
  };

  const finishWorkout = async (workoutToFinish = currentWorkout) => {
    if (!workoutToFinish || saving) return;
    setSaving(true);
    const historyEntry = {
      name: workoutToFinish.name,
      template_id: workoutToFinish.templateId || null,
      assignment_id: workoutToFinish.assignmentId || null,
      gym_id: workoutToFinish.gymId || null,
      source_type: workoutToFinish.sourceType || (isAcademyStudent ? 'academy' : 'own'),
      date: new Date().toLocaleDateString('en-CA'),
      exercises: workoutToFinish.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        sets: exercise.sets.map((set) => ({
          reps: set.reps,
          weight: set.weight,
          durationSeconds: set.durationSeconds || 0,
          completed: set.completed
        }))
      }))
    };

    try {
      const result = await api.saveWorkout(historyEntry);
      updatePartial({ currentWorkout: null });
      await refreshData();
      if (result?.offlinePending) notify('Treino concluído e salvo no aparelho. Ele será sincronizado quando a internet voltar.');
      navigate('/history');
    } catch (error) {
      notify(error.message || 'Erro ao finalizar treino');
    } finally {
      setSaving(false);
    }
  };

  const leaveWorkout = async () => {
    if (!await confirm({ title: 'Sair do treino?', message: 'Seu progresso ficará salvo para você continuar depois.', confirmLabel: 'Sair e salvar', tone: 'success' })) return;
    navigate(isAcademyStudent ? '/student/workouts' : '/my-workouts');
  };

  const stats = useMemo(() => {
    if (!currentWorkout) return { total: 0, completed: 0, percent: 0 };
    const exercises = Array.isArray(currentWorkout.exercises) ? currentWorkout.exercises : [];
    const total = exercises.reduce((sum, exercise) => sum + (Array.isArray(exercise.sets) ? exercise.sets.length : 0), 0);
    const completed = exercises.reduce((sum, exercise) => sum + (Array.isArray(exercise.sets) ? exercise.sets.filter((set) => set.completed).length : 0), 0);
    return { total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
  }, [currentWorkout]);

  if (!data) return <div className="execution-loading">Carregando treino...</div>;

  if (!currentWorkout) {
    return (
      <main className="execution-empty-page">
        <section>
          <span><Icon name="dumbbell" size={26} /></span>
          <h1>Nenhum treino em andamento</h1>
          <p>Escolha um treino para iniciar sua sessão.</p>
          <button onClick={() => navigate(isAcademyStudent ? '/student/workouts' : '/my-workouts')}>Ver treinos</button>
        </section>
      </main>
    );
  }

  const workoutExercises = Array.isArray(currentWorkout.exercises) ? currentWorkout.exercises : [];
  const exercise = workoutExercises[activeExerciseIndex];

  if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) {
    return (
      <main className="execution-empty-page">
        <section>
          <span><Icon name="dumbbell" size={26} /></span>
          <h1>Treino indisponivel para execucao</h1>
          <p>Este treino nao possui exercicios validos. Volte para a lista e escolha outro treino.</p>
          <button onClick={() => navigate(isAcademyStudent ? '/student/workouts' : '/my-workouts')}>Ver treinos</button>
        </section>
      </main>
    );
  }
  const isTimedExercise = exercise.exerciseCategory === 'Cardio' || exercise.sets.some((set) => Number(set.durationSeconds) > 0);
  const activeSetIndex = Math.max(0, exercise.sets.findIndex((set) => !set.completed));
  const currentSetIndex = exercise.sets.some((set) => !set.completed) ? activeSetIndex : Math.max(exercise.sets.length - 1, 0);
  const currentSet = exercise.sets[currentSetIndex] || { reps: 0, weight: 0, durationSeconds: 0, completed: false };
  const embedUrl = getYouTubeEmbedUrl(exercise.videoUrl);
  const exerciseComplete = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);

  const completeCurrentSet = () => {
    const isCompleting = !currentSet.completed;
    const isLastPendingSet = isCompleting && exercise.sets.every((set, index) => (
      index === currentSetIndex || set.completed
    ));

    updateSet(activeExerciseIndex, currentSetIndex, { completed: isCompleting });

    if (isLastPendingSet && activeExerciseIndex < workoutExercises.length - 1) {
      selectExercise(activeExerciseIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (isLastPendingSet) {
      const completedWorkout = {
        ...currentWorkout,
        exercises: workoutExercises.map((currentExercise, exerciseIndex) => (
          exerciseIndex !== activeExerciseIndex ? currentExercise : {
            ...currentExercise,
            sets: currentExercise.sets.map((set, setIndex) => (
              setIndex === currentSetIndex ? { ...set, completed: true } : set
            ))
          }
        ))
      };
      finishWorkout(completedWorkout);
    }
  };

  return (
    <main className="execution-page">
      <div className="execution-top-progress"><span style={{ width: `${stats.percent}%` }}></span></div>

      <header className="execution-header">
        <button type="button" onClick={leaveWorkout} aria-label="Sair do treino"><Icon name="close" size={20} /></button>
        <div>
          <strong>{currentWorkout.name}</strong>
          <span>Exercício {activeExerciseIndex + 1} de {workoutExercises.length}</span>
        </div>
        <div className="execution-timer"><Icon name="history" size={17} /><span>{formatTime(elapsedSeconds)}</span></div>
      </header>

      <div className="execution-shell">
        <nav className="execution-exercise-tabs" aria-label="Exercícios do treino">
          {workoutExercises.map((item, index) => {
            const complete = item.sets.length > 0 && item.sets.every((set) => set.completed);
            return (
              <button key={`${item.exerciseId}-${index}`} className={`${index === activeExerciseIndex ? 'active' : ''} ${complete ? 'complete' : ''}`} onClick={() => selectExercise(index)}>
                <span>{complete ? <Icon name="check" size={13} /> : index + 1}</span>
                <strong>{item.exerciseName}</strong>
              </button>
            );
          })}
        </nav>

        <section className="execution-exercise-hero">
          <div className="execution-video">
            {embedUrl ? (
              <iframe src={embedUrl} title={`Como executar ${exercise.exerciseName}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            ) : (
              <div className="execution-video-empty"><span><Icon name="dumbbell" size={27} /></span><strong>Vídeo demonstrativo</strong><p>Cadastre um link do YouTube neste exercício para exibi-lo aqui.</p></div>
            )}
          </div>
          <div className="execution-exercise-title">
            <div><span>{exerciseComplete ? 'Exercício concluído' : isTimedExercise ? 'Atividade por tempo' : `Série ${currentSetIndex + 1} de ${exercise.sets.length}`}</span><h1>{exercise.exerciseName}</h1></div>
            {exercise.videoUrl && !embedUrl && <a href={exercise.videoUrl} target="_blank" rel="noreferrer">Abrir vídeo</a>}
          </div>
        </section>

        <section className={`execution-control-grid ${isTimedExercise ? 'timed' : ''}`}>
          {isTimedExercise ? (
            <article>
              <span>Tempo (minutos)</span>
              <div><button onClick={() => updateSet(activeExerciseIndex, currentSetIndex, { durationSeconds: Math.max(60, Number(currentSet.durationSeconds) - 300) })}>−</button><strong>{Math.round(Number(currentSet.durationSeconds) / 60)}</strong><button onClick={() => updateSet(activeExerciseIndex, currentSetIndex, { durationSeconds: Number(currentSet.durationSeconds) + 300 })}>+</button></div>
            </article>
          ) : <>
            <article>
              <span>Carga (kg)</span>
              <div><button onClick={() => updateSet(activeExerciseIndex, currentSetIndex, { weight: Math.max(0, Number(currentSet.weight) - 2.5) })}>−</button><strong>{currentSet.weight}</strong><button onClick={() => updateSet(activeExerciseIndex, currentSetIndex, { weight: Number(currentSet.weight) + 2.5 })}>+</button></div>
            </article>
            <article>
              <span>Repetições</span>
              <div><button onClick={() => updateSet(activeExerciseIndex, currentSetIndex, { reps: Math.max(0, Number(currentSet.reps) - 1) })}>−</button><strong>{currentSet.reps}</strong><button onClick={() => updateSet(activeExerciseIndex, currentSetIndex, { reps: Number(currentSet.reps) + 1 })}>+</button></div>
            </article>
          </>}
        </section>

        {isTimedExercise ? (
          <section className={`execution-cardio-card ${exerciseComplete ? 'complete' : ''}`}>
            <span><Icon name={exerciseComplete ? 'check' : 'history'} size={22} /></span>
            <div><strong>{Math.round(Number(currentSet.durationSeconds) / 60)} minutos de atividade</strong><small>{exerciseComplete ? 'Cardio concluído' : 'Conclua a atividade após cumprir o tempo planejado.'}</small></div>
          </section>
        ) : <section className="execution-sets-card">
          <div className="execution-section-heading"><div><span>Progresso do exercício</span><h2>Séries</h2></div><strong>{exercise.sets.filter((set) => set.completed).length}/{exercise.sets.length}</strong></div>
          <div className="execution-set-list">
            {exercise.sets.map((set, index) => (
              <div key={index} className={`${set.completed ? 'complete' : ''} ${index === currentSetIndex && !exerciseComplete ? 'current' : ''}`}>
                <span>{index + 1}</span>
                <button className="execution-set-value" onClick={() => setActiveExerciseIndex(activeExerciseIndex)}>{set.weight}kg × {set.reps} reps</button>
                <button className="execution-set-check" onClick={() => updateSet(activeExerciseIndex, index, { completed: !set.completed })} aria-label={set.completed ? 'Reabrir série' : 'Concluir série'}><Icon name="check" size={16} /></button>
                {!isAcademyStudent && exercise.sets.length > 1 && <button className="execution-remove-set" onClick={() => removeSet(index)} aria-label="Remover série"><Icon name="close" size={15} /></button>}
              </div>
            ))}
          </div>
        </section>}

        <div className="execution-exercise-navigation">
          <button disabled={activeExerciseIndex === 0} onClick={() => setActiveExerciseIndex((index) => index - 1)}><Icon name="chevronLeft" size={17} /> Anterior</button>
          <button disabled={activeExerciseIndex === workoutExercises.length - 1} onClick={() => setActiveExerciseIndex((index) => index + 1)}>Próximo <Icon name="chevronRight" size={17} /></button>
        </div>
      </div>

      <footer className="execution-actions">
        {!isTimedExercise && <button className="execution-extra-set" onClick={addSet}>+ Série extra</button>}
        <button className={`execution-complete-set ${isTimedExercise ? 'timed' : ''}`} onClick={completeCurrentSet}><Icon name="check" size={20} /> {currentSet.completed ? (isTimedExercise ? 'Reabrir cardio' : 'Reabrir série') : (isTimedExercise ? 'Concluir cardio' : 'Concluir série')}</button>
        <button className="execution-finish" onClick={() => finishWorkout()} disabled={saving}>{saving ? 'Salvando...' : 'Finalizar'}</button>
      </footer>
    </main>
  );
}
