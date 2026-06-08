// src/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [accountType, setAccountType] = useState('student');
  const [name, setName] = useState('');
  const [gymName, setGymName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = mode === 'register'
      ? await register(name, email, password, accountType, gymName)
      : await login(email, password);

    if (result.success) {
      navigate(result.nextPath);
    } else {
      setError(result.error || (mode === 'register' ? 'Erro ao criar conta' : 'Credenciais invalidas'));
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
          <p>{mode === 'register' ? 'CRIAR CONTA' : 'ACESSAR CONTA'}</p>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="account-type-switch">
                <button
                  type="button"
                  className={accountType === 'student' ? 'active' : ''}
                  onClick={() => setAccountType('student')}
                >
                  Aluno
                </button>
                <button
                  type="button"
                  className={accountType === 'gym' ? 'active' : ''}
                  onClick={() => setAccountType('gym')}
                >
                  Academia
                </button>
              </div>
              {accountType === 'gym' && (
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="NOME DA ACADEMIA"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    required
                  />
                  <span className="input-highlight"></span>
                </div>
              )}
              <div className="input-group">
                <input
                  type="text"
                  placeholder={accountType === 'gym' ? 'NOME DO RESPONSAVEL' : 'NOME'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <span className="input-highlight"></span>
              </div>
            </>
          )}
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
              placeholder="SENHA"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="input-highlight"></span>
          </div>
          <button type="submit" className="login-btn">
            <span>{mode === 'register' ? 'CADASTRAR' : 'ACESSAR'}</span>
            <div className="btn-overlay"></div>
          </button>
          {error && <div className="error-message">{error}</div>}
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode((current) => current === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Criar nova conta' : 'Ja tenho conta'}
        </button>
        <div className="industrial-footer">
          <div className="rivet"></div>
          <div className="rivet"></div>
          <div className="rivet"></div>
        </div>
      </div>
    </div>
  );
}
