import Icon from './Icon';
import './AppLoader.css';

export default function AppLoader({
  label = 'Inicializando backend',
  detail = 'O backend está sendo inicializado e isso pode levar algum tempo. Aguarde enquanto organizamos sua experiência.'
}) {
  return (
    <main className="app-loader-screen" aria-label="Carregando aplicativo">
      <div className="app-loader-glow app-loader-glow-a"></div>
      <div className="app-loader-glow app-loader-glow-b"></div>

      <section className="app-loader-panel" role="status" aria-live="polite">
        <div className="app-loader-brand">
          <span className="app-loader-brand-icon">
            <Icon name="gymLogo" size={24} />
          </span>
          <div>
            <strong>JFTrack</strong>
            <span>Sistema de treino e acompanhamento</span>
          </div>
        </div>

        <div className="app-loader-visual" aria-hidden="true">
          <div className="app-loader-visual-ring app-loader-visual-ring-outer"></div>
          <div className="app-loader-visual-ring app-loader-visual-ring-middle"></div>
          <div className="app-loader-visual-core">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div className="app-loader-copy">
          <span className="app-loader-kicker">Preparando o ambiente</span>
          <h1>{label}</h1>
          <p>{detail}</p>
        </div>

        <div className="app-loader-progress" aria-hidden="true">
          <div className="app-loader-progress-bar"></div>
        </div>

        <div className="app-loader-status-row">
          <span className="app-loader-status-pill is-live">Conectando serviços</span>
          <span className="app-loader-status-pill">Pode levar alguns instantes</span>
        </div>
      </section>
    </main>
  );
}
