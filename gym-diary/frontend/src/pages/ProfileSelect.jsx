import { useEffect, useMemo, useState } from 'react';
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

const PROFILE_STYLES = {
  student: {
    badge: 'profile-badge student-badge',
    title: 'Aluno',
    subtitle: 'Gerencie seus treinos e metas',
    description: 'Acesse sua planilha personalizada, acompanhe cargas e visualize sua evolucao biometrica com precisao clinica.'
  },
  personal: {
    badge: 'profile-badge personal-badge',
    title: 'Personal Trainer',
    subtitle: 'Gestao de alunos e prescricao',
    description: 'Dashboard profissional para ajustar series em tempo real, monitorar frequencia e analisar KPIs de desempenho.'
  },
  gym: {
    badge: 'profile-badge gym-badge',
    title: 'Academia',
    subtitle: 'Operacao e acompanhamento da unidade',
    description: 'Controle membros, personais, treinos, avaliacoes e relatorios da academia.'
  },
  admin: {
    badge: 'profile-badge admin-badge',
    title: 'Admin',
    subtitle: 'Ferramentas internas de controle',
    description: 'Acesse os recursos internos da plataforma e os controles administrativos.'
  }
};

export default function ProfileSelect() {
  const {
    user,
    activeProfile,
    needsProfileSelection,
    studentContext,
    selectProfile,
    selectStudentTrainingMode,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [personalGyms, setPersonalGyms] = useState([]);
  const [loadingPersonalGyms, setLoadingPersonalGyms] = useState(false);
  const [profileStudentContext, setProfileStudentContext] = useState({ memberships: [] });
  const [loadingStudentContext, setLoadingStudentContext] = useState(false);
  const isPersonalGymSelection = activeProfile === 'personal'
    && new URLSearchParams(location.search).get('personalGym') === '1';

  useEffect(() => {
    const hasPersonalProfile = user?.profiles?.some((profile) => profile.type === 'personal');
    if (!hasPersonalProfile) return;

    let mounted = true;
    setLoadingPersonalGyms(true);
    api.getPersonalGyms('personal')
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
  }, [user]);

  useEffect(() => {
    const hasStudentProfile = user?.profiles?.some((profile) => profile.type === 'student');
    if (!hasStudentProfile) return;

    if (activeProfile === 'student' && studentContext.memberships) {
      setProfileStudentContext(studentContext);
      return;
    }

    let mounted = true;
    setLoadingStudentContext(true);
    api.getStudentContext('student')
      .then((response) => {
        if (mounted) setProfileStudentContext({ memberships: response.memberships || [] });
      })
      .catch(() => {
        if (mounted) setProfileStudentContext({ memberships: [] });
      })
      .finally(() => {
        if (mounted) setLoadingStudentContext(false);
      });

    return () => {
      mounted = false;
    };
  }, [user, activeProfile, studentContext]);

  const visibleProfiles = useMemo(() => (
    user?.profiles?.filter((profile) => (
      !(user.profiles.some((item) => item.type === 'gym') && profile.type === 'student')
    )) || []
  ), [user]);

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
    if (selectProfile('student') && selectStudentTrainingMode(mode, gymId)) {
      navigate('/dashboard');
    }
  };

  const handlePersonalGymSelect = (gymId) => {
    selectProfile('personal');
    localStorage.setItem('selectedPersonalGymId', String(gymId));
    localStorage.removeItem('personalGymSelectionRequested');
    window.dispatchEvent(new Event('personalGymSelectionChanged'));
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderPersonalGymSelection = () => (
    <>
      <section className="profile-select-hero">
        <span className="eyebrow">Contexto profissional</span>
        <h1>Qual academia voce quer gerenciar agora?</h1>
        <p>Os alunos, treinos, avaliacoes e indicadores serao filtrados pela academia escolhida.</p>
      </section>

      <section className="profile-panel single-panel">
        <article className="profile-option-card personal-card-surface">
          <div className="profile-option-head">
            <div className="profile-badge personal-badge">
              <Icon name="clipboard" size={28} />
            </div>
            <div>
              <h2>Personal Trainer</h2>
              <p>Selecione a academia de trabalho</p>
            </div>
          </div>

          <p className="profile-option-description">
            Escolha a unidade certa para abrir seu workspace com os alunos e operacoes correspondentes.
          </p>

          {loadingPersonalGyms ? (
            <div className="profile-loading-card">Carregando academias do personal...</div>
          ) : (
            <div className="profile-subactions">
              {personalGyms.map((gym) => (
                <button
                  key={gym.id}
                  className="profile-subaction-button personal-subaction"
                  onClick={() => handlePersonalGymSelect(gym.id)}
                >
                  <div>
                    <strong>{gym.name}</strong>
                    <span>Gerenciar alunos, treinos e avaliacoes desta academia.</span>
                  </div>
                  <Icon name="chevronRight" size={18} />
                </button>
              ))}
            </div>
          )}
        </article>
      </section>

      <div className="profile-page-actions">
        <button className="profile-ghost-button" onClick={() => navigate('/dashboard')}>
          Voltar ao painel
        </button>
      </div>
    </>
  );

  const renderProfileGrid = () => (
    <>
      <section className="profile-select-hero">
        <h1>Ola, {user?.name?.split(' ')[0] || 'Usuario'}!</h1>
        <p>Bem-vindo de volta ao JFTrack. Escolha como deseja treinar hoje para sincronizarmos sua performance.</p>
      </section>

      <section className="profile-panel profile-grid">
        {visibleProfiles.map((profile) => {
          const style = PROFILE_STYLES[profile.type] || PROFILE_STYLES.student;
          const isStudent = profile.type === 'student';
          const isPersonal = profile.type === 'personal';
          return (
            <article key={profile.type} className="profile-option-card">
              <div className="profile-option-head">
                <div className={style.badge}>
                  <Icon name={PROFILE_ICONS[profile.type] || 'userPlus'} size={28} />
                </div>
                <div>
                  <h2>{style.title || profile.label}</h2>
                  <p>{style.subtitle}</p>
                </div>
              </div>

              <p className="profile-option-description">{style.description}</p>

              <div className="profile-subactions">
                {isStudent && (loadingStudentContext ? (
                  <div className="profile-loading-card">Carregando vinculos do aluno...</div>
                ) : (
                  <>
                    <button className="profile-subaction-button" onClick={() => handleStudentModeSelect('own')}>
                      <div className="profile-action-label">
                        <Icon name="dumbbell" size={18} />
                        <strong>Treino proprio</strong>
                      </div>
                      <Icon name="chevronRight" size={18} />
                    </button>
                    {profileStudentContext.memberships.map((membership) => (
                      <button
                        key={membership.id}
                        className="profile-subaction-button gym-subaction"
                        onClick={() => handleStudentModeSelect('academy', membership.gymId)}
                      >
                        <div className="profile-action-label">
                          <Icon name="gymLogo" size={18} />
                          <strong>{membership.gym?.name || 'Academia'}</strong>
                        </div>
                        <Icon name="chevronRight" size={18} />
                      </button>
                    ))}
                  </>
                ))}

                {isPersonal && (loadingPersonalGyms ? (
                  <div className="profile-loading-card">Carregando academias...</div>
                ) : personalGyms.length > 0 ? personalGyms.map((gym) => (
                  <button
                    key={gym.id}
                    className="profile-subaction-button personal-subaction"
                    onClick={() => handlePersonalGymSelect(gym.id)}
                  >
                    <div className="profile-action-label">
                      <Icon name="gymLogo" size={18} />
                      <strong>{gym.name}</strong>
                    </div>
                    <Icon name="chevronRight" size={18} />
                  </button>
                )) : (
                  <button className="profile-subaction-button" onClick={() => handleSelect('personal')}>
                    <div className="profile-action-label">
                      <Icon name="clipboard" size={18} />
                      <strong>Entrar como Personal</strong>
                    </div>
                    <Icon name="chevronRight" size={18} />
                  </button>
                ))}

                {!isStudent && !isPersonal && (
                  <button className="profile-subaction-button" onClick={() => handleSelect(profile.type)}>
                    <div className="profile-action-label">
                      <Icon name={PROFILE_ICONS[profile.type] || 'userPlus'} size={18} />
                      <strong>{profile.label}</strong>
                    </div>
                    <Icon name="chevronRight" size={18} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

    </>
  );

  return (
    <div className="profile-select-container">
      <div className="profile-select-shell">
        {isPersonalGymSelection
          ? renderPersonalGymSelection()
          : renderProfileGrid()}

        <footer className="profile-select-footer">
          <button className="footer-link-button" type="button">
            <Icon name="alert" size={16} /> Central de suporte
          </button>

          <div className="footer-actions">
            <button className="footer-link-button danger" type="button" onClick={handleLogout}>
              Sair da conta
            </button>
            <div className="footer-version">
              <span className="footer-settings-icon">
                <Icon name="settings" size={15} />
              </span>
              <span>JFTrack</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
