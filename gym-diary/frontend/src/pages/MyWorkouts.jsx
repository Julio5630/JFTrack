import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../contexts/DataContext';
import { useAlert } from '../contexts/AlertContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import './MyWorkouts.css';

const emptyExerciseForm = { name: '', category: 'Peito', videoUrl: '' };
const categories = ['Peito', 'Costas', 'Perna', 'Ombro', 'Biceps', 'Triceps', 'Outros'];

export default function MyWorkouts() {
  const { data, refreshData, updatePartial } = useData();
  const { notify, confirm } = useAlert();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('workouts');
  const [showWorkoutCreator, setShowWorkoutCreator] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [defaultSets, setDefaultSets] = useState(3);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseForm, setExerciseForm] = useState(emptyExerciseForm);
  const [filterCategory, setFilterCategory] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
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
  };

  const openWorkoutCreator = () => {
    setActiveTab('workouts');
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

  const editWorkout = (template) => {
    setActiveTab('workouts');
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
        await api.createTemplate(workoutName.trim(), payload);
      }
      await refreshData();
      resetWorkoutForm();
    } catch (err) {
      setError(err.message || 'Erro ao salvar treino');
    } finally {
      setSaving(false);
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

  const openExerciseModal = (exercise = null) => {
    setEditingExercise(exercise);
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
        await api.createExercise(exerciseForm.name.trim(), exerciseForm.category, exerciseForm.videoUrl.trim());
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

        <div className="student-tabs" role="tablist" aria-label="Meus treinos">
          <button className={activeTab === 'workouts' ? 'active' : ''} onClick={() => setActiveTab('workouts')}>
            <Icon name="dumbbell" size={18} /> Treinos
          </button>
          <button className={activeTab === 'exercises' ? 'active' : ''} onClick={() => setActiveTab('exercises')}>
            <Icon name="book" size={18} /> Exercícios
          </button>
        </div>

        {activeTab === 'workouts' && (
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

        {activeTab === 'exercises' && (
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

      {exerciseModalOpen && createPortal((
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
