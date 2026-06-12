import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon';
import './StudentBottomNav.css';

export default function GymBottomNav() {
  const location = useLocation();
  const items = [
    { path: '/dashboard', label: 'Início', icon: 'home' },
    { path: '/gym/alunos', label: 'Alunos', icon: 'userPlus' },
    { path: '/gym/personais', label: 'Personais', icon: 'clipboard' },
    { path: '/gym/relatorios', label: 'Relatórios', icon: 'chart' },
    { path: '/profile', label: 'Perfil', icon: 'person' }
  ];

  const activeIndex = items.findIndex((item) => item.path === location.pathname);

  return (
    <nav className="student-bottom-nav gym-bottom-nav" aria-label="Navegação da academia">
      <div className="student-bottom-nav-inner">
        <span
          className={`student-bottom-indicator ${activeIndex < 0 ? 'hidden' : ''}`}
          style={activeIndex >= 0
            ? { transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 5}px))` }
            : undefined}
          aria-hidden="true"
        />
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `student-bottom-link ${isActive ? 'active' : ''}`}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
