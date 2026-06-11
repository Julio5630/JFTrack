import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerOfflineSync, registerPwa } from './pwa.js'
import { syncPendingOfflineData } from './services/api.js'

registerPwa()
registerOfflineSync(syncPendingOfflineData)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
