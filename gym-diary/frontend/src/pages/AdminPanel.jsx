import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Icon from '../components/Icon';
import './AdminPanel.css';

export default function AdminPanel() {
  const { user, users, createUser, updateUser, deleteUser } = useAuth();
  const { notify, confirm } = useAlert();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editUserId, setEditUserId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const adminUsers = users.filter((item) => item.isAdmin).length;
    const standardUsers = Math.max(totalUsers - adminUsers, 0);

    return { totalUsers, adminUsers, standardUsers };
  }, [users]);

  const resetCreateForm = () => {
    setName('');
    setEmail('');
    setPassword('');
  };

  const startEdit = (selectedUser) => {
    setEditUserId(selectedUser.id);
    setEditName(selectedUser.name);
    setEditEmail(selectedUser.email);
    setEditPassword('');
    setEditIsAdmin(selectedUser.isAdmin);
  };

  const cancelEdit = () => {
    setEditUserId(null);
    setEditName('');
    setEditEmail('');
    setEditPassword('');
    setEditIsAdmin(false);
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (!name || !email || !password) {
      notify('Preencha nome, e-mail e senha.');
      return;
    }

    const success = await createUser(name, email, password);

    if (success) {
      notify('Usuário criado com sucesso.');
      resetCreateForm();
      return;
    }

    notify('Não foi possível criar o usuário.');
  };

  const handleUpdateUser = async () => {
    if (!editName || !editEmail) {
      notify('Nome e e-mail são obrigatórios.');
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
      notify('Usuário atualizado.');
      cancelEdit();
      return;
    }

    notify('Não foi possível atualizar o usuário.');
  };

  const handleDeleteUser = async (targetUserId) => {
    const confirmed = await confirm({
      title: 'Excluir usuário?',
      message: 'Essa ação remove o acesso do usuário e não pode ser desfeita.',
      confirmLabel: 'Excluir usuário'
    });

    if (!confirmed) return;

    const success = await deleteUser(targetUserId);
    notify(success ? 'Usuário removido com sucesso.' : 'Não é possível remover o próprio usuário.');
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <section className="admin-hero-card">
          <div className="admin-hero-copy">
            <span className="admin-kicker">Painel administrativo</span>
            <h1>Controle os acessos da plataforma em um só lugar.</h1>
            <p>
              Cadastre novos usuários, ajuste permissões e acompanhe rapidamente a distribuição
              entre contas administrativas e contas comuns.
            </p>
          </div>

          <div className="admin-hero-profile">
            <div className="admin-hero-avatar">
              <Icon name="shield" size={28} />
            </div>
            <div>
              <strong>{user?.name || 'Administrador'}</strong>
              <span>{user?.email || 'admin@jftrack.com'}</span>
            </div>
          </div>

          <div className="admin-hero-glow admin-hero-glow-primary"></div>
          <div className="admin-hero-glow admin-hero-glow-secondary"></div>
        </section>

        <section className="admin-stats-grid">
          <article className="admin-stat-card">
            <span className="admin-stat-icon tone-emerald">
              <Icon name="userPlus" size={18} />
            </span>
            <div>
              <strong>{stats.totalUsers}</strong>
              <span>Usuários cadastrados</span>
            </div>
          </article>

          <article className="admin-stat-card">
            <span className="admin-stat-icon tone-lime">
              <Icon name="shield" size={18} />
            </span>
            <div>
              <strong>{stats.adminUsers}</strong>
              <span>Administradores</span>
            </div>
          </article>

          <article className="admin-stat-card">
            <span className="admin-stat-icon tone-coral">
              <Icon name="person" size={18} />
            </span>
            <div>
              <strong>{stats.standardUsers}</strong>
              <span>Contas padrão</span>
            </div>
          </article>
        </section>

        <section className="admin-grid">
          <article className="admin-card admin-form-card">
            <div className="admin-card-heading">
              <span className="admin-card-icon">
                <Icon name="userPlus" size={20} />
              </span>
              <div>
                <h2>Novo usuário</h2>
                <p>Adicione acessos rapidamente para testes, operação e suporte.</p>
              </div>
            </div>

            <form className="admin-form" onSubmit={handleCreateUser}>
              <label className="admin-field">
                <span>Nome</span>
                <input
                  type="text"
                  placeholder="Ex.: João Silva"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span>E-mail</span>
                <input
                  type="email"
                  placeholder="usuario@jftrack.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="admin-field">
                <span>Senha inicial</span>
                <input
                  type="password"
                  placeholder="Digite a senha temporária"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <button type="submit" className="admin-primary-button">
                <Icon name="userPlus" size={18} />
                Criar usuário
              </button>
            </form>
          </article>

          <article className="admin-card admin-users-card">
            <div className="admin-card-heading">
              <span className="admin-card-icon">
                <Icon name="clipboard" size={20} />
              </span>
              <div>
                <h2>Usuários cadastrados</h2>
                <p>Edite dados, redefina permissões e remova acessos quando necessário.</p>
              </div>
            </div>

            <div className="admin-users-list">
              {users.map((listedUser) => (
                <div key={listedUser.id} className="admin-user-card">
                  {editUserId === listedUser.id ? (
                    <div className="admin-edit-panel">
                      <div className="admin-edit-grid">
                        <label className="admin-field">
                          <span>Nome</span>
                          <input
                            type="text"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            placeholder="Nome completo"
                          />
                        </label>

                        <label className="admin-field">
                          <span>E-mail</span>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(event) => setEditEmail(event.target.value)}
                            placeholder="usuario@jftrack.com"
                          />
                        </label>
                      </div>

                      <label className="admin-field">
                        <span>Nova senha</span>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(event) => setEditPassword(event.target.value)}
                          placeholder="Opcional"
                        />
                      </label>

                      <label className="admin-toggle">
                        <input
                          type="checkbox"
                          checked={editIsAdmin}
                          onChange={(event) => setEditIsAdmin(event.target.checked)}
                        />
                        <span>Conceder privilégio de administrador</span>
                      </label>

                      <div className="admin-edit-actions">
                        <button type="button" className="admin-primary-button small" onClick={handleUpdateUser}>
                          Salvar
                        </button>
                        <button type="button" className="admin-secondary-button small" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="admin-user-main">
                        <div className="admin-user-avatar">
                          {(listedUser.name || '?').trim().charAt(0).toUpperCase()}
                        </div>

                        <div className="admin-user-copy">
                          <div className="admin-user-title-row">
                            <strong>{listedUser.name}</strong>
                            {listedUser.isAdmin && <span className="admin-role-badge">Admin</span>}
                            {Number(listedUser.id) === Number(user?.id) && (
                              <span className="admin-self-badge">Você</span>
                            )}
                          </div>
                          <span>{listedUser.email}</span>
                        </div>
                      </div>

                      <div className="admin-user-actions">
                        <button
                          type="button"
                          className="admin-icon-button"
                          aria-label="Editar usuário"
                          onClick={() => startEdit(listedUser)}
                        >
                          <Icon name="edit" size={17} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-button danger"
                          aria-label="Excluir usuário"
                          onClick={() => handleDeleteUser(listedUser.id)}
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {users.length === 0 && (
                <div className="admin-empty-state">
                  <Icon name="clipboard" size={20} />
                  <span>Nenhum usuário cadastrado até o momento.</span>
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
