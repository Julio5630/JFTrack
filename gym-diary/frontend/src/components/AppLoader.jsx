import './AppLoader.css';

export default function AppLoader({
  label = 'Inicializando backend',
  detail = 'O backend está sendo inicializado e isso pode levar algum tempo.'
}) {
  return (
    <main className="app-loader-screen" aria-label="Carregando aplicativo">
      <section className="app-loader-minimal" role="status" aria-live="polite">
        <span className="app-loader-spinner" aria-hidden="true"></span>
        <h1>{label}</h1>
        <p>{detail}</p>
      </section>
    </main>
  );
}
