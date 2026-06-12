import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import Icon from '../components/Icon';
import BodyMetricsPanel from '../components/BodyMetricsPanel';
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

const emptyGymForm = {
  name: '',
  responsible: '',
  phone: '',
  email: '',
  address: '',
  status: 'active'
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
  const { notify } = useAlert();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: ''
  });
  const [saving, setSaving] = useState(false);
  const [gymForm, setGymForm] = useState(emptyGymForm);
  const [loadingGym, setLoadingGym] = useState(false);
  const [savingGym, setSavingGym] = useState(false);
  const setMessage = (message) => message && notify({ message, type: 'success' });
  const setError = (message) => message && notify({ message, type: 'error' });
  const [availableStudentMemberships, setAvailableStudentMemberships] = useState(studentContext.memberships || []);

  useEffect(() => {
    if (activeProfile !== 'gym') return;

    let mounted = true;
    setLoadingGym(true);
    api.getMyGym()
      .then((response) => {
        if (!mounted || !response.gym) return;
        setGymForm({
          name: response.gym.name || '',
          responsible: response.gym.responsible || '',
          phone: response.gym.phone || '',
          email: response.gym.email || '',
          address: response.gym.address || '',
          status: response.gym.status || 'active'
        });
      })
      .catch((error) => {
        if (mounted) setError(error.message || 'Não foi possível carregar os dados da academia.');
      })
      .finally(() => {
        if (mounted) setLoadingGym(false);
      });

    return () => { mounted = false; };
  }, [activeProfile]);

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

  const handleGymSubmit = async (event) => {
    event.preventDefault();
    setSavingGym(true);
    try {
      await api.saveMyGym(gymForm);
      setMessage('Dados da academia atualizados com sucesso.');
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível atualizar a academia.');
    } finally {
      setSavingGym(false);
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
          <span className={`user-profile-avatar ${activeProfile === 'gym' ? 'gym-avatar' : ''}`}>
            {activeProfile === 'gym'
              ? <Icon name="gymLogo" size={31} />
              : (user?.name || 'U').trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <p>{activeProfile === 'gym' ? 'Perfil da academia' : 'Minha conta'}</p>
            <h1>{activeProfile === 'gym' ? (gymForm.name || 'Minha academia') : (user?.name || 'Usuario')}</h1>
            <span>{activeProfile === 'gym' ? (gymForm.email || user?.email) : user?.email}</span>
          </div>
        </header>

        <section className="user-profile-grid">
          {activeProfile === 'gym' && (
            <form className="user-profile-card gym-profile-card" onSubmit={handleGymSubmit}>
              <div className="profile-card-heading gym-profile-heading">
                <span><Icon name="gymLogo" size={21} /></span>
                <div>
                  <h2>Dados da academia</h2>
                  <p>Gerencie a identidade, os contatos e o status da sua academia.</p>
                </div>
                <span className={`gym-status-pill ${gymForm.status}`}>{gymForm.status === 'active' ? 'Ativa' : 'Inativa'}</span>
              </div>

              {loadingGym ? <div className="gym-profile-loading">Carregando dados da academia...</div> : (
                <div className="gym-profile-fields">
                  <label className="profile-field"><span>Nome da academia</span><input value={gymForm.name} onChange={(event) => setGymForm({ ...gymForm, name: event.target.value })} required /></label>
                  <label className="profile-field"><span>Responsável</span><input value={gymForm.responsible} onChange={(event) => setGymForm({ ...gymForm, responsible: event.target.value })} placeholder="Nome do responsável" /></label>
                  <label className="profile-field"><span>Telefone</span><input value={gymForm.phone} onChange={(event) => setGymForm({ ...gymForm, phone: event.target.value })} placeholder="(00) 00000-0000" /></label>
                  <label className="profile-field"><span>E-mail de contato</span><input type="email" value={gymForm.email} onChange={(event) => setGymForm({ ...gymForm, email: event.target.value })} placeholder="contato@academia.com" /></label>
                  <label className="profile-field gym-address-field"><span>Endereço</span><input value={gymForm.address} onChange={(event) => setGymForm({ ...gymForm, address: event.target.value })} placeholder="Rua, número, bairro e cidade" /></label>
                  <label className="profile-field"><span>Status</span><select value={gymForm.status} onChange={(event) => setGymForm({ ...gymForm, status: event.target.value })}><option value="active">Ativa</option><option value="inactive">Inativa</option></select></label>
                </div>
              )}

              <button className="profile-save-button gym-save-button" type="submit" disabled={savingGym || loadingGym}>
                <Icon name="check" size={18} /> {savingGym ? 'Salvando...' : 'Salvar dados da academia'}
              </button>
            </form>
          )}

          <form className="user-profile-card" onSubmit={handleSubmit}>
            <div className="profile-card-heading">
              <span><Icon name="person" size={20} /></span>
              <div>
                <h2>{activeProfile === 'gym' ? 'Conta administrativa' : 'Informacoes pessoais'}</h2>
                <p>{activeProfile === 'gym' ? 'Dados de acesso do proprietário da academia.' : 'Atualize os dados utilizados na sua conta.'}</p>
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
            <>
              <BodyMetricsPanel />
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
            </>
          )}
        </section>
      </div>
    </main>
  );
}
