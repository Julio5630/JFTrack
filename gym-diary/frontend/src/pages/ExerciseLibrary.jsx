// src/pages/ExerciseLibrary.jsx
import { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import Icon from '../components/Icon';
import './ExerciseLibrary.css';

export default function ExerciseLibrary() {
  const { data, refreshData } = useData();
  const { notify, confirm } = useAlert();
  const [filterCategory, setFilterCategory] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: 'Peito' });
  const [loading, setLoading] = useState(false);
  const setError = (message) => message && notify(message);

  const defaultCategories = [
    'Peito',
    'Costas',
    'Perna',
    'Gluteos',
    'Panturrilha',
    'Ombro',
    'Biceps',
    'Triceps',
    'Antebraco',
    'Abdomen',
    'Corpo Inteiro',
    'Cardio',
    'Outros'
  ];
  const categories = [...new Set([
    ...defaultCategories,
    ...(data?.exercises || []).map((exercise) => exercise.category).filter(Boolean)
  ])];

  if (!data) return <div className="library-loading">Carregando...</div>;

  const filteredExercises = data.exercises?.filter(ex => {
    const matchCategory = filterCategory === 'todas' || ex.category === filterCategory;
    const matchSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  }) || [];

  const openCreateModal = () => {
    setEditingExercise(null);
    setFormData({ name: '', category: 'Peito' });
    setModalOpen(true);
  };

  const openEditModal = (exercise) => {
    setEditingExercise(exercise);
    setFormData({ name: exercise.name, category: exercise.category });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Nome do exercício é obrigatório');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingExercise) {
        // Editar exercício existente
        await api.updateExercise(editingExercise.id, formData.name.trim(), formData.category);
      } else {
        // Criar novo exercício
        await api.createExercise(formData.name.trim(), formData.category);
      }
      
      // Recarregar os dados
      await refreshData();
      setModalOpen(false);
      setFormData({ name: '', category: 'Peito' });
    } catch (err) {
      console.error('Erro ao salvar exercício:', err);
      setError(err.message || 'Erro ao salvar exercício');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (await confirm({ title: 'Remover exercício?', message: `"${name}" será excluído de todos os treinos.`, confirmLabel: 'Remover exercício' })) {
      setLoading(true);
      try {
        await api.deleteExercise(id);
        await refreshData();
      } catch (err) {
        console.error('Erro ao deletar exercício:', err);
        setError(err.message || 'Erro ao deletar exercício');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="library-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-lib-1"></div>
      <div className="gear gear-lib-2"></div>
      <div className="gear gear-lib-3"></div>

      <div className="library-content">
        <div className="dashboard-header">
          <h1>BIBLIOTECA DE EXERCÍCIOS</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
          <p className="user-greeting">GERENCIE SEUS MOVIMENTOS</p>
        </div>

        <div className="controls-bar">
          <div className="search-box">
            <input
              type="text"
              placeholder="PESQUISAR EXERCÍCIO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon"><Icon name="search" size={18} /></span>
          </div>
          <div className="filter-box">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="todas">TODAS CATEGORIAS</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
            </select>
          </div>
          <button className="industrial-btn" onClick={openCreateModal} disabled={loading}>
            {loading ? '⏳' : '+ NOVO EXERCÍCIO'}
          </button>
        </div>

        <div className="exercises-grid">
          {filteredExercises.length === 0 ? (
            <div className="empty-message">
              Nenhum exercício encontrado.
            </div>
          ) : (
            filteredExercises.map(ex => (
              <div key={ex.id} className="exercise-card">
                <div className="card-corner"></div>
                <div className="exercise-info">
                  <h3>{ex.name}</h3>
                  <span className="category-badge">{ex.category}</span>
                </div>
                <div className="card-actions">
                  <button className="action-btn edit" onClick={() => openEditModal(ex)} disabled={loading} aria-label="Editar exercicio"><Icon name="edit" size={17} /></button>
                  <button className="action-btn delete" onClick={() => handleDelete(ex.id, ex.name)} disabled={loading} aria-label="Excluir exercicio"><Icon name="trash" size={17} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal para criar/editar */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="industrial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExercise ? 'EDITAR EXERCÍCIO' : 'NOVO EXERCÍCIO'}</h2>
              <button className="close-modal" onClick={() => setModalOpen(false)} aria-label="Fechar"><Icon name="close" size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>NOME</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Supino reto"
                />
              </div>
              <div className="form-group">
                <label>CATEGORIA</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="industrial-btn small" onClick={() => setModalOpen(false)}>CANCELAR</button>
              <button className="industrial-btn small primary" onClick={handleSave} disabled={loading}>
                {loading ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
