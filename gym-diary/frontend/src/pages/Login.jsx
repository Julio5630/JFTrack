// src/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Estilos específicos

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate(result.nextPath);
    } else {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="login-container">
      <div className="industrial-bg"></div>
      <div className="gear gear-1"></div>
      <div className="gear gear-2"></div>
      <div className="gear gear-3"></div>
      <div className="login-card">
        <div className="card-header">
          <h1>GYM<span>DIARY</span></h1>
          <div className="header-line"></div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="email"
              placeholder="EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <span className="input-highlight"></span>
          </div>
          <div className="input-group">
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="input-highlight"></span>
          </div>
          <button type="submit" className="login-btn">
            <span>ACESSAR</span>
            <div className="btn-overlay"></div>
          </button>
          {error && <div className="error-message">{error}</div>}
        </form>
        <div className="industrial-footer">
          <div className="rivet"></div>
          <div className="rivet"></div>
          <div className="rivet"></div>
        </div>
      </div>
    </div>
  );
}
