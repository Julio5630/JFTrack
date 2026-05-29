import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { user, activeProfile, selectProfile } = useAuth();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" />;
  if (activeProfile) return <Navigate to="/dashboard" />;

  const handleSelect = (profileType) => {
    if (selectProfile(profileType)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="profile-select-container">
      <div className="industrial-bg"></div>
      <div className="profile-select-content">
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
          {user.profiles?.map((profile) => (
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
      </div>
    </div>
  );
}
