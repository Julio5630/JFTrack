import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './UserProfile.css';

const PROFILE_LABELS = {
  student: 'Aluno',
  personal: 'Personal Trainer',
  gym: 'Academia',
  admin: 'Administrador'
};

const PROFILE_ICONS = {
  student: 'dumbbell',
  personal: 'clipboard',
  gym: 'gymLogo',
  admin: 'shield'
};

export default function UserProfile() {
  const {
    user,
    activeProfile,
    studentTrainingMode,
    selectedGymId,
    studentContext,
    updateCurrentUser,
    selectProfile,
    selectStudentTrainingMode,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [availableStudentMemberships, setAvailableStudentMemberships] = useState(studentContext.memberships || []);

  useEffect(() => {
    const hasStudentProfile = user?.profiles?.some((profile) => profile.type === 'student');
    if (!hasStudentProfile) {
      setAvailableStudentMemberships([]);
      return;
    }

    if (activeProfile === 'student') {
      setAvailableStudentMemberships(studentContext.memberships || []);
      return;
    }

    let mounted = true;
    api.getStudentContext('student')
      .then((response) => {
        if (mounted) setAvailableStudentMemberships(response.memberships || []);
      })
      .catch(() => {
        if (mounted) setAvailableStudentMemberships([]);
      });

    return () => {
      mounted = false;
    };
  }, [user, activeProfile, studentContext.memberships]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await updateCurrentUser(form);
      setForm((current) => ({ ...current, password: '' }));
      setMessage('Informacoes atualizadas com sucesso.');
    } catch (saveError) {
      setError(saveError.message || 'Nao foi possivel atualizar seu perfil.');
    } finally {
      setSaving(false);
    }
  };

  const enterStudentMode = (mode, gymId = null) => {
    if (selectProfile('student') && selectStudentTrainingMode(mode, gymId)) {
      navigate('/dashboard');
    }
  };

  const enterProfile = (profileType) => {
    if (!selectProfile(profileType)) return;

    if (profileType === 'personal') {
      localStorage.removeItem('selectedPersonalGymId');
      localStorage.setItem('personalGymSelectionRequested', 'true');
      navigate('/profile-select?personalGym=1');
      return;
    }

    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <main className="user-profile-page">
      <div className="user-profile-shell">
        <header className="user-profile-header">
          <span className="user-profile-avatar">
            {(user?.name || 'U').trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <p>Minha conta</p>
            <h1>{user?.name || 'Usuario'}</h1>
            <span>{user?.email}</span>
          </div>
        </header>

        <section className="user-profile-grid">
          <form className="user-profile-card" onSubmit={handleSubmit}>
            <div className="profile-card-heading">
              <span><Icon name="person" size={20} /></span>
              <div>
                <h2>Informacoes pessoais</h2>
                <p>Atualize os dados utilizados na sua conta.</p>
              </div>
            </div>

            <label className="profile-field">
              <span>Nome</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </label>

            <label className="profile-field">
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
              />
            </label>

            <label className="profile-field">
              <span>Nova senha</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Deixe em branco para manter a atual"
                minLength={6}
              />
            </label>

            {message && <p className="profile-feedback success">{message}</p>}
            {error && <p className="profile-feedback error">{error}</p>}

            <button className="profile-save-button" type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </form>

          <section className="user-profile-card">
            <div className="profile-card-heading">
              <span><Icon name="settings" size={20} /></span>
              <div>
                <h2>Alterar perfil</h2>
                <p>Escolha como deseja utilizar o JFTrack.</p>
              </div>
            </div>

            <div className="profile-switch-list">
              {user?.profiles?.map((profile) => {
                if (profile.type === 'student') {
                  return (
                    <div className="profile-switch-group" key={profile.type}>
                      <div className="profile-switch-title">
                        <Icon name="dumbbell" size={18} />
                        <strong>Aluno</strong>
                      </div>
                      <button
                        type="button"
                        className={`profile-switch-button ${activeProfile === 'student' && studentTrainingMode === 'own' ? 'active' : ''}`}
                        onClick={() => enterStudentMode('own')}
                      >
                        <span>Treino proprio</span>
                        <Icon name="chevronRight" size={17} />
                      </button>
                      {availableStudentMemberships.map((membership) => (
                        <button
                          type="button"
                          key={membership.id}
                          className={`profile-switch-button ${activeProfile === 'student' && studentTrainingMode === 'academy' && String(selectedGymId) === String(membership.gymId) ? 'active' : ''}`}
                          onClick={() => enterStudentMode('academy', membership.gymId)}
                        >
                          <span>{membership.gym?.name || 'Academia'}</span>
                          <Icon name="chevronRight" size={17} />
                        </button>
                      ))}
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    key={profile.type}
                    className={`profile-switch-button profile-level ${activeProfile === profile.type ? 'active' : ''}`}
                    onClick={() => enterProfile(profile.type)}
                  >
                    <span className="profile-switch-label">
                      <Icon name={PROFILE_ICONS[profile.type] || 'person'} size={18} />
                      {PROFILE_LABELS[profile.type] || profile.label}
                    </span>
                    <Icon name="chevronRight" size={17} />
                  </button>
                );
              })}
            </div>

            <button className="profile-logout-button" type="button" onClick={handleLogout}>
              <Icon name="logout" size={18} /> Sair da conta
            </button>
          </section>

          {activeProfile === 'student' && (
            <button
              type="button"
              className="user-profile-card profile-assessment-card"
              onClick={() => navigate('/student/assessment')}
            >
              <span className="profile-assessment-icon"><Icon name="clipboard" size={22} /></span>
              <span className="profile-assessment-copy">
                <strong>Avaliação profissional</strong>
                <span>Consulte avaliações feitas por seus profissionais, seja no treino próprio ou pela academia.</span>
              </span>
              <Icon name="chevronRight" size={19} />
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
