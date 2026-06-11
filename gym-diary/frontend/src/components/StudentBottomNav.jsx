import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Icon from './Icon';
import './StudentBottomNav.css';

export default function StudentBottomNav() {
  const { isAcademyStudent } = useAuth();
  const location = useLocation();
  const workoutsPath = isAcademyStudent ? '/student/workouts' : '/my-workouts';

  const items = [
    { path: '/dashboard', label: 'Hoje', icon: 'calendar' },
    { path: workoutsPath, label: 'Treinos', icon: 'dumbbell' },
    { path: '/history', label: 'Histórico', icon: 'history' },
    { path: '/student/assessment', label: 'Avaliação', icon: 'clipboard' },
    { path: '/profile', label: 'Perfil', icon: 'person' }
  ];

  const activeIndex = items.findIndex((item) => item.path === location.pathname);

  return (
    <nav className="student-bottom-nav" aria-label="Navegacao do aluno">
      <div className="student-bottom-nav-inner">
        <span
          className={`student-bottom-indicator ${activeIndex < 0 ? 'hidden' : ''}`}
          style={activeIndex >= 0
            ? { transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 5}px))` }
            : undefined}
          aria-hidden="true"
        ></span>
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
