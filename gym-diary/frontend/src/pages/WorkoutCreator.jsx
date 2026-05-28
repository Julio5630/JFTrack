// src/pages/WorkoutCreator.jsx
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './WorkoutCreator.css';

export default function WorkoutCreator() {
  const { data, refreshData } = useData();
  const [workoutName, setWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [defaultSets, setDefaultSets] = useState(3);

  if (!data) return <div className="creator-loading">Carregando...</div>;

  const availableExercises = data.exercises || [];

  const addExercise = (exerciseId) => {
    const exercise = availableExercises.find(e => e.id === exerciseId);
    if (exercise && !selectedExercises.find(e => e.id === exerciseId)) {
      setSelectedExercises([...selectedExercises, { ...exercise, defaultSets }]);
    }
    setSelectedExerciseId(null);
  };

  const removeExercise = (index) => {
    const newSelected = [...selectedExercises];
    newSelected.splice(index, 1);
    setSelectedExercises(newSelected);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newSelected = [...selectedExercises];
    [newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]];
    setSelectedExercises(newSelected);
  };

  const moveDown = (index) => {
    if (index === selectedExercises.length - 1) return;
    const newSelected = [...selectedExercises];
    [newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]];
    setSelectedExercises(newSelected);
  };

  const updateDefaultSets = (index, sets) => {
    const newSelected = [...selectedExercises];
    newSelected[index].defaultSets = sets;
    setSelectedExercises(newSelected);
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      alert('Digite um nome para o treino');
      return;
    }
    if (selectedExercises.length === 0) {
      alert('Adicione pelo menos um exercício');
      return;
    }

    const newTemplate = {
      name: workoutName.trim(),
      exercises: selectedExercises.map(ex => ({
        id: ex.id,
        defaultSets: ex.defaultSets
      }))
    };

    await api.createTemplate(newTemplate.name, newTemplate.exercises);
    await refreshData();

    // Limpar formulário
    setWorkoutName('');
    setSelectedExercises([]);
    alert('Treino criado com sucesso!');
  };

  return (
    <div className="creator-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-creator-1"></div>
      <div className="gear gear-creator-2"></div>

      <div className="creator-content">
        <div className="dashboard-header">
          <h1>CRIAR NOVO TREINO</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">MONTE SUA ROTINA PERSONALIZADA</p>
        </div>

        <div className="creator-card">
          <div className="card-corner"></div>

          <div className="creator-form">
            <div className="form-group">
              <label>NOME DO TREINO</label>
              <input
                type="text"
                placeholder="Ex: Treino A - Peito e Tríceps"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>SÉRIES PADRÃO</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={defaultSets}
                  onChange={(e) => setDefaultSets(parseInt(e.target.value) || 1)}
                />
                <small>Número de séries ao adicionar exercício</small>
              </div>
            </div>

            <div className="exercises-panel">
              <div className="panel available">
                <h3>EXERCÍCIOS DISPONÍVEIS</h3>
                <div className="panel-list">
                  {availableExercises.map(ex => (
                    <div key={ex.id} className="list-item">
                      <span>{ex.name}</span>
                      <button
                        className="add-btn"
                        onClick={() => addExercise(ex.id)}
                        disabled={selectedExercises.some(e => e.id === ex.id)}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel selected">
                <h3>EXERCÍCIOS SELECIONADOS</h3>
                {selectedExercises.length === 0 ? (
                  <div className="empty-message">Nenhum exercício adicionado</div>
                ) : (
                  <div className="panel-list">
                    {selectedExercises.map((ex, idx) => (
                      <div key={ex.id} className="list-item selected">
                        <div className="item-info">
                          <span>{ex.name}</span>
                          <div className="sets-control">
                            <label>Séries:</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={ex.defaultSets}
                              onChange={(e) => updateDefaultSets(idx, parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                        <div className="item-actions">
                          <button className="move-up" onClick={() => moveUp(idx)} disabled={idx === 0} aria-label="Mover para cima"><Icon name="chevronUp" size={16} /></button>
                          <button className="move-down" onClick={() => moveDown(idx)} disabled={idx === selectedExercises.length - 1} aria-label="Mover para baixo"><Icon name="chevronDown" size={16} /></button>
                          <button className="remove-btn" onClick={() => removeExercise(idx)} aria-label="Remover exercicio"><Icon name="close" size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button className="industrial-btn" onClick={saveWorkout}>
                SALVAR TREINO
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
