import { createPortal } from 'react-dom';
import Icon from './Icon';
import './ExerciseCreationModal.css';

export default function ExerciseCreationModal({
  open,
  form,
  categories,
  saving,
  editing = false,
  onChange,
  onClose,
  onSave
}) {
  if (!open) return null;

  return createPortal(
    <div className="exercise-creation-overlay" onClick={onClose}>
      <section className="exercise-creation-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{editing ? 'Ajustar movimento' : 'Novo movimento'}</span>
            <h2>{editing ? 'Editar exercício' : 'Criar exercício'}</h2>
            <p>{editing ? 'Atualize os dados deste exercício.' : 'Cadastre um exercício que ainda não está na biblioteca.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><Icon name="close" size={18} /></button>
        </header>

        <div className="exercise-creation-body">
          <label>
            <span>Nome do exercício</span>
            <input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} placeholder="Ex.: Supino reto com pausa" autoFocus />
          </label>
          <label>
            <span>Categoria</span>
            <select value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Vídeo do YouTube <small>opcional</small></span>
            <input type="url" value={form.videoUrl} onChange={(event) => onChange({ ...form, videoUrl: event.target.value })} placeholder="https://youtube.com/..." />
          </label>
        </div>

        <footer>
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary" onClick={onSave} disabled={saving || !form.name.trim()}>
            <Icon name="check" size={17} /> {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar e adicionar'}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}
