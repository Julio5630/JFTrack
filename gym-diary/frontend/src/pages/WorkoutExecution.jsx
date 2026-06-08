// src/pages/WorkoutExecution.jsx
import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './WorkoutExecution.css';

export default function WorkoutExecution() {
  const { data, updatePartial, refreshData } = useData();
  const { isAcademyStudent } = useAuth();
  const navigate = useNavigate();
  const [currentWorkout, setCurrentWorkout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data) return;

    if (data.currentWorkout) {
      setCurrentWorkout(data.currentWorkout);
      setLoading(false);
      return;
    }

    setCurrentWorkout(null);
    setLoading(false);
  }, [data, updatePartial]);

  const createWorkoutFromTemplate = (template) => {
    const workoutExercises = template.exercises.map(exItem => {
      const exercise = data.exercises?.find(e => e.id === exItem.id);
      const defaultSets = exItem.defaultSets || 3;
      const suggestedReps = parseInt(String(exItem.defaultReps || '').match(/\d+/)?.[0], 10) || 8;
      const sets = Array(defaultSets).fill().map(() => ({ reps: suggestedReps, weight: 0, completed: false }));
        return {
          exerciseId: exItem.id,
          exerciseName: exercise ? exercise.name : 'Exercício',
          gifUrl: exercise?.gifUrl || exercise?.gif_url || '',
          sets,
        };
      });
      const newWorkout = {
        id: Date.now(),
        templateId: template.id,
        name: template.name,
        exercises: workoutExercises,
      };
      setCurrentWorkout(newWorkout);
      updatePartial({ currentWorkout: newWorkout });
  };

  const updateWorkout = (updatedWorkout) => {
    setCurrentWorkout(updatedWorkout);
    updatePartial({ currentWorkout: updatedWorkout });
  };

  const addSet = (exIndex) => {
    const newWorkout = { ...currentWorkout };
    newWorkout.exercises[exIndex].sets.push({ reps: 8, weight: 0, completed: false });
    updateWorkout(newWorkout);
  };

  const removeSet = (exIndex, setIndex) => {
    const newWorkout = { ...currentWorkout };
    newWorkout.exercises[exIndex].sets.splice(setIndex, 1);
    updateWorkout(newWorkout);
  };

  const incrementReps = (exIndex, setIndex) => {
    const newWorkout = { ...currentWorkout };
    newWorkout.exercises[exIndex].sets[setIndex].reps += 1;
    updateWorkout(newWorkout);
  };

  const decrementReps = (exIndex, setIndex) => {
    const newWorkout = { ...currentWorkout };
    const current = newWorkout.exercises[exIndex].sets[setIndex].reps;
    if (current > 0) {
      newWorkout.exercises[exIndex].sets[setIndex].reps -= 1;
      updateWorkout(newWorkout);
    }
  };

  const incrementWeight = (exIndex, setIndex) => {
    const newWorkout = { ...currentWorkout };
    newWorkout.exercises[exIndex].sets[setIndex].weight += 2.5;
    updateWorkout(newWorkout);
  };

  const decrementWeight = (exIndex, setIndex) => {
    const newWorkout = { ...currentWorkout };
    const current = newWorkout.exercises[exIndex].sets[setIndex].weight;
    if (current > 0) {
      newWorkout.exercises[exIndex].sets[setIndex].weight -= 2.5;
      updateWorkout(newWorkout);
    }
  };

  const toggleComplete = (exIndex, setIndex) => {
    const newWorkout = { ...currentWorkout };
    newWorkout.exercises[exIndex].sets[setIndex].completed = !newWorkout.exercises[exIndex].sets[setIndex].completed;
    updateWorkout(newWorkout);
  };

  const finishWorkout = async () => {
    if (!currentWorkout) return;
    const historyEntry = {
      name: currentWorkout.name,
      template_id: currentWorkout.templateId || null,
      assignment_id: currentWorkout.assignmentId || null,
      gym_id: currentWorkout.gymId || null,
      source_type: currentWorkout.sourceType || (isAcademyStudent ? 'academy' : 'own'),
      date: new Date().toISOString().slice(0, 10),
      exercises: currentWorkout.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight, completed: s.completed })),
      })),
    };
    try {
      await api.saveWorkout(historyEntry);
      updatePartial({ currentWorkout: null });
      await refreshData();
      navigate('/history');
    } catch (error) {
      alert(error.message || 'Erro ao finalizar treino');
    }
  };

  const selectTemplate = (templateId) => {
    const template = data.workoutTemplates?.find(w => w.id === templateId);
    if (template) {
      const workoutExercises = template.exercises.map(exItem => {
        const exercise = data.exercises?.find(e => e.id === exItem.id);
        const defaultSets = exItem.defaultSets || 3;
        const sets = Array(defaultSets).fill().map(() => ({ reps: 8, weight: 0, completed: false }));
        return {
          exerciseId: exItem.id,
          exerciseName: exercise ? exercise.name : 'Exercício',
          gifUrl: exercise?.gifUrl || exercise?.gif_url || '',
          sets,
        };
      });
      const newWorkout = {
        id: Date.now(),
        templateId: template.id,
        assignmentId: template.assignmentId,
        gymId: template.gymId || null,
        sourceType: isAcademyStudent ? 'academy' : 'own',
        scopeKey: isAcademyStudent ? `academy:${template.gymId || 'selected'}` : 'own:own',
        name: template.name,
        exercises: workoutExercises,
      };
      setCurrentWorkout(newWorkout);
      updatePartial({ currentWorkout: newWorkout });
    }
  };

  if (loading) {
    return <div className="execution-loading">Carregando...</div>;
  }

  if (!currentWorkout) {
    return (
      <div className="execution-container">
        <div className="industrial-bg"></div>
        <div className="gear gear-exec-1"></div>
        <div className="gear gear-exec-2"></div>
        <div className="execution-content">
          <div className="dashboard-header">
            <h1>EXECUÇÃO DE TREINO</h1>
            <div className="header-rivets">
              <span className="rivet"></span>
              <span className="rivet"></span>
              <span className="rivet"></span>
            </div>
            <p className="user-greeting">ESCOLHA UM TREINO PARA INICIAR</p>
          </div>
          <div className="selector-card">
            <div className="card-corner"></div>
            <h3>ESCOLHA UM TREINO PARA INICIAR</h3>
            <div className="template-list">
              {data.workoutTemplates?.map(template => (
                <button key={template.id} className="template-btn" onClick={() => selectTemplate(template.id)}>
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalSets = currentWorkout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const completedSets = currentWorkout.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter(set => set.completed).length,
    0
  );
  const progressPercent = totalSets ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="execution-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-exec-1"></div>
      <div className="gear gear-exec-2"></div>
      <div className="execution-content">
        <div className="dashboard-header">
          <h1>EXECUÇÃO DE TREINO</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">{currentWorkout.name}</p>
        </div>

        <div className="execution-card">
          <div className="card-corner"></div>
          <div className="workout-header">
            <div>
              <h2>{currentWorkout.name}</h2>
              <p>{completedSets} de {totalSets} series concluidas</p>
            </div>
            <button className="finish-btn" onClick={finishWorkout}>
              FINALIZAR TREINO
            </button>
          </div>

          <div className="execution-progress" aria-label={`Progresso do treino: ${progressPercent}%`}>
            <div className="execution-progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>

          <div className="exercises-list">
            {currentWorkout.exercises.map((exercise, exIdx) => (
              <div key={exIdx} className="exercise-block">
                <div className="exercise-header">
                  <div>
                    <h3>{exercise.exerciseName}</h3>
                    <span>{exercise.sets.filter(set => set.completed).length}/{exercise.sets.length} series</span>
                  </div>
                  {!isAcademyStudent && (
                    <button
                      className="remove-exercise"
                      onClick={() => {
                        const newWorkout = { ...currentWorkout };
                        newWorkout.exercises.splice(exIdx, 1);
                        updateWorkout(newWorkout);
                      }}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>
                <div className={`exercise-gif-slot ${exercise.gifUrl ? 'has-gif' : ''}`}>
                  {exercise.gifUrl ? (
                    <img src={exercise.gifUrl} alt={`GIF de execucao de ${exercise.exerciseName}`} />
                  ) : (
                    <span>Espaco para GIF de execucao</span>
                  )}
                </div>
                <div className="sets-container">
                  {exercise.sets.map((set, setIdx) => (
                    <div key={setIdx} className="set-row">
                      <span className="set-number">Serie {setIdx + 1}</span>
                      {/* Checkbox estilizado SVG */}
                      <label className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={set.completed}
                          onChange={() => toggleComplete(exIdx, setIdx)}
                        />
                        <svg viewBox="0 0 35.6 35.6">
                          <circle className="background" cx="17.8" cy="17.8" r="17.8"></circle>
                          <circle className="stroke" cx="17.8" cy="17.8" r="14.9"></circle>
                          <polyline className="check" points="11.8 18.2 15.7 22.2 23.6 14"></polyline>
                        </svg>
                      </label>

                      <div className="set-controls">
                        <div className="control-group">
                          <button className="control-btn" onClick={() => decrementReps(exIdx, setIdx)}>-</button>
                          <span className="value">{set.reps}</span>
                          <button className="control-btn" onClick={() => incrementReps(exIdx, setIdx)}>+</button>
                          <span className="label">REPS</span>
                        </div>
                        <div className="control-group">
                          <button className="control-btn" onClick={() => decrementWeight(exIdx, setIdx)}>-</button>
                          <span className="value">{set.weight} kg</span>
                          <button className="control-btn" onClick={() => incrementWeight(exIdx, setIdx)}>+</button>
                          <span className="label">PESO</span>
                        </div>
                        <button className="remove-set" onClick={() => removeSet(exIdx, setIdx)} aria-label="Remover serie"><Icon name="close" size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="add-set-btn" onClick={() => addSet(exIdx)}>
                  + Adicionar série
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
