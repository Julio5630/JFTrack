import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../components/Icon';
import './AlertContext.css';

const AlertContext = createContext(null);

const inferType = (message = '') => {
  const value = String(message).toLowerCase();
  if (/sucesso|salvo|salva|criado|criada|atualizado|atualizada|conclu[ií]d|atribu[ií]d|vinculad|removido/.test(value)) return 'success';
  if (/erro|n[aã]o foi|n[aã]o e poss[ií]vel|inv[aá]lid|obrigat|preencha|informe|selecione|encontrado|coincidem/.test(value)) return 'error';
  if (/aten[cç][aã]o|alerta|cuidado|pendente/.test(value)) return 'warning';
  return 'info';
};

export function AlertProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((input, options = {}) => {
    if (!input) return null;
    const config = typeof input === 'string' ? { message: input, ...options } : input;
    const id = ++nextId.current;
    const toast = {
      id,
      title: config.title || '',
      message: config.message || '',
      type: config.type || inferType(config.message),
      duration: config.duration ?? 4200
    };

    setToasts((current) => [...current.slice(-3), toast]);
    if (toast.duration > 0) window.setTimeout(() => dismiss(id), toast.duration);
    return id;
  }, [dismiss]);

  const confirm = useCallback((options) => new Promise((resolve) => {
    const config = typeof options === 'string' ? { message: options } : options;
    setDialog({
      title: config.title || 'Confirmar ação',
      message: config.message || '',
      confirmLabel: config.confirmLabel || 'Confirmar',
      cancelLabel: config.cancelLabel || 'Cancelar',
      tone: config.tone || 'danger',
      resolve
    });
  }), []);

  const closeDialog = useCallback((accepted) => {
    setDialog((current) => {
      current?.resolve(accepted);
      return null;
    });
  }, []);

  return (
    <AlertContext.Provider value={{ notify, confirm, dismiss }}>
      {children}
      {createPortal(
        <>
          <div className="app-toast-region" aria-live="polite" aria-atomic="false">
            {toasts.map((toast) => (
              <article key={toast.id} className={`app-toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
                <span className="app-toast-icon"><Icon name={toast.type === 'success' ? 'check' : toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'bolt'} size={18} /></span>
                <div>
                  {toast.title && <strong>{toast.title}</strong>}
                  <p>{toast.message}</p>
                </div>
                <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar aviso"><Icon name="close" size={16} /></button>
                {toast.duration > 0 && <i style={{ animationDuration: `${toast.duration}ms` }} aria-hidden="true"></i>}
              </article>
            ))}
          </div>

          {dialog && (
            <div className="app-confirm-overlay" role="presentation" onMouseDown={() => closeDialog(false)}>
              <section className={`app-confirm-card ${dialog.tone}`} role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
                <span className="app-confirm-icon"><Icon name={dialog.tone === 'danger' ? 'alert' : 'check'} size={23} /></span>
                <div className="app-confirm-copy">
                  <h2 id="app-confirm-title">{dialog.title}</h2>
                  <p>{dialog.message}</p>
                </div>
                <div className="app-confirm-actions">
                  <button type="button" className="secondary" onClick={() => closeDialog(false)}>{dialog.cancelLabel}</button>
                  <button type="button" className="primary" onClick={() => closeDialog(true)}>{dialog.confirmLabel}</button>
                </div>
              </section>
            </div>
          )}
        </>,
        document.body
      )}
    </AlertContext.Provider>
  );
}

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert deve ser usado dentro de AlertProvider');
  return context;
};
