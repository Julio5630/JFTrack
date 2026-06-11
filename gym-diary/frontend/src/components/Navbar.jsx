import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from './Icon';
import './Navbar.css';

export default function Navbar() {
  const {
    user,
    activeProfile,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  const navByProfile = {
    personal: [
      { path: '/dashboard', label: 'Inicio', icon: 'home' },
      { path: '/personal/alunos', label: 'Alunos', icon: 'userPlus' },
      { path: '/personal/treinos', label: 'Treinos', icon: 'dumbbell' },
      { path: '/personal/avaliacoes', label: 'Avaliacoes', icon: 'clipboard' },
      { path: '/profile', label: 'Perfil', icon: 'person' }
    ],
    gym: [
      { path: '/dashboard', label: 'Inicio', icon: 'home' },
      { path: '/gym/alunos', label: 'Alunos', icon: 'userPlus' },
      { path: '/gym/personais', label: 'Personais', icon: 'clipboard' },
      { path: '/gym/treinos', label: 'Treinos', icon: 'dumbbell' },
      { path: '/gym/avaliacoes', label: 'Avaliacoes', icon: 'clipboard' },
      { path: '/gym/relatorios', label: 'Relatorios', icon: 'chart' },
      { path: '/gym/configuracoes', label: 'Configuracoes', icon: 'settings' },
      { path: '/profile', label: 'Perfil', icon: 'person' }
    ],
    admin: [
      { path: '/dashboard', label: 'Admin', icon: 'shield' },
      { path: '/profile', label: 'Perfil', icon: 'person' }
    ]
  };

  const handleChangePersonalGym = () => {
    localStorage.removeItem('selectedPersonalGymId');
    localStorage.setItem('personalGymSelectionRequested', 'true');
    window.dispatchEvent(new Event('personalGymSelectionReset'));
    setIsMenuOpen(false);
    navigate('/profile-select?personalGym=1');
  };

  const navItems = navByProfile[activeProfile] || [];
  const currentProfile = user?.profiles?.find(profile => profile.type === activeProfile)?.label;

  return (
      <nav className="industrial-navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="brand-icon"><Icon name="gymLogo" size={26} title="JFTrack" /></span>
            <span className="brand-text">JF<span>Track</span></span>
            {currentProfile && <span className="profile-pill">{currentProfile}</span>}
          </div>

          <button
            className={`hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            <div className="nav-links-inner">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="nav-icon"><Icon name={item.icon} size={19} /></span>
                  <span className="nav-label">{item.label}</span>
                  <div className="nav-link-rivet"></div>
                </NavLink>
              ))}
              {activeProfile === 'personal' && (
                <button onClick={handleChangePersonalGym} className="mode-switch-link">
                  <span className="nav-icon"><Icon name="gymLogo" size={19} /></span>
                  <span className="nav-label">Trocar academia</span>
                </button>
              )}
              <button onClick={handleLogout} className="logout-link">
                <span className="nav-icon"><Icon name="logout" size={19} /></span>
                <span className="nav-label">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
  );
}
