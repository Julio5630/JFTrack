import { useEffect, useState } from 'react';
import Icon from './Icon';
import './InstallAppButton.css';

const isStandalone = () => (
  window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

const isAppleMobile = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstructionsOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt || isAppleMobile()) {
      setInstructionsOpen(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  return (
    <>
      <button type="button" className="install-app-button" onClick={install}>
        <Icon name="chevronDown" size={17} />
        <span className="install-app-tooltip">Instalar aplicativo</span>
      </button>

      {instructionsOpen && (
        <div className="install-guide-overlay" onClick={() => setInstructionsOpen(false)}>
          <section className="install-guide" onClick={(event) => event.stopPropagation()}>
            <header>
              <span className="install-guide-logo"><Icon name="gymLogo" size={25} /></span>
              <div><small>JFTrack</small><h2>Adicionar ao iPhone</h2></div>
              <button type="button" onClick={() => setInstructionsOpen(false)} aria-label="Fechar"><Icon name="close" size={18} /></button>
            </header>
            <p>O iPhone exige a confirmação pelo menu do navegador. É rápido:</p>
            <ol>
              <li><span>1</span><div><strong>Toque em Compartilhar</strong><small>Use o ícone do quadrado com uma seta para cima.</small></div></li>
              <li><span>2</span><div><strong>Adicionar à Tela de Início</strong><small>Role as opções do menu se ela não aparecer de imediato.</small></div></li>
              <li><span>3</span><div><strong>Confirme em Adicionar</strong><small>O JFTrack aparecerá junto aos seus aplicativos.</small></div></li>
            </ol>
            <button type="button" className="install-guide-done" onClick={() => setInstructionsOpen(false)}>Entendi</button>
          </section>
        </div>
      )}
    </>
  );
}
