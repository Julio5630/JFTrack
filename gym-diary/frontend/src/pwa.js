export function registerPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('[PWA] Falha ao registrar service worker:', error);
    });
  });
}

export function registerOfflineSync(sync) {
  const runSync = () => sync().catch((error) => console.error('[PWA] Falha ao sincronizar dados:', error));
  window.addEventListener('online', runSync);
  window.addEventListener('load', runSync);
}
