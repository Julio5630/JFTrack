import Icon from './Icon';
import './AppLoader.css';

export default function AppLoader({
  label = 'Preparando sua experiência',
  detail = 'Organizando treinos, histórico e perfil para deixar tudo pronto.'
}) {
  return (
    <main className="app-loader-screen" aria-label="Carregando aplicativo">
      <div className="app-loader-orb app-loader-orb-a"></div>
      <div className="app-loader-orb app-loader-orb-b"></div>

      <section className="app-loader-card">
        <div className="app-loader-badge">
          <span className="app-loader-badge-icon">
            <Icon name="dumbbell" size={18} />
          </span>
          <strong>JFTrack</strong>
        </div>

        <div className="app-loader-core" aria-hidden="true">
          <span className="app-loader-ring app-loader-ring-outer"></span>
          <span className="app-loader-ring app-loader-ring-middle"></span>
          <span className="app-loader-ring app-loader-ring-inner"></span>
          <span className="app-loader-core-icon">
            <Icon name="gymLogo" size={28} />
          </span>
        </div>

        <div className="app-loader-copy">
          <h1>{label}</h1>
          <p>{detail}</p>
        </div>

        <div className="app-loader-status" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </section>
    </main>
  );
}
