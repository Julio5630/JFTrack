import './AppLoader.css';

export default function AppLoader({
  label = 'Loading...',
  detail = 'O backend está sendo inicializado. Aguarde alguns instantes.'
}) {
  return (
    <main className="app-loader-screen" aria-label="Carregando aplicativo">
      <section className="terminal-loader" role="status" aria-live="polite">
        <header className="terminal-header">
          <span className="terminal-title">JFTrack Status</span>
          <div className="terminal-controls" aria-hidden="true">
            <span className="control close"></span>
            <span className="control minimize"></span>
            <span className="control maximize"></span>
          </div>
        </header>

        <div className="terminal-body">
          <span className="terminal-text">{label}</span>
          <p className="terminal-detail">{detail}</p>
        </div>
      </section>
    </main>
  );
}
