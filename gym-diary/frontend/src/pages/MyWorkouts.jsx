import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Reorder, useDragControls } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import ExerciseCreationModal from '../components/ExerciseCreationModal';
import './MyWorkouts.css';

const emptyExerciseForm = { name: '', category: 'Peito', videoUrl: '' };
const categories = ['Peito', 'Costas', 'Perna', 'Gluteos', 'Panturrilha', 'Ombro', 'Biceps', 'Triceps', 'Antebraco', 'Core', 'Corpo Inteiro', 'Cardio', 'Outros'];

function StudentWorkoutOrderCard({ exercise, index, onMove, onSetsChange, onDurationChange, onRemove }) {
  const controls = useDragControls();
  const isCardio = exercise.category === 'Cardio';

  return (
    <Reorder.Item
      as="article"
      value={exercise}
      dragListener={false}
      dragControls={controls}
      className={`${isCardio ? 'cardio ' : ''}workout-sortable-card`}
      whileDrag={{ scale: 1.02, zIndex: 20, boxShadow: '0 18px 35px rgba(0,77,64,.18)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    >
      <button
        type="button"
        className="workout-drag-handle"
        onPointerDown={(event) => controls.start(event)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') onMove(index, index - 1);
          if (event.key === 'ArrowDown') onMove(index, index + 1);
        }}
        aria-label={`Arrastar ${exercise.name} para mudar a ordem`}
      >
        <i></i><i></i><i></i><i></i><i></i><i></i>
      </button>
      <span className="workout-order">{String(index + 1).padStart(2, '0')}</span>
      <div className="workout-selected-copy"><strong>{exercise.name}</strong><small>{exercise.category || 'Geral'}</small></div>
      <div className={`workout-set-control ${isCardio ? 'duration' : ''}`}>
        <button type="button" onClick={() => isCardio ? onDurationChange(exercise.id, exercise.durationMinutes - 5) : onSetsChange(exercise.id, exercise.defaultSets - 1)}>−</button>
        <span><strong>{isCardio ? exercise.durationMinutes : exercise.defaultSets}</strong><small>{isCardio ? 'minutos' : 'séries'}</small></span>
        <button type="button" onClick={() => isCardio ? onDurationChange(exercise.id, exercise.durationMinutes + 5) : onSetsChange(exercise.id, exercise.defaultSets + 1)}>+</button>
      </div>
      <button type="button" className="workout-remove-exercise" onClick={() => onRemove(exercise.id)} aria-label={`Remover ${exercise.name}`}><Icon name="trash" size={16} /></button>
    </Reorder.Item>
  );
}

export default function MyWorkouts() {
  const { data, refreshData, updatePartial } = useData();
  const { notify, confirm } = useAlert();
  const navigate = useNavigate();
  const workoutCreatorRef = useRef(null);
  const [showWorkoutCreator, setShowWorkoutCreator] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [defaultSets, setDefaultSets] = useState(3);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [addCreatedExerciseToWorkout, setAddCreatedExerciseToWorkout] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseForm, setExerciseForm] = useState(emptyExerciseForm);
  const [filterCategory, setFilterCategory] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRationale, setAiRationale] = useState('');
  const [aiPrompt, setAiPrompt] = useState({
    goal: '',
    level: '',
    daysPerWeek: '4',
    sessionMinutes: '60',
    focusAreas: '',
    restrictions: '',
    notes: ''
  });
  const setError = (message) => message && notify(message);

  useEffect(() => {
    if (!exerciseModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setExerciseModalOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [exerciseModalOpen]);

  useEffect(() => {
    if (!showWorkoutCreator) return;
    window.requestAnimationFrame(() => {
      workoutCreatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [showWorkoutCreator, editingTemplateId]);

  if (!data) return <div className="my-workouts-loading">Carregando...</div>;

  const exercises = data.exercises || [];
  const templates = data.workoutTemplates || [];
  const today = new Date().toLocaleDateString('en-CA');

  const getTemplateStatus = (template) => {
    const completedToday = (data.workoutHistory || []).some(workout => (
      workout.date === today
      && (Number(workout.template_id || workout.templateId) === Number(template.id)
        || (!(workout.template_id || workout.templateId) && workout.name === template.name))
      && (workout.source_type || workout.sourceType || 'own') === 'own'
    ));
    if (completedToday) return 'completed';
    if (data.currentWorkout?.scopeKey === 'own:own' && Number(data.currentWorkout.templateId) === Number(template.id)) return 'progress';
    return '';
  };

  const resetWorkoutForm = () => {
    setWorkoutName('');
    setSelectedExercises([]);
    setDefaultSets(3);
    setEditingTemplateId(null);
    setShowWorkoutCreator(false);
    setAiRationale('');
  };

  const openWorkoutCreator = () => {
    setShowWorkoutCreator(true);
    setEditingTemplateId(null);
    setWorkoutName('');
    setSelectedExercises([]);
    setDefaultSets(3);
  };

  const addExerciseToWorkout = (exerciseId) => {
    const exercise = exercises.find(item => item.id === exerciseId);
    if (!exercise || selectedExercises.some(item => item.id === exerciseId)) return;
    setSelectedExercises(current => [...current, exercise.category === 'Cardio'
      ? { ...exercise, defaultSets: 1, durationMinutes: 20 }
      : { ...exercise, defaultSets }]);
  };

  const toggleWorkoutExercise = (exerciseId) => {
    if (selectedExercises.some((exercise) => exercise.id === exerciseId)) {
      setSelectedExercises((current) => current.filter((exercise) => exercise.id !== exerciseId));
      return;
    }
    addExerciseToWorkout(exerciseId);
  };

  const updateExerciseSets = (exerciseId, value) => {
    const nextValue = Math.min(10, Math.max(1, Number(value) || 1));
    setSelectedExercises((current) => current.map((exercise) => (
      exercise.id === exerciseId ? { ...exercise, defaultSets: nextValue } : exercise
    )));
  };

  const updateExerciseDuration = (exerciseId, value) => {
    const nextValue = Math.min(180, Math.max(1, Number(value) || 1));
    setSelectedExercises((current) => current.map((exercise) => (
      exercise.id === exerciseId ? { ...exercise, durationMinutes: nextValue } : exercise
    )));
  };

  const moveWorkoutExercise = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= selectedExercises.length || fromIndex === toIndex) return;
    setSelectedExercises((current) => {
      const ordered = [...current];
      const [moved] = ordered.splice(fromIndex, 1);
      ordered.splice(toIndex, 0, moved);
      return ordered;
    });
  };

  const editWorkout = (template) => {
    setShowWorkoutCreator(true);
    setEditingTemplateId(template.id);
    setWorkoutName(template.name);
    setSelectedExercises((template.exercises || []).map(item => {
      const exercise = exercises.find(candidate => candidate.id === item.id);
      return {
        ...(exercise || { id: item.id, name: 'Exercicio', category: 'Outros' }),
        defaultSets: item.durationMinutes ? 1 : item.defaultSets || 3,
        durationMinutes: item.durationMinutes || null
      };
    }));
  };

  const startWorkout = (template) => {
    if (data.currentWorkout?.scopeKey === 'own:own' && Number(data.currentWorkout.templateId) === Number(template.id)) {
      navigate('/execution');
      return;
    }

    const workoutExercises = (template.exercises || []).map(exItem => {
      const exercise = exercises.find(item => item.id === exItem.id);
      const defaultSets = exItem.defaultSets || 3;
      const suggestedReps = parseInt(String(exItem.defaultReps || '').match(/\d+/)?.[0], 10) || 8;
      const isCardio = exercise?.category === 'Cardio' || Number(exItem.durationMinutes) > 0;
      return {
        exerciseId: exItem.id,
        exerciseName: exercise ? exercise.name : 'Exercicio',
        exerciseCategory: exercise?.category || '',
        videoUrl: exercise?.videoUrl || exercise?.video_url || '',
        sets: isCardio
          ? [{ reps: 0, weight: 0, durationSeconds: (Number(exItem.durationMinutes) || 20) * 60, completed: false }]
          : Array(defaultSets).fill().map(() => ({ reps: suggestedReps, weight: 0, durationSeconds: 0, completed: false })),
      };
    });

    updatePartial({
      currentWorkout: {
        id: Date.now(),
        templateId: template.id,
        sourceType: 'own',
        scopeKey: 'own:own',
        startedAt: Date.now(),
        activeExerciseIndex: 0,
        name: template.name,
        exercises: workoutExercises,
      }
    });
    navigate('/execution');
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      setError('Digite um nome para o treino');
      return;
    }

    if (selectedExercises.length === 0) {
      setError('Adicione pelo menos um exercicio');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = selectedExercises.map(exercise => ({
      id: exercise.id,
      defaultSets: exercise.category === 'Cardio' ? 1 : exercise.defaultSets || 3,
      durationMinutes: exercise.category === 'Cardio' ? exercise.durationMinutes || 20 : null
    }));

    try {
      if (editingTemplateId) {
        await api.updateTemplate(editingTemplateId, workoutName.trim(), payload);
      } else {
        const result = await api.createTemplate(workoutName.trim(), payload);
        if (result?.offlinePending) notify('Treino salvo no aparelho. Ele será sincronizado quando a internet voltar.');
      }
      await refreshData();
      resetWorkoutForm();
    } catch (err) {
      setError(err.message || 'Erro ao salvar treino');
    } finally {
      setSaving(false);
    }
  };

  const generateWorkoutWithAi = async () => {
    if (exercises.length === 0) {
      setError('Cadastre alguns exercícios antes de pedir uma sugestão com IA.');
      return;
    }

    if (!aiPrompt.goal.trim()) {
      setError('Informe o objetivo do treino para gerar a sugestão.');
      return;
    }

    setAiLoading(true);
    setAiRationale('');
    setError(null);

    try {
      const response = await api.generateWorkoutSuggestion({
        ...aiPrompt,
        availableExercises: exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category
        }))
      });

      const suggestion = response.suggestion;
      const suggestedExercises = (suggestion.exercises || [])
        .map((item) => {
          const matched = exercises.find((exercise) => Number(exercise.id) === Number(item.id));
          if (!matched) return null;

          return matched.category === 'Cardio'
            ? { ...matched, defaultSets: 1, durationMinutes: item.durationMinutes || 20 }
            : { ...matched, defaultSets: item.defaultSets || 3, durationMinutes: null };
        })
        .filter(Boolean);

      if (suggestedExercises.length === 0) {
        throw new Error('A IA não conseguiu montar um treino válido com a sua biblioteca atual.');
      }

      setWorkoutName(suggestion.name || 'Treino sugerido');
      setSelectedExercises(suggestedExercises);
      setAiRationale(suggestion.rationale || '');
      notify('Sugestão gerada com IA. Revise os exercícios antes de salvar.');
    } catch (err) {
      setError(err.message || 'Não foi possível gerar a sugestão com IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const deleteWorkout = async (template) => {
    if (!await confirm({ title: 'Excluir treino?', message: `O treino "${template.name}" será removido permanentemente.`, confirmLabel: 'Excluir treino' })) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteTemplate(template.id);
      await refreshData();
      if (editingTemplateId === template.id) resetWorkoutForm();
    } catch (err) {
      setError(err.message || 'Erro ao excluir treino');
    } finally {
      setSaving(false);
    }
  };

  const openExerciseModal = (exercise = null, addToWorkout = false) => {
    setEditingExercise(exercise);
    setAddCreatedExerciseToWorkout(Boolean(!exercise && addToWorkout));
    setExerciseForm(exercise
      ? { name: exercise.name, category: exercise.category, videoUrl: exercise.videoUrl || exercise.video_url || '' }
      : emptyExerciseForm
    );
    setExerciseModalOpen(true);
  };

  const closeExerciseModal = () => {
    setExerciseModalOpen(false);
    setEditingExercise(null);
    setExerciseForm(emptyExerciseForm);
    setAddCreatedExerciseToWorkout(false);
    setError(null);
  };

  const saveExercise = async () => {
    if (!exerciseForm.name.trim()) {
      setError('Nome do exercicio e obrigatorio');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingExercise) {
        await api.updateExercise(editingExercise.id, exerciseForm.name.trim(), exerciseForm.category, exerciseForm.videoUrl.trim());
      } else {
        const result = await api.createExercise(exerciseForm.name.trim(), exerciseForm.category, exerciseForm.videoUrl.trim());
        if (result?.offlinePending) notify('Exercício salvo no aparelho e adicionado à fila de sincronização.');
        if (addCreatedExerciseToWorkout) {
          const refreshedExercises = await api.getExercises();
          const createdExercise = refreshedExercises.find((exercise) => exercise.name === exerciseForm.name.trim());
          if (createdExercise) {
            setSelectedExercises((current) => current.some((item) => item.id === createdExercise.id)
              ? current
              : [...current, createdExercise.category === 'Cardio'
                ? { ...createdExercise, defaultSets: 1, durationMinutes: 20 }
                : { ...createdExercise, defaultSets: 3 }]
            );
          }
        }
      }
      await refreshData();
      closeExerciseModal();
    } catch (err) {
      setError(err.message || 'Erro ao salvar exercicio');
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async (exercise) => {
    if (!await confirm({ title: 'Remover exercício?', message: `"${exercise.name}" será excluído da biblioteca e removido dos seus treinos.`, confirmLabel: 'Remover exercício' })) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteExercise(exercise.id);
      await refreshData();
      setSelectedExercises(current => current.filter(item => item.id !== exercise.id));
    } catch (err) {
      setError(err.message || 'Erro ao excluir exercicio');
    } finally {
      setSaving(false);
    }
  };

  const filteredExercises = exercises.filter(exercise => {
    const categoryMatches = filterCategory === 'todas' || exercise.category === filterCategory;
    const searchMatches = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
    return categoryMatches && searchMatches;
  });

  const renderWorkoutStudio = () => (
    <div className="workout-studio student-workout-studio">
      <section className="workout-studio-hero">
        <div><span>Estúdio de treinos</span><h2>Monte sua própria rotina</h2><p>Escolha os exercícios, organize a sequência e ajuste séries ou duração.</p></div>
        <div className="workout-studio-stats">
          <article><Icon name="book" size={19} /><strong>{templates.length}</strong><small>treinos salvos</small></article>
          <article><Icon name="dumbbell" size={19} /><strong>{showWorkoutCreator ? selectedExercises.length : exercises.length}</strong><small>{showWorkoutCreator ? 'exercícios escolhidos' : 'exercícios disponíveis'}</small></article>
        </div>
      </section>

      <div className={`workout-studio-grid ${showWorkoutCreator ? '' : 'creator-closed'}`}>
        {showWorkoutCreator && <section className="workout-builder-card" ref={workoutCreatorRef}>
          <header className="workout-card-heading">
            <span className="workout-step-number">1</span>
            <div><h3>{editingTemplateId ? 'Editar treino' : 'Criar novo treino'}</h3><p>Defina um nome e monte a sequência de exercícios.</p></div>
            <button type="button" className="workout-text-button" onClick={resetWorkoutForm}>{editingTemplateId ? 'Cancelar edicao' : 'Fechar'}</button>
          </header>

          <section className="workout-ai-card">
            <div className="workout-ai-heading">
              <div>
                <span>Assistente com IA</span>
                <strong>Gerar sugestão inicial</strong>
                <small>A IA usa somente os exercícios já disponíveis na sua biblioteca.</small>
              </div>
              <button type="button" className="workout-ai-generate" onClick={generateWorkoutWithAi} disabled={aiLoading}>
                <Icon name="bolt" size={16} /> {aiLoading ? 'Gerando...' : 'Gerar com IA'}
              </button>
            </div>

            <div className="workout-ai-grid">
              <label>
                <span>Objetivo</span>
                <input value={aiPrompt.goal} onChange={(event) => setAiPrompt({ ...aiPrompt, goal: event.target.value })} placeholder="Ex.: hipertrofia ou emagrecimento" />
              </label>
              <label>
                <span>Nível</span>
                <input value={aiPrompt.level} onChange={(event) => setAiPrompt({ ...aiPrompt, level: event.target.value })} placeholder="Ex.: iniciante" />
              </label>
              <label>
                <span>Dias por semana</span>
                <input value={aiPrompt.daysPerWeek} onChange={(event) => setAiPrompt({ ...aiPrompt, daysPerWeek: event.target.value })} placeholder="4" />
              </label>
              <label>
                <span>Minutos por treino</span>
                <input value={aiPrompt.sessionMinutes} onChange={(event) => setAiPrompt({ ...aiPrompt, sessionMinutes: event.target.value })} placeholder="60" />
              </label>
              <label className="full">
                <span>Focos principais</span>
                <input value={aiPrompt.focusAreas} onChange={(event) => setAiPrompt({ ...aiPrompt, focusAreas: event.target.value })} placeholder="Ex.: peito, costas e cardio leve" />
              </label>
              <label className="full">
                <span>Restrições ou cuidados</span>
                <input value={aiPrompt.restrictions} onChange={(event) => setAiPrompt({ ...aiPrompt, restrictions: event.target.value })} placeholder="Ex.: evitar impacto ou poupar ombro" />
              </label>
              <label className="full">
                <span>Observações extras</span>
                <input value={aiPrompt.notes} onChange={(event) => setAiPrompt({ ...aiPrompt, notes: event.target.value })} placeholder="Ex.: incluir cardio no final do treino" />
              </label>
            </div>

            {aiRationale && <p className="workout-ai-rationale">{aiRationale}</p>}
          </section>

          <label className="workout-name-field"><span>Nome do treino</span><input value={workoutName} onChange={(event) => setWorkoutName(event.target.value)} placeholder="Ex.: Treino A - Peito e tríceps" /></label>

          <div className="workout-library-heading">
            <div><strong>Biblioteca de exercícios</strong><small>{filteredExercises.length} disponíveis</small></div>
            <div className="student-library-actions">
              <div className="workout-exercise-search"><Icon name="search" size={17} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar exercício" /></div>
              <button type="button" className="student-new-exercise" onClick={() => openExerciseModal(null, true)}><Icon name="plus" size={16} /> Novo exercício</button>
            </div>
          </div>

          <div className="workout-category-filter" aria-label="Categorias de exercícios">
            {['todas', ...new Set(exercises.map((exercise) => exercise.category).filter(Boolean))].map((category) => (
              <button type="button" key={category} className={filterCategory === category ? 'active' : ''} onClick={() => setFilterCategory(category)}>{category === 'todas' ? 'Todos' : category}</button>
            ))}
          </div>

          <div className="workout-exercise-grid">
            {filteredExercises.map((exercise) => {
              const selected = selectedExercises.some((item) => item.id === exercise.id);
              return <button type="button" key={exercise.id} className={selected ? 'selected' : ''} onClick={() => toggleWorkoutExercise(exercise.id)}><span><Icon name={selected ? 'check' : 'dumbbell'} size={18} /></span><div><strong>{exercise.name}</strong><small>{exercise.category || 'Geral'}</small></div><i>{selected ? 'Adicionado' : 'Adicionar'}</i></button>;
            })}
            {filteredExercises.length === 0 && <div className="workout-library-empty"><Icon name="search" size={22} /><span>Nenhum exercício encontrado.</span></div>}
          </div>

          <div className="workout-selected-section">
            <div className="workout-library-heading"><div><strong>Sequência do treino</strong><small>Segure os pontos e arraste para mudar a ordem</small></div><span className="workout-count-badge">{selectedExercises.length} {selectedExercises.length === 1 ? 'exercício' : 'exercícios'}</span></div>
            <Reorder.Group as="div" axis="y" className="workout-selected-list" values={selectedExercises} onReorder={setSelectedExercises}>
              {selectedExercises.map((exercise, index) => <StudentWorkoutOrderCard key={exercise.id} exercise={exercise} index={index} onMove={moveWorkoutExercise} onSetsChange={updateExerciseSets} onDurationChange={updateExerciseDuration} onRemove={toggleWorkoutExercise} />)}
              {selectedExercises.length === 0 && <div className="workout-selected-empty"><span><Icon name="dumbbell" size={24} /></span><strong>Seu treino começa aqui</strong><small>Adicione exercícios da biblioteca para montar a sequência.</small></div>}
            </Reorder.Group>
          </div>

          <footer className="workout-builder-actions">
            <div><strong>{selectedExercises.filter((item) => item.category !== 'Cardio').reduce((total, item) => total + (item.defaultSets || 3), 0)}</strong><span>séries</span>{selectedExercises.some((item) => item.category === 'Cardio') && <><strong>{selectedExercises.filter((item) => item.category === 'Cardio').reduce((total, item) => total + (item.durationMinutes || 20), 0)}</strong><span>min de cardio</span></>}</div>
            <button type="button" onClick={saveWorkout} disabled={saving || !workoutName.trim() || selectedExercises.length === 0}><Icon name="check" size={18} /> {saving ? 'Salvando...' : editingTemplateId ? 'Salvar alterações' : 'Salvar treino'}</button>
          </footer>
        </section>}

        <aside className={`student-saved-workouts ${showWorkoutCreator ? '' : 'expanded'}`}>
          <header className="student-saved-workouts-header">
            <div><span>Seus treinos</span><h3>Treinos salvos</h3><p>Inicie uma sessão ou edite uma rotina existente.</p></div>
            {!showWorkoutCreator && (
              <button type="button" className="student-open-workout-creator" onClick={openWorkoutCreator}>
                <span className="student-open-workout-icon"><Icon name="plus" size={18} /></span>
                <span className="student-open-workout-copy"><strong>Criar novo treino</strong><small>Monte sua rotina</small></span>
                <Icon name="chevronRight" size={17} />
              </button>
            )}
          </header>
          <div className="student-saved-workout-list">
            {templates.map((template) => {
              const status = getTemplateStatus(template);
              return <article key={template.id} className={status ? `is-${status}` : ''}><span className="saved-workout-icon"><Icon name="dumbbell" size={19} /></span><div><strong>{template.name}</strong><small>{template.exercises?.length || 0} exercícios</small>{status && <em>{status === 'completed' ? 'Concluído hoje' : 'Em andamento'}</em>}</div><div className="saved-workout-actions"><button type="button" onClick={() => startWorkout(template)} aria-label={status === 'progress' ? 'Continuar treino' : 'Iniciar treino'}><Icon name={status === 'progress' ? 'chevronRight' : 'bolt'} size={16} /></button>{template.canEdit !== false && <><button type="button" onClick={() => editWorkout(template)} aria-label="Editar treino"><Icon name="edit" size={16} /></button><button type="button" onClick={() => deleteWorkout(template)} aria-label="Excluir treino"><Icon name="trash" size={16} /></button></>}</div></article>;
            })}
            {templates.length === 0 && <div className="workout-selected-empty"><span><Icon name="dumbbell" size={22} /></span><strong>Nenhum treino salvo</strong><small>Monte seu primeiro treino ao lado.</small></div>}
          </div>
        </aside>
      </div>
    </div>
  );

  return (
    <div className="my-workouts-container">
      <div className="my-workouts-content">
        <header className="workouts-page-heading">
          <div>
            <span className="workouts-eyebrow">Sua rotina</span>
            <h1>Meus treinos</h1>
            <p>Organize seus treinos e personalize sua biblioteca de exercícios.</p>
          </div>
          <span className="workouts-heading-icon"><Icon name="dumbbell" size={25} /></span>
        </header>

        <section className="workouts-overview">
          <article><span><Icon name="dumbbell" size={19} /></span><div><strong>{templates.length}</strong><small>Treinos criados</small></div></article>
          <article><span className="coral"><Icon name="book" size={19} /></span><div><strong>{exercises.length}</strong><small>Exercícios disponíveis</small></div></article>
        </section>

        {false && <div className="student-tabs removed-exercise-tabs" role="tablist" aria-label="Meus treinos">
          <button className="active">
            <Icon name="dumbbell" size={18} /> Treinos
          </button>
          <button>
            <Icon name="book" size={18} /> Exercícios
          </button>
        </div>}

        {renderWorkoutStudio()}

        {false && (
          <div className="workouts-layout">
            <section className="template-list-card">
              <div className="section-title-row">
                <h2>Treinos criados</h2>
                <button className="create-workout-toggle" onClick={openWorkoutCreator} aria-label="Criar treino">
                  <Icon name="dumbbell" size={18} /> Criar treino
                </button>
              </div>
              <div className="template-management-list">
                {templates.length === 0 ? (
                  <div className="empty-message">Nenhum treino criado ainda.</div>
                ) : templates.map(template => {
                  const status = getTemplateStatus(template);
                  return (
                  <article key={template.id} className={`template-management-item ${status ? `is-${status}` : ''}`}>
                    <div>
                      <h3>{template.name}</h3>
                      {status && <span className={`workout-status-pill ${status}`}><Icon name={status === 'completed' ? 'check' : 'history'} size={13} /> {status === 'completed' ? 'Concluído hoje' : 'Em andamento'}</span>}
                      <span>{template.exercises?.length || 0} exercícios · Criador: {template.creatorName || 'Você'}</span>
                    </div>
                    <div className="card-actions">
                      <button className="action-btn start" onClick={() => startWorkout(template)} aria-label={status === 'progress' ? 'Continuar treino' : 'Iniciar treino'}><Icon name={status === 'progress' ? 'chevronRight' : 'dumbbell'} size={17} /></button>
                      {template.canEdit !== false && (
                        <>
                          <button className="action-btn edit" onClick={() => editWorkout(template)} aria-label="Editar treino"><Icon name="edit" size={17} /></button>
                          <button className="action-btn delete" onClick={() => deleteWorkout(template)} aria-label="Excluir treino"><Icon name="trash" size={17} /></button>
                        </>
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>
            </section>

            {showWorkoutCreator && (
              <section className="creator-card">
                <div className="section-title-row">
                  <h2>{editingTemplateId ? 'Editar treino' : 'Criar treino'}</h2>
                  <button className="text-action" onClick={resetWorkoutForm}>
                    {editingTemplateId ? 'Cancelar edicao' : 'Fechar'}
                  </button>
                </div>

                <div className="creator-form">
                  <div className="form-group">
                    <label>NOME DO TREINO</label>
                    <input value={workoutName} onChange={(event) => setWorkoutName(event.target.value)} placeholder="Ex: Treino A - Peito e Triceps" />
                  </div>

                  <div className="form-row">
                    <div className="form-group half">
                      <label>SERIES PADRAO (MUSCULACAO)</label>
                      <input type="number" min="1" max="10" value={defaultSets} onChange={(event) => setDefaultSets(parseInt(event.target.value) || 1)} />
                    </div>
                  </div>

                  <div className="exercises-panel">
                    <div className="panel">
                      <h3>EXERCICIOS DISPONIVEIS</h3>
                      <div className="panel-list">
                        {exercises.map(exercise => (
                          <div key={exercise.id} className="list-item">
                            <span>{exercise.name}</span>
                            <button className="add-btn" onClick={() => addExerciseToWorkout(exercise.id)} disabled={selectedExercises.some(item => item.id === exercise.id)}>+</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="panel">
                      <h3>EXERCICIOS DO TREINO</h3>
                      {selectedExercises.length === 0 ? (
                        <div className="empty-message">Nenhum exercicio adicionado</div>
                      ) : (
                        <div className="panel-list">
                          {selectedExercises.map((exercise, index) => (
                            <div key={exercise.id} className="list-item selected">
                              <div className="item-info">
                                <span>{exercise.name}</span>
                                <div className="sets-control">
                                  <label>{exercise.category === 'Cardio' ? 'Minutos:' : 'Series:'}</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max={exercise.category === 'Cardio' ? '180' : '10'}
                                    step={exercise.category === 'Cardio' ? '5' : '1'}
                                    value={exercise.category === 'Cardio' ? exercise.durationMinutes : exercise.defaultSets}
                                    onChange={(event) => {
                                      const next = [...selectedExercises];
                                      if (exercise.category === 'Cardio') {
                                        next[index].durationMinutes = parseInt(event.target.value) || 1;
                                      } else {
                                        next[index].defaultSets = parseInt(event.target.value) || 1;
                                      }
                                      setSelectedExercises(next);
                                    }}
                                  />
                                </div>
                              </div>
                              <button className="remove-btn" onClick={() => setSelectedExercises(current => current.filter(item => item.id !== exercise.id))} aria-label="Remover exercicio">
                                <Icon name="close" size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button className="industrial-btn" onClick={saveWorkout} disabled={saving}>
                      {saving ? 'Salvando...' : editingTemplateId ? 'Salvar alterações' : 'Salvar treino'}
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {false && (
          <>
            <div className="controls-bar">
              <div className="search-box">
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="PESQUISAR EXERCICIO..." />
                <span className="search-icon"><Icon name="search" size={18} /></span>
              </div>
              <div className="filter-box">
                <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
                  <option value="todas">TODAS CATEGORIAS</option>
                  {categories.map(category => <option key={category} value={category}>{category.toUpperCase()}</option>)}
                </select>
              </div>
              <button className="industrial-btn" onClick={() => openExerciseModal()} disabled={saving}><Icon name="book" size={17} /> Novo exercício</button>
            </div>

            <div className="exercises-grid">
              {filteredExercises.length === 0 ? (
                <div className="empty-message">Nenhum exercicio encontrado.</div>
              ) : filteredExercises.map(exercise => (
                <article key={exercise.id} className="exercise-card">
                  <div className="exercise-info">
                    <h3>{exercise.name}</h3>
                    <span className="category-badge">{exercise.category}</span>
                  </div>
                  <div className="card-actions">
                    <button className="action-btn edit" onClick={() => openExerciseModal(exercise)} aria-label="Editar exercicio"><Icon name="edit" size={17} /></button>
                    <button className="action-btn delete" onClick={() => deleteExercise(exercise)} aria-label="Excluir exercicio"><Icon name="trash" size={17} /></button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <ExerciseCreationModal open={exerciseModalOpen} form={exerciseForm} categories={categories} saving={saving} editing={Boolean(editingExercise)} onChange={setExerciseForm} onClose={closeExerciseModal} onSave={saveExercise} />

      {false && exerciseModalOpen && createPortal((
        <div className="modal-overlay" onClick={closeExerciseModal}>
          <div className="industrial-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExercise ? 'EDITAR EXERCICIO' : 'NOVO EXERCICIO'}</h2>
              <button className="close-modal" onClick={closeExerciseModal} aria-label="Fechar"><Icon name="close" size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>NOME</label>
                <input value={exerciseForm.name} onChange={(event) => setExerciseForm({ ...exerciseForm, name: event.target.value })} placeholder="Ex: Supino reto" />
              </div>
              <div className="form-group">
                <label>CATEGORIA</label>
                <select value={exerciseForm.category} onChange={(event) => setExerciseForm({ ...exerciseForm, category: event.target.value })}>
                  {categories.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>VÍDEO DO YOUTUBE</label>
                <input type="url" value={exerciseForm.videoUrl} onChange={(event) => setExerciseForm({ ...exerciseForm, videoUrl: event.target.value })} placeholder="Cole o link do vídeo ensinando o exercício" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="industrial-btn small" onClick={closeExerciseModal}>CANCELAR</button>
              <button className="industrial-btn small primary" onClick={saveExercise} disabled={saving}>
                {saving ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
