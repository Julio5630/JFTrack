import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Icon from '../components/Icon';
import './AdminPanel.css';

export default function AdminPanel() {
  const { users, createUser, updateUser, deleteUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [editUserId, setEditUserId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setMessage('Preencha todos os campos');
      return;
    }
    const success = await createUser(name, email, password);
    if (success) {
      setMessage('Usuario criado com sucesso!');
      setName('');
      setEmail('');
      setPassword('');
    } else {
      setMessage('Erro ao criar usuario');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const startEdit = (user) => {
    setEditUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
    setEditIsAdmin(user.isAdmin);
  };

  const cancelEdit = () => {
    setEditUserId(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
    setEditIsAdmin(false);
  };

  const handleUpdateUser = async () => {
    if (!editName || !editEmail) {
      setMessage('Nome e email sao obrigatorios');
      return;
    }
    const updates = {
      name: editName,
      email: editEmail,
      isAdmin: editIsAdmin
    };
    if (editPassword) {
      updates.password = editPassword;
    }
    const success = await updateUser(editUserId, updates);
    if (success) {
      setMessage('Usuario atualizado');
      cancelEdit();
    } else {
      setMessage('Erro ao atualizar');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const confirmDelete = (userId) => {
    setShowDeleteConfirm(userId);
  };

  const handleDeleteUser = async () => {
    if (showDeleteConfirm) {
      const success = await deleteUser(showDeleteConfirm);
      if (success) {
        setMessage('Usuario removido');
      } else {
        setMessage('Nao e possivel remover o proprio usuario');
      }
      setShowDeleteConfirm(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="admin-container">
      <div className="industrial-bg"></div>
      <div className="gear admin-gear-1"></div>
      <div className="gear admin-gear-2"></div>

      <div className="admin-content">
        <div className="admin-header">
          <h1>PAINEL DE ADMINISTRACAO</h1>
          <div className="header-rivets">
            <span className="rivet"></span>
            <span className="rivet"></span>
            <span className="rivet"></span>
          </div>
        </div>

        {message && <div className="admin-message">{message}</div>}

        <div className="admin-grid">
          <div className="industrial-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon"><Icon name="userPlus" size={28} /></span>
              <h2>CRIAR NOVO USUARIO</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleCreateUser}>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="NOME"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <span className="input-highlight"></span>
                </div>
                <div className="input-group">
                  <input
                    type="email"
                    placeholder="EMAIL"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <span className="input-highlight"></span>
                </div>
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="SENHA"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span className="input-highlight"></span>
                </div>
                <button type="submit" className="industrial-btn">
                  CRIAR USUARIO
                </button>
              </form>
            </div>
          </div>

          <div className="industrial-card users-list-card">
            <div className="card-corner"></div>
            <div className="card-header">
              <span className="card-icon"><Icon name="clipboard" size={28} /></span>
              <h2>USUARIOS CADASTRADOS</h2>
            </div>
            <div className="card-body users-list">
              {users.map(user => (
                <div key={user.id} className="user-item">
                  {editUserId === user.id ? (
                    <div className="user-edit-form">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nome"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Email"
                      />
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Nova senha (opcional)"
                      />
                      <label className="admin-checkbox">
                        <input
                          type="checkbox"
                          checked={editIsAdmin}
                          onChange={(e) => setEditIsAdmin(e.target.checked)}
                        />
                        Administrador
                      </label>
                      <div className="edit-actions">
                        <button onClick={handleUpdateUser} className="industrial-btn small">SALVAR</button>
                        <button onClick={cancelEdit} className="industrial-btn small secondary">CANCELAR</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="user-info">
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                        {user.isAdmin && <span className="admin-badge">ADMIN</span>}
                      </div>
                      <div className="user-actions">
                        <button onClick={() => startEdit(user)} className="industrial-btn small" aria-label="Editar usuario"><Icon name="edit" size={17} /></button>
                        <button onClick={() => confirmDelete(user.id)} className="industrial-btn small danger" aria-label="Excluir usuario"><Icon name="trash" size={17} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {users.length === 0 && <div className="no-users">Nenhum usuario cadastrado</div>}
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>CONFIRMAR EXCLUSAO</h3>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja excluir este usuario?</p>
              <p>Esta acao nao pode ser desfeita.</p>
            </div>
            <div className="modal-actions">
              <button onClick={handleDeleteUser} className="industrial-btn danger">EXCLUIR</button>
              <button onClick={() => setShowDeleteConfirm(null)} className="industrial-btn secondary">CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
