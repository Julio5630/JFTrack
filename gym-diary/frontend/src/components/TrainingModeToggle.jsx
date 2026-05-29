import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon';

export default function TrainingModeToggle() {
  const [active, setActive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (active && location.pathname !== '/execution') {
      navigate('/execution');
    }
  }, [active, navigate, location]);

  useEffect(() => {
    document.body.classList.toggle('training-mode', active);
    return () => document.body.classList.remove('training-mode');
  }, [active]);

  const toggle = () => {
    setActive((current) => !current);
  };

  return (
    <button onClick={toggle} className={`mode-toggle ${active ? 'active' : ''}`} aria-pressed={active}>
      <Icon name={active ? 'logout' : 'dumbbell'} size={18} />
      <span>{active ? 'Sair do modo' : 'Modo Treino'}</span>
    </button>
  );
}
