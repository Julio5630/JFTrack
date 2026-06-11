import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import Icon from '../components/Icon';
import './Login.css';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [accountType, setAccountType] = useState('student');
  const [name, setName] = useState('');
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const { notify } = useAlert();
  const setError = (message) => message && notify({ message, type: 'error' });
  const [submitting, setSubmitting] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const isRegister = mode === 'register';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (isRegister && registerStep === 1) {
      if (password.length < 6) {
        setError('A senha precisa ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
      setRegisterStep(2);
      return;
    }

    setSubmitting(true);

    try {
      const result = isRegister
        ? await register(name, email, password, accountType, gymName, phone)
        : await login(email, password);

      if (result.success) {
        navigate(result.nextPath);
      } else {
        setError(result.error || (isRegister ? 'Não foi possível criar sua conta.' : 'E-mail ou senha inválidos.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setRegisterStep(1);
    setError('');
  };

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-mark">
          <span><Icon name="dumbbell" size={24} /></span>
          <strong>JFTrack</strong>
        </div>

        <div className="auth-brand-copy">
          <span className="auth-eyebrow">Wellness & Performance</span>
          <h1>Seu treino.<br />Sua evolução.<br /><em>Um só lugar.</em></h1>
          <p>Conectamos alunos, profissionais e academias para tornar cada etapa do acompanhamento mais simples.</p>
        </div>

        <div className="auth-feature-list">
          <div><span><Icon name="chart" size={18} /></span><p><strong>Progresso visível</strong>Histórico, frequência e resultados organizados.</p></div>
          <div><span><Icon name="clipboard" size={18} /></span><p><strong>Acompanhamento real</strong>Avaliações e prescrições feitas por profissionais.</p></div>
          <div><span><Icon name="shield" size={18} /></span><p><strong>Contextos separados</strong>Treino próprio e academias sem perder seus dados.</p></div>
        </div>

        <div className="auth-brand-orbit orbit-one" aria-hidden="true"></div>
        <div className="auth-brand-orbit orbit-two" aria-hidden="true"></div>
      </section>

      <section className="auth-form-panel">
        <section className="auth-mobile-hero">
          <div className="auth-mobile-brand">
            <span><Icon name="dumbbell" size={20} /></span><strong>JFTrack</strong>
            <i>Wellness & Performance</i>
          </div>
          <div className="auth-mobile-copy">
            <h1>Seu ritmo.<br /><em>Sua evolução.</em></h1>
            <p>Treinos e acompanhamento conectados em uma experiência simples.</p>
          </div>
          <div className="auth-mobile-highlights">
            <span><Icon name="chart" size={15} /> Progresso</span>
            <span><Icon name="clipboard" size={15} /> Avaliações</span>
            <span><Icon name="shield" size={15} /> Segurança</span>
          </div>
          <b aria-hidden="true"></b>
        </section>

        <div className="auth-form-shell">
          <header className="auth-form-heading">
            <span>{isRegister ? 'Comece agora' : 'Bem-vindo de volta'}</span>
            <h2>{isRegister ? (registerStep === 1 ? 'Crie seu acesso' : 'Fale um pouco sobre você') : 'Acesse sua conta'}</h2>
            <p>{isRegister ? (registerStep === 1 ? 'Primeiro, defina o e-mail e uma senha segura.' : 'Agora precisamos dos dados básicos do seu perfil.') : 'Continue sua rotina exatamente de onde parou.'}</p>
          </header>

          <div className="auth-mode-switch" role="tablist" aria-label="Acesso ou cadastro">
            <button type="button" className={!isRegister ? 'active' : ''} onClick={() => changeMode('login')}>Entrar</button>
            <button type="button" className={isRegister ? 'active' : ''} onClick={() => changeMode('register')}>Criar conta</button>
          </div>

          {isRegister && (
            <div className="auth-register-progress" aria-label={`Etapa ${registerStep} de 2`}>
              <div className="auth-progress-copy">
                <span>Etapa {registerStep} de 2</span>
                <strong>{registerStep === 1 ? 'Dados de acesso' : 'Informações do perfil'}</strong>
              </div>
              <div className="auth-progress-track" aria-hidden="true">
                <span style={{ width: `${registerStep * 50}%` }}></span>
              </div>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && registerStep === 2 && (
              <>
                <div className="auth-account-types">
                  <button type="button" className={accountType === 'student' ? 'active' : ''} onClick={() => setAccountType('student')}>
                    <span><Icon name="dumbbell" size={19} /></span>
                    <div><strong>Aluno</strong><small>Treinos e acompanhamento</small></div>
                    <i><Icon name="check" size={13} /></i>
                  </button>
                  <button type="button" className={accountType === 'gym' ? 'active' : ''} onClick={() => setAccountType('gym')}>
                    <span><Icon name="gymLogo" size={19} /></span>
                    <div><strong>Academia</strong><small>Gestão da sua unidade</small></div>
                    <i><Icon name="check" size={13} /></i>
                  </button>
                </div>

                {accountType === 'gym' && (
                  <label className="auth-field">
                    <span>Nome da academia</span>
                    <div><Icon name="gymLogo" size={18} /><input type="text" placeholder="Ex.: Academia FitCenter" value={gymName} onChange={(event) => setGymName(event.target.value)} required /></div>
                  </label>
                )}

                <label className="auth-field">
                  <span>{accountType === 'gym' ? 'Nome do responsável' : 'Seu nome'}</span>
                  <div><Icon name="person" size={18} /><input type="text" placeholder="Como podemos chamar você?" value={name} onChange={(event) => setName(event.target.value)} required /></div>
                </label>

                <label className="auth-field">
                  <span>Número de telefone</span>
                  <div><Icon name="person" size={18} /><input type="tel" placeholder="(00) 00000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required /></div>
                </label>
              </>
            )}

            {(!isRegister || registerStep === 1) && (
              <>
                <label className="auth-field">
                  <span>E-mail</span>
                  <div><Icon name="person" size={18} /><input type="email" placeholder="voce@email.com" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></div>
                </label>

                <label className="auth-field">
                  <span>Senha</span>
                  <div className="auth-password-field">
                    <Icon name="shield" size={18} />
                    <input type={showPassword ? 'text' : 'password'} placeholder={isRegister ? 'Mínimo de 6 caracteres' : 'Digite sua senha'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 6 : undefined} required />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} /></button>
                  </div>
                </label>

                {isRegister && (
                  <label className="auth-field">
                    <span>Confirme sua senha</span>
                    <div className="auth-password-field">
                      <Icon name="shield" size={18} />
                      <input type={showPassword ? 'text' : 'password'} placeholder="Digite a senha novamente" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
                      <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}><Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} /></button>
                    </div>
                  </label>
                )}

                {!isRegister && <button type="button" className="auth-forgot-password">Esqueci minha senha</button>}
              </>
            )}

            <div className={`auth-form-actions ${isRegister && registerStep === 2 ? 'with-back' : ''}`}>
              {isRegister && registerStep === 2 && <button type="button" className="auth-back-button" onClick={() => { setRegisterStep(1); setError(''); }}>Voltar</button>}
              <button type="submit" className="auth-submit" disabled={submitting}>
                <span>{submitting ? (isRegister ? 'Criando conta...' : 'Entrando...') : (isRegister ? (registerStep === 1 ? 'Continuar' : 'Criar minha conta') : 'Entrar no JFTrack')}</span>
                {!submitting && <Icon name="chevronRight" size={18} />}
              </button>
            </div>
          </form>

          <p className="auth-terms">Ao continuar, você concorda com o uso dos seus dados para funcionamento da plataforma.</p>
        </div>
      </section>
    </main>
  );
}
