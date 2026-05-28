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

  const toggle = () => {
    setActive(!active);
    document.body.classList.toggle('training-mode', !active);
  };

  return (
    <button onClick={toggle} className="mode-toggle">
      <Icon name={active ? 'logout' : 'dumbbell'} size={18} />
      <span>{active ? 'Sair do Modo Treino' : 'Modo Treino'}</span>
    </button>
  );
}