import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Icon from '../components/Icon';
import './ProfileSelect.css';

const PROFILE_ICONS = {
  student: 'dumbbell',
  personal: 'clipboard',
  gym: 'gymLogo',
  admin: 'shield'
};

const PROFILE_DESCRIPTIONS = {
  student: 'Acompanhe seus treinos, historico e progresso.',
  personal: 'Gerencie alunos, treinos e avaliacoes.',
  gym: 'Administre alunos, personais e relatorios da academia.',
  admin: 'Acesse as ferramentas internas de administracao.'
};

export default function ProfileSelect() {
  const {
    user,
    activeProfile,
    needsProfileSelection,
    studentContext,
    studentContextLoading,
    selectProfile,
    selectStudentTrainingMode
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [personalGyms, setPersonalGyms] = useState([]);
  const [loadingPersonalGyms, setLoadingPersonalGyms] = useState(false);
  const isPersonalGymSelection = activeProfile === 'personal'
    && new URLSearchParams(location.search).get('personalGym') === '1';

  useEffect(() => {
    if (!isPersonalGymSelection) return;

    let mounted = true;
    setLoadingPersonalGyms(true);
    api.getPersonalGyms()
      .then((response) => {
        if (mounted) setPersonalGyms(response.gyms || []);
      })
      .catch(() => {
        if (mounted) setPersonalGyms([]);
      })
      .finally(() => {
        if (mounted) setLoadingPersonalGyms(false);
      });

    return () => {
      mounted = false;
    };
  }, [isPersonalGymSelection]);

  if (!user) return <Navigate to="/login" />;
  if (activeProfile && !needsProfileSelection && !isPersonalGymSelection) return <Navigate to="/dashboard" />;

  const handleSelect = (profileType) => {
    localStorage.setItem('gymSetupCardSeen', 'true');
    if (selectProfile(profileType) && profileType !== 'student') {
      navigate('/dashboard');
    }
  };

  const handleStudentModeSelect = (mode, gymId = null) => {
    localStorage.setItem('gymSetupCardSeen', 'true');
    if (selectStudentTrainingMode(mode, gymId)) {
      navigate('/dashboard');
    }
  };

  const handlePersonalGymSelect = (gymId) => {
    localStorage.setItem('selectedPersonalGymId', String(gymId));
    localStorage.removeItem('personalGymSelectionRequested');
    window.dispatchEvent(new Event('personalGymSelectionChanged'));
    navigate('/dashboard');
  };

  const renderStudentModeSelection = () => (
    <>
      <div className="dashboard-header">
        <h1>ESCOLHER MODO ALUNO</h1>
        <div className="header-rivets">
          <span className="rivet"></span>
          <span className="rivet"></span>
          <span className="rivet"></span>
        </div>
        <p className="user-greeting">TREINO PROPRIO OU ACADEMIA?</p>
      </div>

      {studentContextLoading ? (
        <div className="profile-loading">Carregando vinculos do aluno...</div>
      ) : (
        <div className="profile-grid">
          <button
            className="profile-card"
            onClick={() => handleStudentModeSelect('own')}
          >
            <span className="profile-icon">
              <Icon name="dumbbell" size={34} />
            </span>
            <strong>Treino proprio</strong>
            <span>Crie, edite e execute seus proprios treinos com sua biblioteca de exercicios.</span>
          </button>

          {studentContext.memberships?.map((membership) => (
            <button
              key={membership.id}
              className="profile-card academy-mode-card"
              onClick={() => handleStudentModeSelect('academy', membership.gymId)}
            >
              <span className="profile-icon">
                <Icon name="gymLogo" size={34} />
              </span>
              <strong>{membership.gym?.name || 'Academia'}</strong>
              <span>Entrar como aluno vinculado e acessar treinos e avaliacoes da academia.</span>
            </button>
          ))}
        </div>
      )}

      <button className="profile-back-button" onClick={() => selectProfile(null)}>
        Voltar para perfis
      </button>
    </>
  );

  const renderPersonalGymSelection = () => (
    <>
      <div className="dashboard-header">
        <h1>ESCOLHER ACADEMIA</h1>
        <div className="header-rivets">
          <span className="rivet"></span>
          <span className="rivet"></span>
          <span className="rivet"></span>
        </div>
        <p className="user-greeting">QUAL ACADEMIA VOCE QUER GERENCIAR?</p>
      </div>

      {loadingPersonalGyms ? (
        <div className="profile-loading">Carregando academias do personal...</div>
      ) : (
        <div className="profile-grid">
          {personalGyms.map((gym) => (
            <button
              key={gym.id}
              className="profile-card academy-mode-card"
              onClick={() => handlePersonalGymSelect(gym.id)}
            >
              <span className="profile-icon">
                <Icon name="gymLogo" size={34} />
              </span>
              <strong>{gym.name}</strong>
              <span>Gerenciar alunos, treinos e avaliacoes desta academia.</span>
            </button>
          ))}
        </div>
      )}

      <button className="profile-back-button" onClick={() => navigate('/dashboard')}>
        Voltar ao painel
      </button>
    </>
  );

  return (
    <div className="profile-select-container">
      <div className="industrial-bg"></div>
      <div className="profile-select-content">
        {isPersonalGymSelection ? renderPersonalGymSelection() : activeProfile === 'student' ? renderStudentModeSelection() : (
          <>
            <div className="dashboard-header">
              <h1>SELECIONAR PERFIL</h1>
              <div className="header-rivets">
                <span className="rivet"></span>
                <span className="rivet"></span>
                <span className="rivet"></span>
              </div>
              <p className="user-greeting">COMO DESEJA ENTRAR?</p>
            </div>

            <div className="profile-grid">
              {user.profiles
                ?.filter((profile) => !(user.profiles.some((item) => item.type === 'gym') && profile.type === 'student'))
                .map((profile) => (
                  <button
                    key={profile.type}
                    className="profile-card"
                    onClick={() => handleSelect(profile.type)}
                  >
                    <span className="profile-icon">
                      <Icon name={PROFILE_ICONS[profile.type] || 'userPlus'} size={34} />
                    </span>
                    <strong>{profile.label}</strong>
                    <span>{PROFILE_DESCRIPTIONS[profile.type]}</span>
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
