import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from './Icon';
import './Navbar.css';

export default function Navbar() {
  const { user, activeProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) setIsMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMenuOpen(false);
  };

  const navByProfile = {
    student: [
      { path: '/dashboard', label: 'Dashboard', icon: 'home' },
      { path: '/execution', label: 'Execucao', icon: 'dumbbell' },
      { path: '/create', label: 'Criar Treino', icon: 'pencil' },
      { path: '/library', label: 'Biblioteca', icon: 'book' },
      { path: '/history', label: 'Historico', icon: 'history' },
      { path: '/progress', label: 'Progresso', icon: 'chart' },
      { path: '/gym/setup', label: 'Academia', icon: 'gymLogo' }
    ],
    personal: [
      { path: '/dashboard', label: 'Inicio', icon: 'home' },
      { path: '/personal/alunos', label: 'Alunos', icon: 'userPlus' },
      { path: '/personal/treinos', label: 'Treinos', icon: 'dumbbell' },
      { path: '/personal/avaliacoes', label: 'Avaliacoes', icon: 'clipboard' }
    ],
    gym: [
      { path: '/dashboard', label: 'Inicio', icon: 'home' },
      { path: '/gym/alunos', label: 'Alunos', icon: 'userPlus' },
      { path: '/gym/personais', label: 'Personais', icon: 'clipboard' },
      { path: '/gym/relatorios', label: 'Relatorios', icon: 'chart' }
    ],
    admin: [
      { path: '/dashboard', label: 'Admin', icon: 'shield' }
    ]
  };
  const navItems = navByProfile[activeProfile] || navByProfile.student;
  const currentProfile = user?.profiles?.find(profile => profile.type === activeProfile)?.label;

  return (
    <nav className="industrial-navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="brand-icon"><Icon name="gymLogo" size={26} title="Gym Diary" /></span>
          <span className="brand-text">GYM<span>DIARY</span></span>
          {currentProfile && <span className="profile-pill">{currentProfile}</span>}
          <div className="brand-rivet"></div>
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
