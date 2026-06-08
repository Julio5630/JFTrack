import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import './MyWorkouts.css';

const emptyExerciseForm = { name: '', category: 'Peito', gifUrl: '' };
const categories = ['Peito', 'Costas', 'Perna', 'Ombro', 'Biceps', 'Triceps', 'Outros'];

export default function MyWorkouts() {
  const { data, refreshData, updatePartial } = useData();
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
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!data) return <div className="my-workouts-loading">Carregando...</div>;

  const exercises = data.exercises || [];
  const templates = data.workoutTemplates || [];

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
    setSelectedExercises(current => [...current, { ...exercise, defaultSets }]);
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
        defaultSets: item.defaultSets || 3
      };
    }));
  };

  const startWorkout = (template) => {
    const workoutExercises = (template.exercises || []).map(exItem => {
      const exercise = exercises.find(item => item.id === exItem.id);
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
        sourceType: 'own',
        scopeKey: 'own:own',
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
      defaultSets: exercise.defaultSets || 3
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
    if (!window.confirm(`Excluir o treino "${template.name}"?`)) return;
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
      ? { name: exercise.name, category: exercise.category, gifUrl: exercise.gifUrl || exercise.gif_url || '' }
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
        await api.updateExercise(editingExercise.id, exerciseForm.name.trim(), exerciseForm.category, exerciseForm.gifUrl.trim());
      } else {
        await api.createExercise(exerciseForm.name.trim(), exerciseForm.category, exerciseForm.gifUrl.trim());
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
    if (!window.confirm(`Remover "${exercise.name}"? Ele sera excluido dos seus treinos.`)) return;
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
      <div className="industrial-bg"></div>
      <div className="gear gear-creator-1"></div>
      <div className="gear gear-creator-2"></div>

      <div className="my-workouts-content">
        <div className="dashboard-header">
          <h1>MEUS TREINOS</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">TREINOS E EXERCICIOS EM UM SO LUGAR</p>
        </div>

        <div className="student-tabs" role="tablist" aria-label="Meus treinos">
          <button className={activeTab === 'workouts' ? 'active' : ''} onClick={() => setActiveTab('workouts')}>
            <Icon name="dumbbell" size={18} /> Treinos
          </button>
          <button className={activeTab === 'exercises' ? 'active' : ''} onClick={() => setActiveTab('exercises')}>
            <Icon name="book" size={18} /> Exercicios
          </button>
        </div>

        {error && <div className="my-workouts-error">{error}</div>}

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
                ) : templates.map(template => (
                  <article key={template.id} className="template-management-item">
                    <div>
                      <h3>{template.name}</h3>
                      <span>{template.exercises?.length || 0} exercicios | Criador: {template.creatorName || 'Voce'}</span>
                    </div>
                    <div className="card-actions">
                      <button className="action-btn start" onClick={() => startWorkout(template)} aria-label="Iniciar treino"><Icon name="dumbbell" size={17} /></button>
                      {template.canEdit !== false && (
                        <>
                          <button className="action-btn edit" onClick={() => editWorkout(template)} aria-label="Editar treino"><Icon name="edit" size={17} /></button>
                          <button className="action-btn delete" onClick={() => deleteWorkout(template)} aria-label="Excluir treino"><Icon name="trash" size={17} /></button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {showWorkoutCreator && (
              <section className="creator-card">
                <div className="card-corner"></div>
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
                      <label>SERIES PADRAO</label>
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
                                  <label>Series:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={exercise.defaultSets}
                                    onChange={(event) => {
                                      const next = [...selectedExercises];
                                      next[index].defaultSets = parseInt(event.target.value) || 1;
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
                      {saving ? 'SALVANDO...' : editingTemplateId ? 'SALVAR ALTERACOES' : 'SALVAR TREINO'}
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
              <button className="industrial-btn" onClick={() => openExerciseModal()} disabled={saving}>+ NOVO EXERCICIO</button>
            </div>

            <div className="exercises-grid">
              {filteredExercises.length === 0 ? (
                <div className="empty-message">Nenhum exercicio encontrado.</div>
              ) : filteredExercises.map(exercise => (
                <article key={exercise.id} className="exercise-card">
                  <div className="card-corner"></div>
                  <div className="exercise-info">
                    <h3>{exercise.name}</h3>
                    <span className="category-badge">{exercise.category}</span>
                    <span className={`gif-status ${(exercise.gifUrl || exercise.gif_url) ? 'ready' : ''}`}>
                      {(exercise.gifUrl || exercise.gif_url) ? 'GIF cadastrado' : 'Espaco para GIF'}
                    </span>
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

      {exerciseModalOpen && (
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
                <label>GIF DE EXECUCAO</label>
                <input type="url" value={exerciseForm.gifUrl} onChange={(event) => setExerciseForm({ ...exerciseForm, gifUrl: event.target.value })} placeholder="Cole aqui o link do GIF do exercicio" />
                {exerciseForm.gifUrl && (
                  <div className="gif-preview">
                    <img src={exerciseForm.gifUrl} alt={`GIF de execucao de ${exerciseForm.name || 'exercicio'}`} />
                  </div>
                )}
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
      )}
    </div>
  );
}
